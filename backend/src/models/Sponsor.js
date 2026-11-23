const mongoose = require("mongoose");

const TIERS = ["diamond", "gold", "silver", "partner"];

const sponsorSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Vui lòng nhập tên nhà tài trợ"], trim: true },
    tier: { type: String, enum: TIERS, default: "partner" },
    logoUrl: { type: String, trim: true, default: "" },
    website: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    contactName: { type: String, trim: true, default: "" },
    contactPhone: { type: String, trim: true, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

sponsorSchema.statics.TIERS = TIERS;

module.exports = mongoose.model("Sponsor", sponsorSchema);
