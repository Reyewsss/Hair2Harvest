import { User } from "../auth/authModel.js";
import Supplier from "../suppliers/supplierModel.js";
import { Pickup } from "../suppliers/pickupModule/pickupModel.js";
import { WeightLog } from "../inventory/inventoryModel.js";

export async function getDashboardData(req, res) {
  try {
    const now = new Date();
    // Pickup dates are stored as Philippine calendar dates (YYYY-MM-DD).
    const today = now.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

    // All the counts run at the same time (they used to run one after another).
    const live = { $in: ["scheduled", "collected"] }; // active = scheduled + collected, not yet delivered
    const [totalSuppliers, approvedSuppliers, pendingSuppliers, activePickups, dueToday, overdue, deliveredPickups, totalStaff] =
      await Promise.all([
        Supplier.countDocuments(),
        Supplier.countDocuments({ status: "approved" }),
        Supplier.countDocuments({ status: "pending" }),
        Pickup.countDocuments({ status: live }),
        Pickup.countDocuments({ status: live, scheduledDate: today }),
        Pickup.countDocuments({ status: live, scheduledDate: { $lt: today } }),
        Pickup.countDocuments({ status: "delivered" }),
        User.countDocuments({ role: "staff", isActive: true }),
      ]);

    // 4. 7-day trend: raw-hair sacks received into inventory per day (Manila dates,
    //    the same YYYY-MM-DD strings the inventory logs use).
    const manilaDay = (d) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86_400_000);
      days.push({
        date: manilaDay(d),
        label: d.toLocaleDateString("en-US", { weekday: "short", timeZone: "Asia/Manila" }),
      });
    }
    const received = await WeightLog.aggregate([
      { $match: { type: "in", date: { $gte: days[0].date, $lte: days[6].date } } },
      { $group: { _id: "$date", sacks: { $sum: "$sacks" } } },
    ]);
    const chartData = days.map(({ date, label }) => ({
      label,
      value: received.find((r) => r._id === date)?.sacks ?? 0,
    }));

    res.status(200).json({
      suppliers: {
        total: totalSuppliers,
        approved: approvedSuppliers,
        pending: pendingSuppliers,
      },
      pickups: {
        active: activePickups,
        dueToday,
        overdue,
        delivered: deliveredPickups,
      },
      staff: {
        total: totalStaff,
      },
      trend: chartData, // [{ label: "Mon", value: <sacks received> }]
    });
  } catch (error) {
    console.error("Overview API Error:", error);
    res.status(500).json({ message: error.message });
  }
}