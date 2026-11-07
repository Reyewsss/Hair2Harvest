import Audit from "./auditModel.js";

/* Helper used by other controllers to write an entry.
 *
 * - `req` is used to grab req.user (when authenticated) and req.ip.
 * - `actor` overrides req.user so we can log pre-auth events
 *   (failed logins, forgot-password, etc.) where req.user isn't set yet.
 */
export async function recordAudit({
  req,
  actor,
  action,
  module,
  item,
  itemId,
  remarks,
}) {
  try {
    const user = actor ?? req?.user;
    await Audit.create({
      user: user?.name ?? "System",
      userId: user?._id,
      action,
      module,
      item,
      itemId,
      remarks,
      ip: req?.ip,
    });
  } catch (error) {
    console.error("Audit log error:", error.message);
  }
}

/* GET /api/audit?search=&module=&from=&to=&page=&limit= */
export async function listAudit(req, res) {
  try {
    const { search, module, from, to, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (module) filter.module = module;

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    if (search) {
      const escaped = String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(escaped, "i");
      filter.$or = [
        { user: pattern },
        { action: pattern },
        { item: pattern },
        { remarks: pattern },
      ];
    }

    const perPage = Math.min(Number(limit) || 50, 200);
    const [entries, total] = await Promise.all([
      Audit.find(filter)
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * perPage)
        .limit(perPage)
        .lean(),
      Audit.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, total, page: Number(page), entries });
  } catch (error) {
    console.error("Error listing audit:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

/* GET /api/audit/export — CSV for research documentation */
export async function exportAudit(req, res) {
  try {
    const { search, module, from, to } = req.query;
    const filter = {};
    if (module) filter.module = module;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    if (search) {
      const pattern = new RegExp(String(search), "i");
      filter.$or = [{ user: pattern }, { action: pattern }, { item: pattern }];
    }

    const entries = await Audit.find(filter)
      .sort({ createdAt: -1 })
      .limit(10000)
      .lean();

    const header = "Time,User,Module,Action,Item,Remarks\n";
    const rows = entries
      .map((e) =>
        [
          new Date(e.createdAt).toISOString(),
          e.user,
          e.module,
          e.action,
          e.item,
          e.remarks ?? "",
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="audit-trail-${Date.now()}.csv"`,
    );
    res.send(header + rows);
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ success: false, message: "Export failed" });
  }
}