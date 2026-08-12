const mongoose = require("mongoose");

/**
 * SystemSettings – Cấu hình hệ thống tập trung (Admin Settings).
 * Chỉ có 1 document duy nhất, dùng findOneAndUpdate với upsert.
 */
const systemSettingsSchema = new mongoose.Schema(
  {
    // ============ QUỸ ĐỊNH MỨC (IMPREST SYSTEM) ============
    floatAmount: {
      type: Number,
      default: 500000, // Mặc định 500,000đ
      min: 0,
      description: "Quỹ tiền lẻ định mức cố định trong quầy (không đổi mỗi ca)",
    },

    // ============ THÔNG TIN SÂN ============
    venueName: {
      type: String,
      default: "Sân Cầu Lông Badminton Center",
      trim: true,
    },
    venueAddress: {
      type: String,
      default: "",
      trim: true,
    },
    venuePhone: {
      type: String,
      default: "",
      trim: true,
    },

    // ============ GIỜ MỞ CỬA ============
    openTime: {
      type: String,
      default: "06:00",
    },
    closeTime: {
      type: String,
      default: "22:00",
    },
  },
  { timestamps: true },
);

// Đảm bảo chỉ có 1 document settings duy nhất
systemSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model("SystemSettings", systemSettingsSchema);
