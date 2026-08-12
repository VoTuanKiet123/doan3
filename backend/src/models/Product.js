const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Vui lòng nhập tên sản phẩm"],
      trim: true,
    },
    category: {
      type: String,
      enum: ["drink", "snack", "consumable", "rental"],
      required: [true, "Vui lòng chọn danh mục"],
    },
    // drink: Đồ uống (nước suối, sting, redbull...)
    // snack: Đồ ăn nhẹ
    // consumable: Vật tư tiêu hao (ống cầu lông...)
    // rental: Cho thuê thiết bị (vợt...)

    price: {
      type: Number,
      required: [true, "Vui lòng nhập giá bán"],
      min: 0,
    },
    unit: {
      type: String,
      default: "cái", // cái, chai, lon, ống, bộ...
    },

    // ============ QUẢN LÝ KHO ============
    stockQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0,
    },

    // ============ RIÊNG CHO THUÊ THIẾT BỊ ============
    isRentable: {
      type: Boolean,
      default: false,
    },
    depositAmount: {
      type: Number,
      default: 0, // Tiền cọc khi thuê (chỉ dùng khi isRentable = true)
    },

    // ============ TRẠNG THÁI ============
    isActive: {
      type: Boolean,
      default: true,
    },
    imageUrl: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

// Index theo danh mục để truy vấn nhanh
productSchema.index({ category: 1, isActive: 1 });
// Index cảnh báo tồn kho thấp
productSchema.index({ stockQuantity: 1, lowStockThreshold: 1 });

// Virtual field: kiểm tra có đang ở mức tồn kho thấp không
productSchema.virtual("isLowStock").get(function () {
  return this.stockQuantity <= this.lowStockThreshold;
});

// Virtual field: kiểm tra hết hàng
productSchema.virtual("isOutOfStock").get(function () {
  return this.stockQuantity <= 0;
});

// Đảm bảo virtuals được include khi convert sang JSON
productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Product", productSchema);
