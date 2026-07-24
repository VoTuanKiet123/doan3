const mongoose = require("mongoose");

/**
 * ShiftReport – Báo cáo đối soát ca làm việc của nhân viên POS.
 * Snapshot dữ liệu tại thời điểm đóng ca, không tính real-time.
 */
const shiftReportSchema = new mongoose.Schema(
  {
    // ============ THÔNG TIN NHÂN VIÊN ============
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    staffName: {
      type: String,
      required: true,
    },

    // ============ THỜI GIAN CA ============
    shiftDate: {
      type: String, // "2026-07-24"
      required: true,
    },
    openedAt: {
      type: Date,
      required: true,
    },
    closedAt: {
      type: Date,
      default: null,
    },

    // ============ TIỀN QUỸ ============
    openingCash: {
      type: Number,
      required: true,
      min: 0,
    },
    closingCash: {
      type: Number,
      default: 0, // Nhân viên nhập khi đóng ca
    },
    expectedCash: {
      type: Number,
      default: 0, // Hệ thống tính: openingCash + cashIn - cashOut
    },
    cashDifference: {
      type: Number,
      default: 0, // closingCash - expectedCash
    },
    differenceNote: {
      type: String,
      trim: true, // Lý do chênh lệch
    },

    // ============ TỔNG HỢP GIAO DỊCH TRONG CA ============
    totalCashIn: {
      type: Number,
      default: 0, // Tổng tiền mặt thu vào
    },
    totalCashOut: {
      type: Number,
      default: 0, // Tổng tiền mặt chi ra (refund)
    },
    totalTransferIn: {
      type: Number,
      default: 0, // Tổng tiền chuyển khoản thu vào
    },

    // Đếm số lượng
    bookingCount: {
      type: Number,
      default: 0,
    },
    walkInCount: {
      type: Number,
      default: 0,
    },
    serviceOrderCount: {
      type: Number,
      default: 0,
    },
    refundCount: {
      type: Number,
      default: 0,
    },

    // ============ TRẠNG THÁI CA ============
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
    },
  },
  { timestamps: true },
);

// ============ INDEXES ============
shiftReportSchema.index({ staff: 1, shiftDate: -1 });
shiftReportSchema.index({ status: 1 });
shiftReportSchema.index({ shiftDate: -1 });

module.exports = mongoose.model("ShiftReport", shiftReportSchema);
