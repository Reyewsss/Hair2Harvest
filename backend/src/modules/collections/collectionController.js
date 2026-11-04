import Pickup, { PICKUP_STAGES } from "./pickupModel.js";
import WeightLog from "./weightLogModel.js";

const recurrenceStep = { weekly: 7, biweekly: 14, monthly: 30 };
const recurrenceCount = { none: 1, weekly: 4, biweekly: 3, monthly: 3 };

const addDaysToIso = (iso, days) => {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

/** Expands a recurring schedule into one date per pickup. */
function occurrences(start, recurrence) {
  const count = recurrenceCount[recurrence] ?? 1;
  const step = recurrenceStep[recurrence];
  if (!step) return [start];
  return Array.from({ length: count }, (_, index) => addDaysToIso(start, step * index));
}

/** Next zero-padded code for a collection, e.g. P-0007. */
async function nextCode(Model, prefix, pad) {
  const last = await Model.findOne({ code: new RegExp(`^${prefix}-`) })
    .sort({ code: -1 })
    .select("code");
  const next = last ? Number(last.code.split("-")[1]) + 1 : 1;
  return {
    next,
    format: (value) => `${prefix}-${String(value).padStart(pad, "0")}`,
  };
}

/* GET /api/collections/pickups?supplierCode=&stage=&from=&to= */
export async function listPickups(req, res) {
  try {
    const { supplierCode, stage, from, to } = req.query;
    const filter = {};

    if (supplierCode) filter.supplierCode = supplierCode;
    if (stage) filter.stage = stage;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }

    const pickups = await Pickup.find(filter).sort({ date: 1, time: 1 });
    res.status(200).json({ success: true, count: pickups.length, pickups });
  } catch (error) {
    console.error("Error listing pickups:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

/* POST /api/collections/pickups — creates the schedule and its repeats. */
export async function createPickup(req, res) {
  try {
    const {
      supplierCode,
      date,
      time = "10:00",
      recurrence = "none",
      estimatedWeightKg,
    } = req.body;

    if (!supplierCode || !date) {
      return res
        .status(400)
        .json({ success: false, message: "Supplier and date are required" });
    }

    const { next, format } = await nextCode(Pickup, "P", 4);
    const created = await Pickup.insertMany(
      occurrences(date, recurrence).map((day, index) => ({
        code: format(next + index),
        supplierCode,
        date: day,
        time,
        recurrence,
        estimatedWeightKg,
        createdBy: req.userId,
      })),
    );

    res.status(201).json({
      success: true,
      message: `Created ${created.length} pickup${created.length === 1 ? "" : "s"}`,
      pickups: created,
    });
  } catch (error) {
    console.error("Error creating pickup:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

/* PATCH /api/collections/pickups/:id/advance — move one stage forward. */
export async function advancePickup(req, res) {
  try {
    const identifier = req.params.id;
    const pickup = await Pickup.findOne(
      identifier.match(/^[0-9a-f]{24}$/) ? { _id: identifier } : { code: identifier },
    );
    if (!pickup) {
      return res.status(404).json({ success: false, message: "Pickup not found" });
    }

    const index = PICKUP_STAGES.indexOf(pickup.stage);
    const next = PICKUP_STAGES[index + 1];
    if (!next) {
      return res
        .status(400)
        .json({ success: false, message: "Pickup is already delivered" });
    }

    if (next === "weighed") {
      const weight = Number(req.body.weightKg);
      if (!(weight > 0)) {
        return res
          .status(400)
          .json({ success: false, message: "A weight above zero is required" });
      }
      pickup.weightKg = weight;
    }

    pickup.stage = next;
    if (next === "delivered" && req.body.batchCode) {
      pickup.batchCode = req.body.batchCode;
    }
    await pickup.save();

    // Weighing writes the received weight into the raw-hair inventory.
    if (next === "weighed") {
      const { next: logNumber, format } = await nextCode(WeightLog, "L", 4);
      await WeightLog.create({
        code: format(logNumber),
        supplierCode: pickup.supplierCode,
        pickupCode: pickup.code,
        date: pickup.date,
        type: "in",
        weightKg: pickup.weightKg,
        createdBy: req.userId,
      });
    }

    res.status(200).json({ success: true, pickup });
  } catch (error) {
    console.error("Error advancing pickup:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

/* GET /api/collections/logs?supplierCode=&batchCode=&type=&from=&to= */
export async function listLogs(req, res) {
  try {
    const { supplierCode, batchCode, type, from, to } = req.query;
    const filter = {};

    if (supplierCode) filter.supplierCode = supplierCode;
    if (batchCode) filter.batchCode = batchCode;
    if (type) filter.type = type;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }

    const logs = await WeightLog.find(filter).sort({ date: -1, code: -1 });
    res.status(200).json({ success: true, count: logs.length, logs });
  } catch (error) {
    console.error("Error listing weight logs:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

/* POST /api/collections/logs — received, rejected or processed weight. */
export async function createLog(req, res) {
  try {
    const {
      supplierCode,
      pickupCode,
      date,
      type,
      weightKg,
      batchCode,
      reason,
      note,
    } = req.body;

    if (!supplierCode || !type || !(Number(weightKg) > 0)) {
      return res.status(400).json({
        success: false,
        message: "Supplier, type and a weight above zero are required",
      });
    }
    if (type === "rejected" && !reason) {
      return res
        .status(400)
        .json({ success: false, message: "A reason is required for rejections" });
    }

    const { next, format } = await nextCode(
      WeightLog,
      type === "rejected" ? "R" : "L",
      4,
    );

    const log = await WeightLog.create({
      code: format(next),
      supplierCode,
      pickupCode,
      date: date || new Date().toISOString().slice(0, 10),
      type,
      weightKg,
      batchCode,
      reason,
      note,
      createdBy: req.userId,
    });

    res.status(201).json({ success: true, log });
  } catch (error) {
    console.error("Error creating weight log:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

/* GET /api/collections/summary?days=30 — raw-hair stock at a glance. */
export async function inventorySummary(req, res) {
  try {
    const days = Math.min(Number(req.query.days) || 30, 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const totals = await WeightLog.aggregate([
      { $group: { _id: "$type", kg: { $sum: "$weightKg" } } },
    ]);

    const recent = await WeightLog.aggregate([
      { $match: { date: { $gte: since } } },
      { $group: { _id: "$type", kg: { $sum: "$weightKg" } } },
    ]);

    const awaiting = await Pickup.aggregate([
      { $match: { stage: "weighed" } },
      { $group: { _id: null, kg: { $sum: "$weightKg" } } },
    ]);

    const byType = (rows) =>
      Object.fromEntries(rows.map((row) => [row._id, row.kg]));

    const all = byType(totals);
    const window = byType(recent);

    res.status(200).json({
      success: true,
      windowDays: days,
      summary: {
        onHandKg: (all.in ?? 0) - (all.processed ?? 0),
        awaitingDeliveryKg: awaiting[0]?.kg ?? 0,
        receivedKg: window.in ?? 0,
        rejectedKg: window.rejected ?? 0,
      },
    });
  } catch (error) {
    console.error("Error building inventory summary:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}
