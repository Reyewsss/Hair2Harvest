import { User } from "../auth/authModel.js";
import Supplier from "../suppliers/supplierModel.js";
import { Pickup } from "../suppliers/pickupModule/pickupModel.js";

export async function getDashboardData(req, res) {
  try {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

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

    // 4. Build the 7-day trend
    // We calculate the date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    const startDate = sevenDaysAgo.toISOString().slice(0, 10);

    // Aggregate collected weight per day
    const trendData = await Pickup.aggregate([
      {
        $match: {
          status: "delivered",
          deliveredAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$deliveredAt" } },
          totalWeight: { $sum: "$weightKg" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Format trendData into an array of 7 days (fill missing days with 0)
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });
      
      const found = trendData.find((t) => t._id === dateStr);
      chartData.push({
        label: dayLabel,
        value: found ? found.totalWeight : 0,
      });
    }

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
      trend: chartData, // Array of { label: "Mon", value: 120 }
    });
  } catch (error) {
    console.error("Overview API Error:", error);
    res.status(500).json({ message: error.message });
  }
}