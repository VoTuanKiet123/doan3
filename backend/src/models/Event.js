const mongoose = require("mongoose");

// ============ SỰ KIỆN / GIẢI ĐẤU ============
// Trạng thái khóa đăng ký (hết hạn / đầy suất / kết thúc) KHÔNG lưu ở đây —
// suy ra bằng eventService.getEventState (một nguồn sự thật, không cron).
const eventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Vui lòng nhập tên sự kiện"],
      trim: true,
    },
    type: { type: mongoose.Schema.Types.ObjectId, ref: "EventType", default: null },
    court: {
      // Chỉ hiển thị địa điểm — cố ý KHÔNG chặn lịch đặt sân (chốt trong plan)
      type: mongoose.Schema.Types.ObjectId,
      ref: "Court",
      default: null,
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
    sponsors: { type: [String], default: [] }, // text thô, split dấu phẩy — không có model Sponsor
    status: {
      type: String,
      enum: ["draft", "published", "cancelled"],
      default: "draft",
    },
    // Top 5 chung cuộc — admin gõ tay, không join Registration (chốt trong plan)
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

// validate chéo field (deadline ≤ startDate) làm ở controller — schema validate
// không chạy trên doc hợp nhất khi PUT một phần
eventSchema.index({ status: 1, startDate: 1 });

module.exports = mongoose.model("Event", eventSchema);
