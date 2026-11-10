import mongoose from "mongoose";

const auditSchema = new mongoose.Schema(
  {
    user: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true },
    module: { type: String, required: true, index: true },
    item: { type: String, required: true },
    itemId: { type: String },
    remarks: { type: String, trim: true },
    ip: { type: String },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditSchema.pre("save", function (next) {
  if (!this.isNew) {
    return next(new Error("Audit entries are immutable."));
  }
  next();
});

auditSchema.pre(
  ["updateOne", "findOneAndUpdate", "deleteOne", "findOneAndDelete"],
  function (next) {
    next(new Error("Audit entries cannot be modified or deleted."));
  },
);

const Audit = mongoose.models.Audit || mongoose.model("Audit", auditSchema);

export default Audit;