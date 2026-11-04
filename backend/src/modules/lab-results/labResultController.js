import LabResult from "./labResultModel.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* GET /api/lab-results?batchCode=&labName=&search=&from=&to= */
export async function listResults(req, res) {
  try {
    const { batchCode, labName, search, from, to } = req.query;
    const filter = {};

    if (batchCode) filter.batchCode = batchCode;
    if (labName) filter.labName = labName;
    if (from || to) {
      filter.receivedAt = {};
      if (from) filter.receivedAt.$gte = new Date(from);
      if (to) filter.receivedAt.$lte = new Date(to);
    }
    if (search) {
      const pattern = new RegExp(escapeRegex(search), "i");
      filter.$or = [
        { batchCode: pattern },
        { labName: pattern },
        { method: pattern },
      ];
    }

    const results = await LabResult.find(filter).sort({
      batchCode: 1,
      version: -1,
    });

    res.status(200).json({ success: true, count: results.length, results });
  } catch (error) {
    console.error("Error listing lab results:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

/* GET /api/lab-results/:id */
export async function getResult(req, res) {
  try {
    const result = await LabResult.findById(req.params.id);
    if (!result) {
      return res
        .status(404)
        .json({ success: false, message: "Lab result not found" });
    }
    res.status(200).json({ success: true, result });
  } catch (error) {
    console.error("Error fetching lab result:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

/* POST /api/lab-results — a repeat test becomes version n+1 for that batch. */
export async function createResult(req, res) {
  try {
    const {
      batchCode,
      labName,
      method,
      sampledAt,
      receivedAt,
      values,
      attachment,
      notes,
    } = req.body;

    if (!batchCode || !labName || !method || !sampledAt || !receivedAt || !values) {
      return res.status(400).json({
        success: false,
        message:
          "Batch, laboratory, method, sample dates and test values are required",
      });
    }

    const [latest, lastCode] = await Promise.all([
      LabResult.findOne({ batchCode }).sort({ version: -1 }).select("version"),
      LabResult.findOne({ code: /^LR-/ }).sort({ code: -1 }).select("code"),
    ]);
    const nextCode = lastCode ? Number(lastCode.code.split("-")[1]) + 1 : 1;

    const result = await LabResult.create({
      code: `LR-${String(nextCode).padStart(4, "0")}`,
      batchCode,
      version: (latest?.version ?? 0) + 1,
      labName,
      method,
      sampledAt,
      receivedAt,
      values,
      attachment,
      notes,
      enteredBy: req.userId,
    });

    res.status(201).json({
      success: true,
      message: `Saved as version ${result.version}`,
      result,
    });
  } catch (error) {
    console.error("Error creating lab result:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

/* GET /api/lab-results/latest — newest version per batch. */
export async function latestByBatch(req, res) {
  try {
    const latest = await LabResult.aggregate([
      { $sort: { batchCode: 1, version: -1 } },
      {
        $group: {
          _id: "$batchCode",
          result: { $first: "$$ROOT" },
        },
      },
      { $replaceRoot: { newRoot: "$result" } },
      { $sort: { batchCode: 1 } },
    ]);

    res.status(200).json({ success: true, count: latest.length, results: latest });
  } catch (error) {
    console.error("Error fetching latest lab results:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}
