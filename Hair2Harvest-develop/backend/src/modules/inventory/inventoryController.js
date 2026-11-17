import { WeightLog } from "./inventoryModel.js";

export async function listLogs(req, res) {
  try {
    const logs = await WeightLog.find().sort({ date: -1, createdAt: -1 });
    res.status(200).json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}