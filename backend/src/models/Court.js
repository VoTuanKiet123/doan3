const mongoose = require("mongoose");

const courtSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Vui lòng nhập tên sân"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ['A', 'B', 'C'],
      default: 'A',
    },
    services: {
      type: [String],
      default: [],
    },
    pricePerHour: {
      type: Number,
      required: [true, "Vui lòng nhập giá thuê sân"],
      min: 0,
    },
    images: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
<<<<<<< HEAD
      enum: ["active", "inactive", "maintenance"],
      default: "active",
=======
      enum: ['active', 'inactive'],
      default: 'active',
>>>>>>> c43715cc4445c1f84dec4c11d364f1bae6a9579e
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Court", courtSchema);
