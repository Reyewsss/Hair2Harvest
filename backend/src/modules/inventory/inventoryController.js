import { WeightLog } from "./inventoryModel.js";
import { recordAudit } from "../audit/auditController.js";

export async function listLogs(req, res) {
  try {
    const logs = await WeightLog.find().sort({ date: -1, createdAt: -1 });
    res.status(200).json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

// Raw hair on hand, in sacks: received minus processed (same rule as the Inventory page).
async function sacksOnHand() {
  const totals = await WeightLog.aggregate([
    { $match: { type: { $in: ["in", "processed"] } } },
    { $group: { _id: "$type", sacks: { $sum: "$sacks" } } },
  ]);
  const of = (type) => totals.find((t) => t._id === type)?.sacks ?? 0;
  return of("in") - of("processed");
}

/** GET /api/inventory/stock → { onHand } */
export async function getStock(_req, res) {
  try {
    res.json({ onHand: await sacksOnHand() });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}

/**
 * POST /api/inventory/processed  { sacks, batchId, note? }
 * Takes raw-hair sacks out of stock for a compost batch (writes a "processed" log).
 */
export async function consumeSacks(req, res) {
  try {
    const sacks = Number(req.body?.sacks);
    const batchId = String(req.body?.batchId ?? "").trim();
    const note = String(req.body?.note ?? "").trim().slice(0, 200);

    if (!Number.isInteger(sacks) || sacks < 1) {
      return res.status(400).json({ message: "Enter a whole number of sacks (1 or more)." });
    }
    if (!batchId) return res.status(400).json({ message: "A batch ID is required." });

    const onHand = await sacksOnHand();
    if (sacks > onHand) {
      return res.status(409).json({
        message: `Only ${onHand} sack${onHand === 1 ? "" : "s"} of raw hair on hand.`,
        onHand,
      });
    }

    const log = await WeightLog.create({
      date: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }), // YYYY-MM-DD
      type: "processed",
      sacks,
      batchId,
      note: note || undefined,
    });

    await recordAudit({
      req,
      action: "process",
      module: "inventory",
      item: batchId,
      itemId: log._id.toString(),
      remarks: `${sacks} sack${sacks === 1 ? "" : "s"} taken for batch ${batchId}${note ? ` (${note})` : ""}`,
    });

    res.status(201).json({ log, onHand: onHand - sacks });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}
