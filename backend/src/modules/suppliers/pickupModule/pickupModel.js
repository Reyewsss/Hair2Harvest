import mongoose from "mongoose";

const pickupSchema = new mongoose.Schema(
  {
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
      index: true,
    },
    scheduledDate: { type: String, required: true, index: true }, // YYYY-MM-DD
    scheduledTime: { type: String, required: true }, // HH:MM
    frequency: {
      type: String,
      enum: ["daily", "twice-weekly", "weekly", "none"],
      default: "none",
    },

    // Add this to the schema definition
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    
    // Lifecycle status
    status: {
      type: String,
      enum: ["scheduled", "collected", "delivered", "cancelled"],
      default: "scheduled",
      index: true,
    },
    
    // Verification & Operator
    collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    collectedAt: { type: Date },
    photoUrl: { type: String }, // Path to the uploaded image
    
    deliveredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    deliveredAt: { type: Date },

    // Optional: Log the weight
    weightKg: { type: Number, min: 0 },
    sacks: { type: Number, min: 0 },
    notes: { type: String },
  },
  { timestamps: true }
);

// Prevent duplicate pickups for the same shop on the same day/time
pickupSchema.index({ supplierId: 1, scheduledDate: 1, scheduledTime: 1 }, { unique: true });

export const Pickup = mongoose.models.Pickup || mongoose.model("Pickup", pickupSchema);