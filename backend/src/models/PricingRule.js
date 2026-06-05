const mongoose = require('mongoose');

const pricingRuleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Vui lòng nhập tên quy tắc giá'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['peak', 'weekend', 'holiday'],
      required: true,
    },
    // 0=Chủ nhật, 1=Thứ 2, ..., 6=Thứ 7
    daysOfWeek: {
      type: [Number],
      required: true,
      validate: {
        validator: (arr) => arr.length > 0 && arr.every((d) => d >= 0 && d <= 6),
        message: 'daysOfWeek phải là mảng các số từ 0 đến 6',
      },
    },
    // Giờ bắt đầu áp dụng (0-23), ví dụ: 17 = từ 17:00
    startHour: {
      type: Number,
      required: true,
      min: 0,
      max: 23,
    },
    // Giờ kết thúc áp dụng (1-24), ví dụ: 22 = đến 22:00
    endHour: {
      type: Number,
      required: true,
      min: 1,
      max: 24,
    },
    // Hệ số nhân giá: 1.5 = tăng 50%, 1.0 = giá bình thường
    priceMultiplier: {
      type: Number,
      required: true,
      min: 0.1,
      max: 10,
      default: 1.0,
    },
    // Quy tắc ưu tiên cao hơn sẽ được áp dụng khi có nhiều rule chồng nhau
    priority: {
      type: Number,
      default: 1,
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Validate startHour < endHour
pricingRuleSchema.pre('save', function (next) {
  if (this.startHour >= this.endHour) {
    return next(new Error('Giờ bắt đầu phải nhỏ hơn giờ kết thúc'));
  }
  next();
});

module.exports = mongoose.model('PricingRule', pricingRuleSchema);
