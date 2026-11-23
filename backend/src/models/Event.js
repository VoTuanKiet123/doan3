const mongoose = require("mongoose");

// ============ SỰ KIỆN / GIẢI ĐẤU ============
const eventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Vui lòng nhập tên sự kiện"],
      trim: true,
    },
    type: { type: mongoose.Schema.Types.ObjectId, ref: "EventType", default: null },
    court: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Court",
      default: null,
    },
    posterUrl: {
      type: String,
      trim: true,
      default: "",
    },
    startDate: { type: Date, required: [true, "Vui lòng chọn ngày bắt đầu"] },
    endDate: { type: Date, default: null },
    description: { type: String, trim: true },
    registrationDeadline: {
      type: Date,
      required: [true, "Vui lòng nhập hạn đăng ký"],
    },
    maxRegistrations: { type: Number, default: 0, min: 0 }, // 0 = không giới hạn
    registeredCount: { type: Number, default: 0, min: 0 },
    sponsors: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["draft", "published", "cancelled"],
      default: "draft",
    },
    results: {
      type: [{ rank: Number, name: String }],
      default: [],
      _id: false,
    },
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
  },
  { timestamps: true },
);

eventSchema.index({ status: 1, startDate: 1 });

module.exports = mongoose.model("Event", eventSchema);