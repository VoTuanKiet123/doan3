const mongoose = require("mongoose");
const Counter = require("./Counter");

// Trạng thái phiếu dịch vụ vợt (theo ai-context.md, Phần A)
const STATUSES = ["received", "in_progress", "completed", "picked_up", "cancelled"];
const SERVICE_TYPES = ["stringing", "grip", "frame_repair", "other"];

// Lịch sử đổi trạng thái: khách xem được ai đổi, khi nào, ghi chú gì
const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: STATUSES, required: true },
    note: { type: String, trim: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const racketServiceTicketSchema = new mongoose.Schema(
  {
    // ============ MÃ PHIẾU (tự sinh: SV-YYMMDD-NNN) ============
    ticketCode: { type: String, unique: true },

    // ============ KHÁCH HÀNG ============
    // customer: liên kết tài khoản nếu SĐT trùng với 1 user (để khách tự xem trên web)
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    customerName: {
      type: String,
      required: [true, "Vui lòng nhập tên khách"],
      trim: true,
    },
    customerPhone: {
      type: String,
      required: [true, "Vui lòng nhập số điện thoại khách"],
      trim: true,
    },

    // ============ VỢT & DỊCH VỤ ============
    racketBrand: {
      type: String,
      required: [true, "Vui lòng nhập hãng/mẫu vợt"],
      trim: true,
    },
    racketDescription: { type: String, trim: true }, // màu, đặc điểm nhận dạng
    conditionAtReceive: { type: String, trim: true }, // tình trạng lúc nhận
    serviceType: {
      type: String,
      enum: SERVICE_TYPES,
      required: [true, "Vui lòng chọn loại dịch vụ"],
    },
    stringName: { type: String, trim: true }, // loại dây (nếu căng dây)
    isCustomerString: { type: Boolean, default: false },
    tensionLbs: { type: Number, min: 10, max: 40 },

    // ============ CHI PHÍ (thu khi trả vợt) ============
    serviceFee: { type: Number, default: 0, min: 0 },
    materialFee: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, default: 0, min: 0 },
    paymentStatus: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },

    // ============ TRẠNG THÁI & THỜI GIAN ============
    status: { type: String, enum: STATUSES, default: "received" },
    statusHistory: [statusHistorySchema],
    receivedAt: { type: Date, default: Date.now },
    estimatedReadyAt: { type: Date },
    completedAt: { type: Date },
    pickedUpAt: { type: Date },

    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    note: { type: String, trim: true },
  },
  { timestamps: true },
);

// Sinh mã phiếu bằng Counter.$inc (tránh trùng khi tạo đồng thời)
racketServiceTicketSchema.pre("save", async function () {
  if (!this.ticketCode) {
    const counter = await Counter.findOneAndUpdate(
      { key: "racket_service" },
      { $inc: { seq: 1 } },
      { upsert: true, new: true },
    );
    const d = new Date();
    const ymd =
      String(d.getFullYear()).slice(2) +
      String(d.getMonth() + 1).padStart(2, "0") +
      String(d.getDate()).padStart(2, "0");
    this.ticketCode = `SV-${ymd}-${String(counter.seq).padStart(3, "0")}`;
  }
  this.totalAmount = (this.serviceFee || 0) + (this.materialFee || 0);
});

// ============ INDEXES ============
racketServiceTicketSchema.index({ customerPhone: 1 });
racketServiceTicketSchema.index({ customer: 1, createdAt: -1 });
racketServiceTicketSchema.index({ status: 1, estimatedReadyAt: 1 }); // quét phiếu trễ hẹn
racketServiceTicketSchema.index({ status: 1, completedAt: 1 }); // phiếu chờ lấy lâu

racketServiceTicketSchema.statics.STATUSES = STATUSES;
racketServiceTicketSchema.statics.SERVICE_TYPES = SERVICE_TYPES;

module.exports = mongoose.model("RacketServiceTicket", racketServiceTicketSchema);
