const mongoose = require("mongoose");

// ============ NHẬT KÝ THỰC HIỆN BẢO TRÌ ============
// Một phiếu có thể nhiều log (nhiều ngày/ca). Không xóa log — chỉ voided kèm lý do.
const maintenanceLogSchema = new mongoose.Schema(
  {
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Maintenance",
      required: [true, "Nhật ký phải thuộc một phiếu bảo trì"],
    },
    // Lưu sẵn court để query "sân này đã chi bao nhiêu" không cần $lookup qua ticket
    court: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Court",
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    // open: đang làm (sửa được) | closed: đã nộp (sửa được khi phiếu chưa completed) | voided: đã hủy bỏ
    status: {
      type: String,
      enum: ["open", "closed", "voided"],
      default: "open",
    },
    voidReason: {
      type: String,
      trim: true,
    },
    // Ghi theo từng việc (nhà thầu: chỉ ghi giờ vào/ra và tình trạng)
    steps: [
      {
        description: { type: String, required: true, trim: true },
        doneAt: { type: Date, default: Date.now },
      },
    ],
    workDone: {
      type: String,
      trim: true,
    },
    materialsUsed: [
      {
        name: { type: String, required: true, trim: true },
        qty: { type: Number, required: true, min: 0 },
        unitCost: { type: Number, default: 0, min: 0 },
      },
    ],
    laborCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    materialCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    otherCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    photos: { type: [String], default: [] },
    note: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

// Nhật ký của một phiếu (ca mới nhất trước)
maintenanceLogSchema.index({ ticket: 1, startedAt: -1 });
// "Ca của tôi" + log đang mở của nhân viên
maintenanceLogSchema.index({ performedBy: 1, status: 1 });
// MỘT phiếu chỉ tối đa MỘT log open — chống 2 nhân viên cùng nhận/ca song song (race)
maintenanceLogSchema.index(
  { ticket: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "open" } },
);

module.exports = mongoose.model("MaintenanceLog", maintenanceLogSchema);
