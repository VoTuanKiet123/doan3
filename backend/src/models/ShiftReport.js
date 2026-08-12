const mongoose = require("mongoose");

/**
 * ShiftReport – Báo cáo đối soát ca làm việc của nhân viên POS.
 * Áp dụng mô hình Imprest System (Quỹ tiền lẻ định mức).
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

    // ============ QUỸ ĐỊNH MỨC (IMPREST SYSTEM) ============
    // floatAmount: Quỹ định mức cố định, lấy từ Admin Settings, không đổi mỗi ca
    floatAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    // cashRevenue: Tổng doanh thu tiền mặt thu được trong ca (từ check-out, bán dịch vụ rời...)
    cashRevenue: {
      type: Number,
      default: 0,
    },
    // cashRefundOut: Tổng tiền mặt đã hoàn/chi ra trong ca (refund, hoàn cọc...)
    cashRefundOut: {
      type: Number,
      default: 0,
    },

    // ============ ĐỐI SOÁT CUỐI CA ============
    // expectedCash = floatAmount + cashRevenue − cashRefundOut (hệ thống tự tính)
    expectedCash: {
      type: Number,
      default: 0,
    },
    // actualCashCounted: Số tiền nhân viên đếm thực tế lúc đóng ca
    actualCashCounted: {
      type: Number,
      default: 0,
    },
    // discrepancy = actualCashCounted − expectedCash (dư/thiếu so với dự kiến)
    discrepancy: {
      type: Number,
      default: 0,
    },
    // amountWithdrawn = actualCashCounted − floatAmount (số tiền thực nộp doanh thu)
    amountWithdrawn: {
      type: Number,
      default: 0,
    },
    // amountLeftForNextShift: luôn = floatAmount nếu không có sự cố
    amountLeftForNextShift: {
      type: Number,
      default: 0,
    },
    discrepancyNote: {
      type: String,
      trim: true, // Lý do chênh lệch (nếu có)
    },

    // ============ TỔNG HỢP GIAO DỊCH TRONG CA ============
    totalTransferIn: {
      type: Number,
      default: 0, // Tổng tiền chuyển khoản thu vào (không liên quan quỹ định mức)
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

    // ============ BÀN GIAO CA (HANDOVER) ============
    // Trạng thái bàn giao: pending (chưa xác nhận), confirmed (đã xác nhận), disputed (có tranh chấp)
    handoverStatus: {
      type: String,
      enum: ["pending", "confirmed", "disputed"],
      default: "pending",
    },
    // Người xác nhận nhận bàn giao (nhân viên ca sau hoặc Admin)
    handoverConfirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    handoverConfirmedByName: {
      type: String,
      default: "",
    },
    handoverConfirmedAt: {
      type: Date,
      default: null,
    },
    handoverNote: {
      type: String,
      trim: true,
      default: "",
    },
    // Khi mở ca, nhân viên ca sau xác nhận số tiền quỹ nhận được
    handoverReceivedAmount: {
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
