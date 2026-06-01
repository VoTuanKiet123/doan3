const mongoose = require('mongoose');

const courtSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Vui lòng nhập tên sân'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    pricePerHour: {
      type: Number,
      required: [true, 'Vui lòng nhập giá thuê sân'],
      min: 0,
    },
    imageUrl: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance'],
      default: 'active',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Court', courtSchema);
