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
      enum: ["casual", "fixed_monthly", "walk-in"],
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

    // ============ TRẠNG THÁI PHIÊN (SESSION STATUS) ============
    // pending → checked_in (mở phiên) → checked_out (kết phiên) | no_show | cancelled
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "checked_in",
        "checked_out",
        "no_show",
        "cancelled",
      ],
      default: "pending",
    },
    // Trạng thái thanh toán (tách biệt với trạng thái phiên)
    // Quy tắc: checked_in LUÔN đi kèm unpaid. Chỉ checked_out mới có thể paid.
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded", "partially_refunded"],
      default: "unpaid",
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    note: {
      type: String,
      trim: true,
    },

    // ============ CHECK-IN ============
    checkedIn: {
      type: Boolean,
      default: false,
    },
    checkedInAt: {
      type: Date,
      default: null,
    },
    // Nhân viên POS thực hiện check-in
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ============ CHECK-OUT ============
    checkedOutAt: {
      type: Date,
      default: null,
    },
    // Nhân viên POS thực hiện check-out
    checkedOutBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Ghi chú khi check-out (vd: lý do hủy giữa chừng, phụ thu...)
    checkoutNote: {
      type: String,
      trim: true,
    },
    // Tiền sân thực tế thu khi check-out (có thể khác totalPrice nếu có phụ thu over-time)
    actualCourtFee: {
      type: Number,
      default: 0,
    },
    // Tiền dịch vụ tổng cộng trong phiên
    totalServiceFee: {
      type: Number,
      default: 0,
    },
    // Cọc hoàn lại / bị trừ
    depositReturned: {
      type: Number,
      default: 0,
    },
    depositDeducted: {
      type: Number,
      default: 0,
    },
    // Tổng bill cuối cùng khách phải trả khi check-out
    finalBillAmount: {
      type: Number,
      default: 0,
    },

    // ============ THÔNG TIN KHÁCH HÀNG (dành cho POS tra cứu) ============
    customerPhone: {
      type: String,
      trim: true,
    },
    // Ai tạo booking này (nếu là walk-in do staff tạo)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Ghi chú nội bộ của nhân viên POS
    staffNote: {
      type: String,
      trim: true,
    },

    // ============ ĐÁNH GIÁ ============
    review: {
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String, trim: true },
      createdAt: { type: Date },
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
// Index cho analytics: lọc theo ngày + trạng thái
bookingSchema.index({ date: 1, status: 1 });
// Index cho analytics: lọc theo loại đặt + ngày
bookingSchema.index({ bookingType: 1, date: 1, status: 1 });
// Index cho analytics: user + status (top khách hàng)
bookingSchema.index({ user: 1, status: 1 });
// Index tra cứu nhanh theo SĐT khách (POS)
bookingSchema.index({ customerPhone: 1, status: 1 });
// Index tra cứu booking theo người tạo (POS staff)
bookingSchema.index({ createdBy: 1, status: 1 });

module.exports = mongoose.model("Booking", bookingSchema);
