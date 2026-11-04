import Experiment, { GrowthLog } from "./experimentModel.js";
import { QualityDecision } from "../quality/qualityModel.js";
import LabResult from "../lab-results/labResultModel.js";
import WeightLog from "../collections/weightLogModel.js";

const APPROVED = "Approved for Supervised Testing";

/* GET /api/experiments */
export async function listExperiments(req, res) {
  try {
    const { batchCode, status } = req.query;
    const filter = {};
    if (batchCode) filter.batchCode = batchCode;
    if (status) filter.status = status;

    const experiments = await Experiment.find(filter).sort({ startDate: -1 });
    res
      .status(200)
      .json({ success: true, count: experiments.length, experiments });
  } catch (error) {
    console.error("Error listing experiments:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

/* GET /api/experiments/:id */
export async function getExperiment(req, res) {
  try {
    const experiment = await Experiment.findById(req.params.id);
    if (!experiment) {
      return res
        .status(404)
        .json({ success: false, message: "Experiment not found" });
    }

    const growth = await GrowthLog.find({ experiment: experiment._id }).sort({
      date: -1,
    });

    res.status(200).json({ success: true, experiment, growth });
  } catch (error) {
    console.error("Error fetching experiment:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

/* POST /api/experiments — only approved batches are allowed. */
export async function createExperiment(req, res) {
  try {
    const { title, crop, setup, batchCode, startDate, treatments } = req.body;

    if (!title || !crop || !setup || !batchCode || !startDate) {
      return res.status(400).json({
        success: false,
        message: "Title, crop, setup, batch and start date are required",
      });
    }

    const decision = await QualityDecision.findOne({ batchCode });
    if (decision?.status !== APPROVED) {
      return res.status(400).json({
        success: false,
        message:
          "Experiments can only use batches approved for supervised testing",
      });
    }

    const experiment = await Experiment.create({
      title,
      crop,
      setup,
      batchCode,
      startDate,
      treatments,
      createdBy: req.userId,
    });

    res.status(201).json({ success: true, experiment });
  } catch (error) {
    console.error("Error creating experiment:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

/* POST /api/experiments/:id/growth */
export async function addGrowthLog(req, res) {
  try {
    const { date, treatmentId, heightCm, leafCount, health, photo, note } =
      req.body;

    if (!date || !treatmentId || !(Number(heightCm) > 0) || !(Number(leafCount) > 0)) {
      return res.status(400).json({
        success: false,
        message:
          "Date, treatment, a height above zero and a leaf count are required",
      });
    }

    const experiment = await Experiment.findById(req.params.id);
    if (!experiment) {
      return res
        .status(404)
        .json({ success: false, message: "Experiment not found" });
    }
    if (!experiment.treatments.some((item) => item.id === treatmentId)) {
      return res
        .status(400)
        .json({ success: false, message: "Unknown treatment for this experiment" });
    }

    const growth = await GrowthLog.create({
      experiment: experiment._id,
      date,
      treatmentId,
      heightCm,
      leafCount,
      health,
      photo,
      note,
      createdBy: req.userId,
    });

    res.status(201).json({ success: true, growth });
  } catch (error) {
    console.error("Error logging growth:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

/* GET /api/experiments/:id/traceability */
export async function getTraceability(req, res) {
  try {
    const experiment = await Experiment.findById(req.params.id);
    if (!experiment) {
      return res
        .status(404)
        .json({ success: false, message: "Experiment not found" });
    }

    const { batchCode } = experiment;
    const [labResults, decision, contributions] = await Promise.all([
      LabResult.find({ batchCode }).sort({ version: -1 }),
      QualityDecision.findOne({ batchCode }),
      WeightLog.find({ batchCode }).populate("shop", "shopName barangay"),
    ]);

    const suppliers = [
      ...new Map(
        contributions
          .filter((log) => log.shop)
          .map((log) => [String(log.shop._id), log.shop]),
      ).values(),
    ];

    res.status(200).json({
      success: true,
      experiment,
      batchCode,
      labResults,
      decision,
      suppliers,
    });
  } catch (error) {
    console.error("Error building traceability:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}
