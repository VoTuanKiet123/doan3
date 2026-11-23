const mongoose = require("mongoose");

// ============ ĐĂNG KÝ THAM GIA SỰ KIỆN ============
// Đăng ký là có hiệu lực ngay (không duyệt đơn — chốt trong plan).
// name/phone là SNAPSHOT từ User lúc đăng ký: danh sách + kết quả không hỏng
// khi user bị đổi/xóa (pattern customerName/customerPhone của phiếu vợt).
const registrationSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    status: {
      type: String,
      enum: ["registered", "cancelled"],
      default: "registered",
    },
    cancelNote: { type: String, trim: true }, // lý do admin hủy (bắt buộc)
  },
  { timestamps: true },
);

// Chặn đăng ký TRÙNG một người vào một sự kiện. Partial: đã cancelled thì
// index tự giải → người đó được đăng ký lại.
registrationSchema.index(
  { event: 1, user: 1 },
  { unique: true, partialFilterExpression: { status: "registered" } },
);
registrationSchema.index({ event: 1, createdAt: 1 });
registrationSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Registration", registrationSchema);
