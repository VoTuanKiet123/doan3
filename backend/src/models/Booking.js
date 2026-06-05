const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    court: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Court',
      required: true,
    },
    date: {
      type: String,
      required: [true, 'Vui lòng chọn ngày đặt sân'],
    },
    startTime: {
      type: String,
      required: [true, 'Vui lòng chọn giờ bắt đầu'],
    },
    endTime: {
      type: String,
      required: [true, 'Vui lòng chọn giờ kết thúc'],
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    // Chi tiết giá từng segment 30 phút (dynamic pricing)
    priceBreakdown: [
      {
        timeSlot: String,   // "17:00 - 17:30"
        rate: Number,       // đơn giá / giờ áp dụng cho segment này
        price: Number,      // tiền thực tế của segment
        multiplier: Number, // hệ số nhân (1.0 = giá thường, 1.5 = peak)
        ruleName: String,   // tên rule (null nếu giá thường)
        ruleType: String,   // 'normal', 'peak', 'weekend', 'holiday'
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'pending',
    },
    note: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Booking', bookingSchema);
