import Batch from "./batchModel.js";

/* GET /api/batches */
export async function listBatches(req, res) {
  try {
    const { stage } = req.query;
    const filter = stage ? { stage } : {};
    const batches = await Batch.find(filter).sort({ startedAt: -1 });
    res.status(200).json({ success: true, count: batches.length, batches });
  } catch (error) {
    console.error("Error listing batches:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

/* GET /api/batches/:code */
export async function getBatch(req, res) {
  try {
    const batch = await Batch.findOne({ code: req.params.code });
    if (!batch) {
      return res.status(404).json({ success: false, message: "Batch not found" });
    }
    res.status(200).json({ success: true, batch });
  } catch (error) {
    console.error("Error fetching batch:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}
