const mongoose = require("mongoose");

/**
 * Transaction – Lưu mọi giao dịch tài chính độc lập với trạng thái booking.
 * Dùng cho: thu tiền booking, bán dịch vụ, hoàn tiền (refund), cọc & trả cọc.
 */
const transactionSchema = new mongoose.Schema(
  {
    // ============ MÃ GIAO DỊCH ============
    transactionCode: {
      type: String,
      unique: true, // TXN-20260724-XXXX
    },

    // ============ LOẠI GIAO DỊCH ============
    type: {
      type: String,
      enum: [
        "booking_payment", // Thu tiền đặt sân
        "service_payment", // Thu tiền dịch vụ (nước, đồ ăn, thuê vợt)
        "deposit", // Thu tiền cọc thuê đồ
        "deposit_return", // Hoàn cọc
        "refund", // Hoàn tiền huỷ booking
        "damage_fee", // Phí hư hỏng đồ thuê
        "other", // Khác
      ],
      required: true,
    },

    // ============ SỐ TIỀN ============
    amount: {
      type: Number,
      required: true,
    },
    // Số dư sau giao dịch (để audit trail)
    balanceAfter: {
      type: Number,
      default: 0,
    },

    // ============ PHƯƠNG THỨC THANH TOÁN ============
    paymentMethod: {
      type: String,
      enum: ["cash", "transfer", "qr", "other"],
      default: "cash",
    },

    // ============ LIÊN KẾT ============
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },
    serviceOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceOrder",
      default: null,
    },

    // ============ NGƯỜI LIÊN QUAN ============
    // Khách hàng (có thể null nếu là giao dịch nội bộ)
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    customerName: String,
    customerPhone: String,

    // Nhân viên POS thực hiện giao dịch
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    staffName: String,

    // ============ CA LÀM VIỆC ============
    shift: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShiftReport",
      default: null,
    },

    // ============ MÔ TẢ ============
    description: {
      type: String,
      trim: true,
    },

    // ============ TRẠNG THÁI ============
    status: {
      type: String,
      enum: ["completed", "pending", "failed"],
      default: "completed",
    },

    // ============ METADATA (mở rộng) ============
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

// ============ INDEXES ============
transactionSchema.index({ booking: 1 });
transactionSchema.index({ serviceOrder: 1 });
transactionSchema.index({ staff: 1, createdAt: -1 });
transactionSchema.index({ shift: 1 });
transactionSchema.index({ type: 1, createdAt: -1 });
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ transactionCode: 1 });

// ============ PRE-SAVE: Tự sinh mã giao dịch ============
transactionSchema.pre("save", async function (next) {
  if (!this.transactionCode) {
    const now = new Date();
    const dateStr =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    this.transactionCode = `TXN-${dateStr}-${random}`;
  }
  next();
});

module.exports = mongoose.model("Transaction", transactionSchema);
