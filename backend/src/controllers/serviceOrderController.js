const ServiceOrder = require("../models/ServiceOrder");
const Product = require("../models/Product");
const Booking = require("../models/Booking");
const { validateStock } = require("./productController");
const mongoose = require("mongoose");

// ============ HELPERS ============

/**
 * Xử lý trừ kho trong transaction.
 * Sử dụng Mongoose session để tránh race condition.
 */
const deductStock = async (items, session) => {
  for (const item of items) {
    const result = await Product.findOneAndUpdate(
      {
        _id: item.product,
        stockQuantity: { $gte: item.quantity }, // Atomic check
      },
      { $inc: { stockQuantity: -item.quantity } },
      { new: true, session },
    );

    if (!result) {
      throw new Error(
        `Không thể trừ kho cho sản phẩm "${item.productName}". Có thể đã hết hàng.`,
      );
    }
  }
};

/**
 * Hoàn lại kho khi hủy đơn.
 */
const restoreStock = async (items, session) => {
  for (const item of items) {
    await Product.findByIdAndUpdate(
      item.product,
      { $inc: { stockQuantity: item.quantity } },
      { session },
    );
  }
};

/**
 * Build items array từ request body, đồng thời lấy snapshot giá/tên từ DB.
 */
const buildOrderItems = async (itemsInput) => {
  const items = [];
  for (const input of itemsInput) {
    const product = await Product.findById(input.product);
    if (!product) {
      throw new Error(`Sản phẩm với ID ${input.product} không tồn tại`);
    }
    items.push({
      product: product._id,
      productName: product.name,
      productCategory: product.category,
      quantity: input.quantity,
      unitPrice: product.price,
      depositPerItem: product.isRentable ? product.depositAmount : 0,
      subtotal: product.price * input.quantity,
    });
  }
  return items;
};

// ============ PUBLIC / USER ENDPOINTS ============

/**
 * @desc    Lấy danh sách đơn dịch vụ của user hiện tại
 * @route   GET /api/service-orders
 */
