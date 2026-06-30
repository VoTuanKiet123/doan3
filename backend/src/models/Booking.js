const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    court: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Court",
      required: true,
    },

    // ============ PHÂN LOẠI HÌNH THỨC ĐẶT SÂN ============
    bookingType: {
      type: String,
      enum: ["casual", "fixed_monthly"],
      default: "casual",
    },

    // ============ THÔNG TIN LỊCH ĐẶT ============
    date: {
      type: String,
      required: [true, "Vui lòng chọn ngày đặt sân"],
    },
    startTime: {
      type: String,
      required: [true, "Vui lòng chọn giờ bắt đầu"],
    },
    endTime: {
      type: String,
      required: [true, "Vui lòng chọn giờ kết thúc"],
    },

    // ============ DÀNH CHO ĐẶT LỊCH CỐ ĐỊNH THEO THÁNG ============
    // batchId: Gom nhóm các booking con trong cùng 1 lần đặt cố định
    batchId: {
      type: String,
      default: null,
    },
    // Lưu metadata lịch gốc để tiện hiển thị/quản lý
    fixedScheduleMeta: {
      startDate: { type: String }, // "2026-07-01"
      endDate: { type: String }, // "2026-07-31"
      daysOfWeek: [{ type: Number }], // [1,3,5] = Thứ 2-4-6
    },

    // ============ GIÁ & THANH TOÁN ============
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    // Chi tiết giá từng segment 30 phút (dynamic pricing)
    priceBreakdown: [
      {
        timeSlot: String, // "17:00 - 17:30"
        rate: Number, // đơn giá / giờ áp dụng cho segment này
        price: Number, // tiền thực tế của segment
        multiplier: Number, // hệ số nhân (1.0 = giá thường, 1.5 = peak)
        ruleName: String, // tên rule (null nếu giá thường)
        ruleType: String, // 'normal', 'peak', 'weekend', 'holiday'
      },
    ],

    paymentInfo: {
      bankName: String,
      accountNumber: String,
      accountName: String,
      amount: Number,
      description: String,
      qrText: String,
    },

    // ============ TRẠNG THÁI ============
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    note: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

// ============ INDEXES CHO TRUY VẤN TỐI ƯU ============
// Index kiểm tra trùng lịch: tìm trên cùng sân + ngày + trạng thái
bookingSchema.index({ court: 1, date: 1, status: 1 });
// Index kiểm tra trùng lịch với khung giờ
bookingSchema.index({ court: 1, date: 1, startTime: 1, endTime: 1, status: 1 });
// Index batchId để truy vấn nhanh nhóm booking cố định
bookingSchema.index({ batchId: 1 });

module.exports = mongoose.model("Booking", bookingSchema);
