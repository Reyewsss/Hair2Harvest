import { FIELDS, current, refreshSettings, saveSettings } from "./securitySettings.js";
import { recordAudit } from "../audit/auditController.js";

const describe = () =>
  Object.fromEntries(
    Object.entries(FIELDS).map(([key, f]) => [key, { type: f.type, min: f.min, max: f.max, default: f.default }]),
  );

export const getSettings = async (_req, res) => {
  await refreshSettings(true);
  res.json({ settings: current(), fields: describe() });
};

export const updateSettings = async (req, res) => {
  const result = await saveSettings(req.body?.settings, req.user._id);
  if (result.error) return res.status(400).json({ message: result.error });

  const changes = Object.keys(result.after)
    .filter((k) => result.before[k] !== result.after[k])
    .map((k) => `${k}: ${result.before[k]} → ${result.after[k]}`);

  if (changes.length > 0) {
    await recordAudit({
      req,
      action: "update",
      module: "security",
      item: "Security settings",
      remarks: changes.join(", "),
    });
  }
  res.json({ settings: result.after });
};
