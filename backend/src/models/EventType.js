const mongoose = require("mongoose");

// Loại sự kiện / nội dung thi đấu: Đơn nam, Đôi nam nữ, Giải phong trào...
// playType quyết định khách đăng ký 1 người (single) hay theo cặp (pair)
const eventTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Vui lòng nhập tên loại sự kiện"], trim: true },
    playType: {
      type: String,
      enum: ["single", "pair"],
      required: true,
      default: "single",
    },
    description: { type: String, trim: true, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EventType", eventTypeSchema);
