const mongoose = require("mongoose");

/**
 * CancellationPolicy – Chính sách hủy lịch, cấu hình được ở Admin.
 * Cho phép nhiều rule theo số giờ trước giờ đặt.
 * VD: hủy trước >= 24h → hoàn 100%, trước 2-24h → hoàn 50%, dưới 2h → 0%
 */
const cancellationRuleSchema = new mongoose.Schema(
  {
    hoursBefore: {
      type: Number,
      required: true, // Số giờ trước giờ đặt (VD: 24, 2, 0)
      min: 0,
    },
    refundPercent: {
      type: Number,
      required: true, // % hoàn tiền (0-100)
      min: 0,
      max: 100,
    },
  },
  { _id: false },
);

const cancellationPolicySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "Chính sách hủy mặc định",
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Danh sách rule, sắp xếp theo hoursBefore giảm dần
    rules: [cancellationRuleSchema],
    // Thời gian no-show (phút) – nếu quá X phút không đến thì đánh dấu no-show
    noShowMinutes: {
      type: Number,
      default: 15,
      min: 0,
    },
    // Ghi chú
    description: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("CancellationPolicy", cancellationPolicySchema);
