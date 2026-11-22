import { User } from "../auth/authModel.js";
import Supplier from "../suppliers/supplierModel.js";
import { Pickup } from "../suppliers/pickupModule/pickupModel.js";
import { WeightLog } from "../inventory/inventoryModel.js";

export async function getDashboardData(req, res) {
  try {
    const now = new Date();
    // Pickup dates are stored as Philippine calendar dates (YYYY-MM-DD).
    const today = now.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

    // 1. Fetch Suppliers Data
    const totalSuppliers = await Supplier.countDocuments();
    const approvedSuppliers = await Supplier.countDocuments({ status: "approved" });
    const pendingSuppliers = await Supplier.countDocuments({ status: "pending" });

    // 2. Fetch Pickups Data
    // Active = scheduled + collected (not yet delivered)
    const activePickups = await Pickup.countDocuments({
      status: { $in: ["scheduled", "collected"] },
    });
    // Due today
    const dueToday = await Pickup.countDocuments({
      status: { $in: ["scheduled", "collected"] },
      scheduledDate: today,
    });
    // Overdue
    const overdue = await Pickup.countDocuments({
      status: { $in: ["scheduled", "collected"] },
      scheduledDate: { $lt: today },
    });
    // Delivered (all time)
    const deliveredPickups = await Pickup.countDocuments({ status: "delivered" });

    // 3. Fetch User Data (Staff/Operators)
    const totalStaff = await User.countDocuments({ role: "staff", isActive: true });

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