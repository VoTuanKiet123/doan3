const mongoose = require("mongoose");

// ============ LOẠI SỰ KIỆN (giải đấu) ============
// Danh mục tham chiếu để phân loại sự kiện — CRUD theo pattern ChecklistTemplate
const eventTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Vui lòng nhập tên loại sự kiện"],
      unique: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    note: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("EventType", eventTypeSchema);
