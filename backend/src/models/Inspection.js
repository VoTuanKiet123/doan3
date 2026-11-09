const mongoose = require("mongoose");

// ============ BÁO CÁO KIỂM TRA SÂN ============
// type "routine": nhân viên POS kiểm tra thường kỳ, phát hiện lỗi → gửi báo cáo
// type "acceptance": kiểm tra lại sau sửa, gắn vào phiếu, Admin căn cứ để duyệt
const inspectionSchema = new mongoose.Schema(
  {
    court: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Court",
      required: [true, "Vui lòng chọn sân kiểm tra"],
    },
    // Bắt buộc nếu type = acceptance; null với routine
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Maintenance",
      default: null,
    },
    type: {
      type: String,
      enum: ["routine", "acceptance"],
      default: "routine",
    },
    // Ngày kiểm tra YYYY-MM-DD (giống quy ước field date của Booking)
    date: {
      type: String,
      required: true,
    },
    inspectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        item: { type: String, required: true },
        category: {
          type: String,
          enum: [
            "floor",
            "lighting",
            "net_post",
            "line_marking",
            "ventilation",
            "roof_wall",
            "other",
          ],
          default: "other",
        },
        result: {
          type: String,
          enum: ["ok", "attention", "fail"],
          required: true,
        },
        note: { type: String, trim: true },
        photos: { type: [String], default: [] },
      },
    ],
    // routine: mức độ do nhân viên chọn. critical ⇒ sân TẠM NGƯNG nhận khách ngay
    severity: {
      type: String,
      enum: ["none", "minor", "needs_repair", "critical"],
      default: "none",
    },
    // acceptance: đạt / không đạt (không dùng cho routine)
    result: {
      type: String,
      enum: ["pass", "fail"],
    },
    failReason: {
      type: String,
      trim: true,
    },
    note: {
      type: String,
      trim: true,
    },
    // Admin bấm "Bỏ qua" báo cáo routine → ghi vào đây, sân hết tạm ngưng
    // (chưa bỏ qua = field chưa tồn tại → query `dismissal: null` khớp)
    dismissal: {
      by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      at: Date,
      reason: { type: String, trim: true },
    },
  },
  { timestamps: true },
);

// Lịch sử kiểm tra theo sân (mới nhất trước)
inspectionSchema.index({ court: 1, date: -1 });
// Báo cáo nghiệm thu của một phiếu (lấy lần gần nhất)
inspectionSchema.index({ ticket: 1, createdAt: -1 });
// Lọc báo cáo chờ xử lý theo loại + mức độ
inspectionSchema.index({ type: 1, severity: 1 });

module.exports = mongoose.model("Inspection", inspectionSchema);
