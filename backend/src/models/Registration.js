const mongoose = require("mongoose");

// ============ ĐĂNG KÝ THAM GIA SỰ KIỆN ============
// Đăng ký có hiệu lực ngay. name/phone là SNAPSHOT lúc đăng ký để danh sách
// không bị ảnh hưởng nếu user đổi thông tin tài khoản về sau.
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
    name: {
      type: String,
      required: [true, "Vui lòng nhập họ và tên"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Vui lòng nhập số điện thoại"],
      trim: true,
    },
    gender: {
      type: String,
      enum: ["Nam", "Nữ", "Khác"],
      default: "Nam",
    },
    skillLevel: {
      type: String,
      enum: ["Mới chơi", "Phong trào", "Khá", "Bán chuyên"],
      default: "Phong trào",
    },
    partnerOrTeamName: {
      type: String,
      trim: true,
      default: "",
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
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