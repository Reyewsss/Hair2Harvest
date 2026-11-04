import {
  DEFAULT_CRITERIA,
  QualityDecision,
  QualityStatusHistory,
  QualityThreshold,
} from "./qualityModel.js";
import LabResult from "../lab-results/labResultModel.js";

const maturityRank = { immature: 0, "semi-mature": 1, mature: 2 };

const evaluateCriterion = (criterion, values) => {
  const raw = values?.[criterion.key];
  const numeric = Number(raw);

  if (criterion.key === "maturity" && criterion.equals) {
    return (maturityRank[raw] ?? 0) >= (maturityRank[criterion.equals] ?? 0);
  }
  if (typeof criterion.equals === "string") {
    return String(raw) === criterion.equals;
  }

  let pass = true;
  if (criterion.min !== undefined) pass = pass && numeric >= criterion.min;
  if (criterion.max !== undefined) pass = pass && numeric <= criterion.max;
  return pass;
};

const recommend = (failed) => {
  if (failed.length === 0) return "Approved for Supervised Testing";
  return failed.some((check) => check.criterion.critical) ? "Rejected" : "On Hold";
};

const loadCriteria = async () => {
  const stored = await QualityThreshold.findOne({ singleton: "default" });
  return stored?.criteria?.length ? stored.criteria : DEFAULT_CRITERIA;
};

/* GET /api/quality/thresholds */
export async function getThresholds(req, res) {
  try {
    const criteria = await loadCriteria();
    res.status(200).json({ success: true, criteria });
  } catch (error) {
    console.error("Error loading thresholds:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

/* PUT /api/quality/thresholds — admin only. */
export async function updateThresholds(req, res) {
  try {
    const { criteria } = req.body;
    if (!Array.isArray(criteria) || criteria.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "A non-empty criteria list is required" });
    }

    const saved = await QualityThreshold.findOneAndUpdate(
      { singleton: "default" },
      { criteria, updatedBy: req.userId },
      { new: true, upsert: true, runValidators: true },
    );

    res.status(200).json({ success: true, criteria: saved.criteria });
  } catch (error) {
    console.error("Error saving thresholds:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

/* GET /api/quality/evaluate/:batchCode */
export async function evaluateBatch(req, res) {
  try {
    const { batchCode } = req.params;
    const criteria = await loadCriteria();
    const result = await LabResult.findOne({ batchCode }).sort({ version: -1 });

    if (!result) {
      return res.status(200).json({
        success: true,
        batchCode,
        result: null,
        checks: [],
        failed: [],
        recommendation: "Pending",
        blocked: true,
      });
    }

    const checks = criteria.map((criterion) => ({
      criterion,
      value: String(result.values[criterion.key]),
      pass: evaluateCriterion(criterion, result.values),
    }));
    const failed = checks.filter((check) => !check.pass);

    res.status(200).json({
      success: true,
      batchCode,
      version: result.version,
      checks,
      failed,
      recommendation: recommend(failed),
      blocked: false,
    });
  } catch (error) {
    console.error("Error evaluating batch:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

/* GET /api/quality/decisions */
export async function listDecisions(req, res) {
  try {
    const decisions = await QualityDecision.find()
      .populate("decidedBy", "name")
      .sort({ batchCode: 1 });
    res.status(200).json({ success: true, count: decisions.length, decisions });
  } catch (error) {
    console.error("Error listing decisions:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

/* POST /api/quality/decisions — admin authorises a status change. */
export async function authorizeStatus(req, res) {
  try {
    const { batchCode, status, remarks } = req.body;

    if (!batchCode || !status) {
      return res
        .status(400)
        .json({ success: false, message: "Batch code and status are required" });
    }
    if (status === "Approved for Supervised Testing") {
      const result = await LabResult.findOne({ batchCode }).sort({ version: -1 });
      if (!result) {
        return res.status(400).json({
          success: false,
          message: "The approved label stays blocked until a lab result is on file",
        });
      }
    }

    const previous =
      (await QualityDecision.findOne({ batchCode }))?.status ?? "Pending";

    const decision = await QualityDecision.findOneAndUpdate(
      { batchCode },
      { status, remarks, decidedBy: req.userId, decidedAt: new Date().toISOString().slice(0, 10) },
      { new: true, upsert: true, runValidators: true },
    );

    await QualityStatusHistory.create({
      batchCode,
      previous,
      status,
      remarks,
      decidedBy: req.userId,
    });

    res.status(200).json({ success: true, decision });
  } catch (error) {
    console.error("Error authorising status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

/* GET /api/quality/history?batchCode= */
export async function listHistory(req, res) {
  try {
    const { batchCode } = req.query;
    const filter = batchCode ? { batchCode } : {};
    const history = await QualityStatusHistory.find(filter).sort({
      decidedAt: -1,
    });
    res.status(200).json({ success: true, count: history.length, history });
  } catch (error) {
    console.error("Error listing status history:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}