const getMyOrders = async (req, res) => {
  try {
    const filter = { createdBy: req.user._id };
    // Nếu user không phải admin, chỉ xem đơn của mình
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.booking) {
      filter.booking = req.query.booking;
    }

    const orders = await ServiceOrder.find(filter)
      .populate("items.product", "name category price unit")
      .populate("booking", "date startTime endTime court")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Lấy chi tiết 1 đơn dịch vụ
 * @route   GET /api/service-orders/:id
 */
const getOrderById = async (req, res) => {
  try {
    const order = await ServiceOrder.findById(req.params.id)
      .populate("items.product", "name category price unit depositAmount")
      .populate("booking", "date startTime endTime court")
      .populate("createdBy", "name email");

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đơn dịch vụ" });
    }

    // Chỉ admin hoặc chủ đơn mới xem được
    if (
      req.user.role !== "admin" &&
      order.createdBy._id.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Không có quyền xem đơn này" });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ TẠO ĐƠN DỊCH VỤ ============

/**
 * @desc    Tạo đơn dịch vụ mới (POS hoặc gắn booking) - CÓ TRANSACTION
 * @route   POST /api/service-orders
 */
const createServiceOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { items: itemsInput, bookingId, note, orderType } = req.body;

    // Validate items
    if (!itemsInput || !Array.isArray(itemsInput) || itemsInput.length === 0) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ success: false, message: "Vui lòng chọn ít nhất 1 sản phẩm" });
    }

    // Kiểm tra số lượng hợp lệ
    for (const item of itemsInput) {
      if (!item.quantity || item.quantity < 1) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Số lượng mỗi sản phẩm phải >= 1",
        });
      }
    }

    // Kiểm tra tồn kho trước khi làm gì
    const stockCheck = await validateStock(itemsInput, session);
    if (!stockCheck.valid) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Một số sản phẩm không đủ hàng",
        errors: stockCheck.errors,
      });
    }

    // Validate booking nếu có
    if (bookingId) {
      const booking = await Booking.findById(bookingId).session(session);
      if (!booking) {
        await session.abortTransaction();
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy lịch đặt sân" });
      }
      // Kiểm tra quyền: chỉ admin hoặc chủ booking mới được gắn dịch vụ
      if (
        req.user.role !== "admin" &&
        booking.user.toString() !== req.user._id.toString()
      ) {
        await session.abortTransaction();
        return res.status(403).json({
          success: false,
          message: "Không có quyền thêm dịch vụ cho lịch đặt này",
        });
      }
    }

    // Build items với snapshot
    const items = await buildOrderItems(itemsInput);

    // Tính tiền
    const subtotalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);
    const totalDeposit = items.reduce(
      (sum, item) => sum + item.depositPerItem * item.quantity,
      0,
    );
    const totalAmount = subtotalAmount + totalDeposit;

    // Tạo đơn
    const order = await ServiceOrder.create(
      [
        {
          createdBy: req.user._id,
          createdByName: req.user.name,
          booking: bookingId || null,
          items,
          subtotalAmount,
          totalDeposit,
          totalAmount,
          status: "pending",
          orderType: orderType || (bookingId ? "booking" : "pos"),
          note: note || "",
        },
      ],
      { session },
    );

    // Trừ kho
    await deductStock(items, session);

    await session.commitTransaction();

    // Populate để trả về
    const populatedOrder = await ServiceOrder.findById(order[0]._id)
      .populate("items.product", "name category price unit")
      .populate("booking", "date startTime endTime court");

    res.status(201).json({
      success: true,
      data: populatedOrder,
      message: "Tạo đơn dịch vụ thành công",
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

// ============ THANH TOÁN & CẬP NHẬT TRẠNG THÁI ============

/**
 * @desc    Xác nhận thanh toán đơn dịch vụ (Admin/Staff)
 * @route   PUT /api/service-orders/:id/pay
 */
const payOrder = async (req, res) => {
  try {
    const order = await ServiceOrder.findById(req.params.id);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đơn" });
    }

    if (order.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Đơn đang ở trạng thái "${order.status}", không thể thanh toán`,
      });
    }

    const { paymentMethod } = req.body;
    order.status = "paid";
    order.paymentMethod = paymentMethod || "cash";
    order.paidAt = new Date();

    // Nếu có món thuê, tự động set rentalStatus = in_use
    for (const item of order.items) {
      if (item.depositPerItem > 0 && !item.rentalStatus) {
        item.rentalStatus = "in_use";
      }
    }

    await order.save();

    const populated = await ServiceOrder.findById(order._id).populate(
      "items.product",
      "name category price unit",
    );

    res.json({
      success: true,
      data: populated,
      message: "Thanh toán thành công",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Hủy đơn dịch vụ - hoàn lại kho (có transaction)
 * @route   PUT /api/service-orders/:id/cancel
 */
const cancelOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await ServiceOrder.findById(req.params.id).session(session);
    if (!order) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đơn" });
    }

    if (order.status === "cancelled") {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ success: false, message: "Đơn đã bị hủy trước đó" });
    }

    // Nếu đơn đã paid, không cho hủy qua API này (cần xử lý refund riêng)
    if (order.status === "paid") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message:
          "Đơn đã thanh toán, không thể hủy. Vui lòng xử lý hoàn tiền thủ công.",
      });
    }

    // Hoàn lại kho
    await restoreStock(order.items, session);

    order.status = "cancelled";
    await order.save({ session });

    await session.commitTransaction();

    res.json({ success: true, message: "Đã hủy đơn và hoàn lại kho" });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

// ============ QUẢN LÝ THUÊ / TRẢ THIẾT BỊ ============

/**
 * @desc    Cập nhật trạng thái trả đồ cho từng món thuê trong đơn
 * @route   PUT /api/service-orders/:id/return-item/:itemId
 */
const returnRentalItem = async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const { returnStatus, damageFee, note } = req.body;

    const validStatuses = ["returned_good", "returned_damaged", "lost"];
    if (!validStatuses.includes(returnStatus)) {
      return res.status(400).json({
        success: false,
        message: `Trạng thái không hợp lệ. Chọn: ${validStatuses.join(", ")}`,
      });
    }

    const order = await ServiceOrder.findById(id);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đơn" });
    }

    if (order.status !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Đơn chưa thanh toán, không thể xử lý trả đồ",
      });
    }

    // Tìm item trong đơn
    const item = order.items.id(itemId);
    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy món trong đơn" });
    }

    if (item.rentalStatus !== "in_use") {
      return res.status(400).json({
        success: false,
        message: `Món này đang ở trạng thái "${item.rentalStatus}", không thể cập nhật`,
      });
    }

    // Cập nhật trạng thái trả
    item.rentalStatus = returnStatus;
    item.rentalReturnedAt = new Date();
    if (note) item.rentalNote = note;

    // Xử lý tiền cọc & phí hư hỏng
    if (returnStatus === "returned_good") {
      // Hoàn cọc đầy đủ cho món này
      const depositToRefund = item.depositPerItem * item.quantity;
      order.refundAmount += depositToRefund;
    } else if (returnStatus === "returned_damaged") {
      const fee = damageFee || 0;
      item.rentalDamageFee = fee;
      order.damageFeeTotal += fee;
      // Hoàn phần còn lại của cọc sau khi trừ phí
      const depositTotal = item.depositPerItem * item.quantity;
      order.refundAmount += Math.max(0, depositTotal - fee);
    } else if (returnStatus === "lost") {
      // Mất đồ: trừ toàn bộ cọc
      const depositTotal = item.depositPerItem * item.quantity;
      order.damageFeeTotal += depositTotal;
      // Không hoàn cọc
    }

    await order.save();

    const populated = await ServiceOrder.findById(order._id).populate(
      "items.product",
      "name category price unit depositAmount",
    );

    res.json({
      success: true,
      data: populated,
      message: `Đã cập nhật trạng thái trả đồ: ${returnStatus}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ ADMIN ENDPOINTS ============

/**
 * @desc    Lấy TẤT CẢ đơn dịch vụ (Admin only)
 * @route   GET /api/service-orders/admin/all
 */
const getAllOrders = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.orderType) filter.orderType = req.query.orderType;
    if (req.query.booking) filter.booking = req.query.booking;
    if (req.query.search) {
      filter.$or = [
        { orderNumber: { $regex: req.query.search, $options: "i" } },
        { createdByName: { $regex: req.query.search, $options: "i" } },
      ];
    }

    const orders = await ServiceOrder.find(filter)
      .populate("items.product", "name category price unit")
      .populate("booking", "date startTime endTime court")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .limit(req.query.limit ? parseInt(req.query.limit) : 100);

    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Lấy danh sách thiết bị đang cho thuê (chưa trả)
 * @route   GET /api/service-orders/admin/active-rentals
 */
const getActiveRentals = async (req, res) => {
  try {
    const orders = await ServiceOrder.find({
      status: "paid",
      "items.rentalStatus": "in_use",
    })
      .populate("items.product", "name category price unit depositAmount")
      .populate("createdBy", "name email phone")
      .sort({ createdAt: -1 });

    // Lọc chỉ lấy các items đang thuê
    const activeRentals = [];
    for (const order of orders) {
      for (const item of order.items) {
        if (item.rentalStatus === "in_use") {
          activeRentals.push({
            orderId: order._id,
            orderNumber: order.orderNumber,
            customer: order.createdBy,
            item: {
              _id: item._id,
              productName: item.productName,
              productCategory: item.productCategory,
              quantity: item.quantity,
              depositPerItem: item.depositPerItem,
              totalDeposit: item.depositPerItem * item.quantity,
            },
            orderCreatedAt: order.createdAt,
            orderPaidAt: order.paidAt,
          });
        }
      }
    }

    res.json({
      success: true,
      count: activeRentals.length,
      data: activeRentals,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Báo cáo doanh thu dịch vụ (Admin)
 * @route   GET /api/service-orders/admin/revenue
 */
const getRevenueReport = async (req, res) => {
  try {
    const { startDate, endDate, groupBy } = req.query;
    const filter = { status: "paid" };

    if (startDate || endDate) {
      filter.paidAt = {};
      if (startDate) filter.paidAt.$gte = new Date(startDate);
      if (endDate) filter.paidAt.$lte = new Date(endDate + "T23:59:59.999Z");
    }

    const orders = await ServiceOrder.find(filter);

    const totalRevenue = orders.reduce((sum, o) => sum + o.subtotalAmount, 0);
    const totalDeposit = orders.reduce((sum, o) => sum + o.totalDeposit, 0);
    const totalRefund = orders.reduce((sum, o) => sum + o.refundAmount, 0);
    const totalDamageFee = orders.reduce((sum, o) => sum + o.damageFeeTotal, 0);

    // Doanh thu theo danh mục
    const revenueByCategory = {};
    for (const order of orders) {
      for (const item of order.items) {
        const cat = item.productCategory || "unknown";
        if (!revenueByCategory[cat]) {
          revenueByCategory[cat] = { revenue: 0, count: 0 };
        }
        revenueByCategory[cat].revenue += item.subtotal;
        revenueByCategory[cat].count += item.quantity;
      }
    }

    res.json({
      success: true,
      data: {
        totalRevenue,
        totalDeposit,
        totalRefund,
        totalDamageFee,
        netRevenue: totalRevenue - totalRefund + totalDamageFee,
        orderCount: orders.length,
        revenueByCategory,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMyOrders,
  getOrderById,
  createServiceOrder,
  payOrder,
  cancelOrder,
  returnRentalItem,
  getAllOrders,
  getActiveRentals,
  getRevenueReport,
};
