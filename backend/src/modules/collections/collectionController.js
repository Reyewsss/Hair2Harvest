import Pickup, { PICKUP_STAGES } from "./pickupModel.js";
import WeightLog from "./weightLogModel.js";

const DAY = 24 * 60 * 60 * 1000;

const recurrenceStep = { weekly: 7, biweekly: 14, monthly: 30 };
const recurrenceCount = { none: 1, weekly: 4, biweekly: 3, monthly: 3 };

/** Expands a recurring schedule into one date per pickup. */
function occurrences(start, recurrence) {
  const count = recurrenceCount[recurrence] ?? 1;
  const step = recurrenceStep[recurrence];
  if (!step) return [new Date(start)];

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + step * index);
    return date;
  });
}

/* GET /api/collections/pickups?shop=&stage=&from=&to= */
export async function listPickups(req, res) {
  try {
    const { shop, stage, from, to } = req.query;
    const filter = {};

    if (shop) filter.shop = shop;
    if (stage) filter.stage = stage;
    if (from || to) {
      filter.scheduledFor = {};
      if (from) filter.scheduledFor.$gte = new Date(from);
      if (to) filter.scheduledFor.$lte = new Date(to);
    }

    const pickups = await Pickup.find(filter)
      .populate("shop", "shopName barangay shopCode")
      .sort({ scheduledFor: 1 });

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
    const { shop, date, time = "10:00", recurrence = "none", estimatedWeightKg } =
      req.body;

    if (!shop || !date) {
      return res
        .status(400)
        .json({ success: false, message: "Shop and date are required" });
    }

    const start = new Date(`${date}T${time}:00`);
    const created = await Pickup.insertMany(
      occurrences(start, recurrence).map((scheduledFor) => ({
        shop,
        scheduledFor,
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
    const pickup = await Pickup.findById(req.params.id);
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
      await WeightLog.create({
        shop: pickup.shop,
        pickup: pickup._id,
        date: pickup.scheduledFor,
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

/* GET /api/collections/logs?shop=&batchCode=&type=&from=&to= */
export async function listLogs(req, res) {
  try {
    const { shop, batchCode, type, from, to } = req.query;
    const filter = {};

    if (shop) filter.shop = shop;
    if (batchCode) filter.batchCode = batchCode;
    if (type) filter.type = type;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    const logs = await WeightLog.find(filter)
      .populate("shop", "shopName barangay")
      .sort({ date: -1 });

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
    const { shop, pickup, date, type, weightKg, batchCode, reason, note } =
      req.body;

    if (!shop || !type || !(Number(weightKg) > 0)) {
      return res.status(400).json({
        success: false,
        message: "Shop, type and a weight above zero are required",
      });
    }
    if (type === "rejected" && !reason) {
      return res
        .status(400)
        .json({ success: false, message: "A reason is required for rejections" });
    }

    const log = await WeightLog.create({
      shop,
      pickup,
      date: date ? new Date(date) : new Date(),
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
    const since = new Date(Date.now() - days * DAY);

    const [totals] = await WeightLog.aggregate([
      {
        $group: {
          _id: "$type",
          kg: { $sum: "$weightKg" },
        },
      },
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
