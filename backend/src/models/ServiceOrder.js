const mongoose = require("mongoose");

// Schema con cho từng món hàng trong đơn
const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: {
      type: String,
      required: true, // Lưu snapshot tên sản phẩm tại thời điểm đặt
    },
    productCategory: {
      type: String,
      enum: ["drink", "snack", "consumable", "rental"],
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unitPrice: {
      type: Number,
      required: true, // Snapshot giá tại thời điểm đặt
    },
    depositPerItem: {
      type: Number,
      default: 0, // Tiền cọc / món (nếu là rental)
    },
    subtotal: {
      type: Number,
      required: true, // quantity * unitPrice
    },

    // ============ TRẠNG THÁI RIÊNG CHO MÓN THUÊ ============
    rentalStatus: {
      type: String,
      enum: [null, "in_use", "returned_good", "returned_damaged", "lost"],
      default: null, // null = không phải rental hoặc chưa giao
    },
    rentalReturnedAt: {
      type: Date,
      default: null,
    },
    rentalDamageFee: {
      type: Number,
      default: 0, // Phí hư hỏng (nếu returned_damaged)
    },
    rentalNote: {
      type: String,
      trim: true, // Ghi chú tình trạng trả đồ
    },
  },
  { _id: true },
);

// Schema chính cho ServiceOrder
const serviceOrderSchema = new mongoose.Schema(
  {
    // ============ THÔNG TIN ĐƠN ============
    orderNumber: {
      type: String,
      unique: true, // Mã đơn tự sinh: SO-20260719-XXXX
    },

    // Người tạo đơn (admin/staff hoặc customer)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Tên người tạo (snapshot)
    createdByName: {
      type: String,
    },

    // ============ LIÊN KẾT VỚI BOOKING (có thể null nếu bán tại quầy) ============
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },

    // ============ DANH SÁCH MÓN ============
    items: [orderItemSchema],

    // ============ TIỀN ============
    subtotalAmount: {
      type: Number,
      required: true, // Tổng tiền hàng (chưa gồm cọc)
      min: 0,
    },
    totalDeposit: {
      type: Number,
      default: 0, // Tổng tiền cọc
    },
    totalAmount: {
      type: Number,
      required: true, // subtotalAmount + totalDeposit
      min: 0,
    },
    refundAmount: {
      type: Number,
      default: 0, // Tiền hoàn cọc khi trả đồ
    },
    damageFeeTotal: {
      type: Number,
      default: 0, // Tổng phí hư hỏng
    },

    // ============ TRẠNG THÁI ĐƠN ============
    status: {
      type: String,
      enum: ["pending", "paid", "cancelled"],
      default: "pending",
    },

    // ============ THANH TOÁN ============
    paymentMethod: {
      type: String,
      enum: ["cash", "transfer", null],
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },

    // ============ GHI CHÚ ============
    note: {
      type: String,
      trim: true,
    },

    // ============ LOẠI ĐƠN ============
    orderType: {
      type: String,
      enum: ["pos", "booking"], // pos: bán tại quầy, booking: gắn với đặt sân
      default: "pos",
    },
  },
  { timestamps: true },
);

// ============ INDEXES ============
serviceOrderSchema.index({ booking: 1 });
serviceOrderSchema.index({ createdBy: 1 });
serviceOrderSchema.index({ status: 1 });
serviceOrderSchema.index({ orderType: 1 });
serviceOrderSchema.index({ "items.rentalStatus": 1 });
// Index cho analytics: lọc theo ngày tạo + trạng thái
serviceOrderSchema.index({ createdAt: 1, status: 1 });
// Index cho analytics: paymentMethod + status
serviceOrderSchema.index({ paymentMethod: 1, status: 1 });

// ============ PRE-SAVE: Tự sinh mã đơn ============
serviceOrderSchema.pre("save", async function (next) {
  if (!this.orderNumber) {
    const now = new Date();
    const dateStr =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0");
    const random = Math.floor(1000 + Math.random() * 9000);
    this.orderNumber = `SO-${dateStr}-${random}`;
  }
  next();
});

module.exports = mongoose.model("ServiceOrder", serviceOrderSchema);
