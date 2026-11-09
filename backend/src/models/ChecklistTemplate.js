const mongoose = require("mongoose");

// ============ MỤC KIỂM TRA MẪU ============
// Nhân viên kiểm tra sân nhìn theo danh sách này; Admin chỉnh được.
const checklistTemplateSchema = new mongoose.Schema(
  {
    item: {
      type: String,
      required: [true, "Vui lòng nhập nội dung mục kiểm tra"],
      trim: true,
    },
    category: {
      type: String,
      enum: [
        "floor",
        "lighting",
        "net_post",
        "line_marking",
        "ventilation",
        "roof_wall",
        "other",
      ],
      default: "other",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ChecklistTemplate", checklistTemplateSchema);
