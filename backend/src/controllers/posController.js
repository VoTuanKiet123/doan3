const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Court = require("../models/Court");
const Transaction = require("../models/Transaction");
const ShiftReport = require("../models/ShiftReport");
const ServiceOrder = require("../models/ServiceOrder");
const Product = require("../models/Product");
const CancellationPolicy = require("../models/CancellationPolicy");
const { getPriceForBooking } = require("../services/pricingService");
const Maintenance = require("../models/Maintenance");

// ============ HELPERS ============

const getVietnamTime = () => {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }),
  );
};

const todayStr = () => {
  const d = getVietnamTime();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const validateTimeSlot = (startTime, endTime) => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
    return {
      valid: false,
      message: "Định dạng thời gian không hợp lệ (HH:mm)",
    };
  }
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  if (eh * 60 + em <= sh * 60 + sm) {
    return { valid: false, message: "Giờ kết thúc phải sau giờ bắt đầu" };
  }
  const OPEN = 6 * 60;
  const CLOSE = 22 * 60;
  if (sh * 60 + sm < OPEN || eh * 60 + em > CLOSE) {
    return {
      valid: false,
      message: "Thời gian đặt sân phải trong giờ 06:00 - 22:00",
    };
  }
  return { valid: true, startMin: sh * 60 + sm, endMin: eh * 60 + em };
};

// ============================================================
//  CASE 1: TRA CỨU BOOKING
// ============================================================

// @desc    Tra cứu booking theo SĐT/tên/mã (POS)
// @route   GET /api/pos/bookings/search
const searchBookings = async (req, res) => {
  try {
    const { q, date } = req.query;
    if (!q || q.trim().length < 2) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Vui lòng nhập ít nhất 2 ký tự để tìm kiếm",
        });
    }

    const searchRegex = new RegExp(q.trim(), "i");
    const searchDate = date || todayStr();

    // Tìm theo SĐT, tên khách, hoặc _id (mã booking)
    let objectIdQuery = null;
    if (mongoose.Types.ObjectId.isValid(q)) {
      objectIdQuery = { _id: q };
    }

    const orConditions = [
      { customerPhone: searchRegex },
      { "user.name": searchRegex },
    ];
    if (objectIdQuery) {
      orConditions.push(objectIdQuery);
    }

    // Populate user để tìm theo tên
    const bookings = await Booking.find({
      $or: [
        { customerPhone: searchRegex },
        { _id: objectIdQuery || undefined },
      ].filter(Boolean),
      ...(date ? { date: searchDate } : {}),
      status: { $nin: ["cancelled"] },
    })
      .populate("user", "name email phone")
      .populate("court", "name type")
      .populate("createdBy", "name")
      .sort({ startTime: 1 })
      .limit(20);

    // Tìm thêm theo tên user (cần populate trước)
    if (bookings.length === 0) {
      const byName = await Booking.find({
        ...(date ? { date: searchDate } : {}),
        status: { $nin: ["cancelled"] },
      })
        .populate("user", "name email phone")
        .populate("court", "name type")
        .populate("createdBy", "name")
        .sort({ startTime: 1 });

      const filtered = byName.filter(
        (b) => b.user && b.user.name && searchRegex.test(b.user.name),
      );
      return res.json({
        success: true,
        count: filtered.length,
        bookings: filtered.slice(0, 20),
      });
    }

    res.json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
//  CASE 1: CHECK-IN KHÁCH ĐÃ ĐẶT
// ============================================================

// @desc    POS Staff check-in khách đã đặt trước
// @route   PUT /api/pos/bookings/:id/checkin
const posCheckIn = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("user", "name phone")
      .populate("court", "name pricePerHour")
      .session(session);

    if (!booking) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy booking" });
    }

    // Chỉ admin hoặc pos_staff được check-in tại quầy
    if (req.user.role !== "admin" && req.user.role !== "pos_staff") {
      await session.abortTransaction();
      return res
        .status(403)
        .json({ success: false, message: "Không có quyền thực hiện" });
    }

    // Cho phép check-in khi status = pending (chưa thanh toán) hoặc confirmed (đã thanh toán)
    if (!["pending", "confirmed"].includes(booking.status)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Không thể check-in. Trạng thái hiện tại: ${booking.status}`,
      });
    }

    if (booking.checkedIn) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ success: false, message: "Booking này đã được check-in" });
    }

    // Nếu đang pending (chưa thanh toán): thu tiền tại quầy trước khi check-in
    let transaction = null;
    if (booking.status === "pending" || booking.paymentStatus === "unpaid") {
      const { paymentMethod } = req.body;
      if (!paymentMethod) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Vui lòng chọn phương thức thanh toán (cash/transfer)",
        });
      }

      // Tạo transaction thu tiền
      transaction = await Transaction.create(
        [
          {
            type: "booking_payment",
            amount: booking.totalPrice,
            paymentMethod,
            booking: booking._id,
            customer: booking.user?._id || null,
            customerName: booking.user?.name || "Khách vãng lai",
            customerPhone: booking.customerPhone || booking.user?.phone || "",
            staff: req.user._id,
            staffName: req.user.name,
            description: `Thu tiền đặt sân ${booking.court?.name} ngày ${booking.date} ${booking.startTime}-${booking.endTime}`,
          },
        ],
        { session },
      );

      booking.paymentStatus = "paid";
      booking.status = "confirmed";
    }

    // Thực hiện check-in
    booking.checkedIn = true;
    booking.checkedInAt = getVietnamTime();
    booking.checkedInBy = req.user._id;
    booking.status = "checked_in";

    await booking.save({ session });

    // Cập nhật shift nếu có
    if (req.body.shiftId) {
      await ShiftReport.findByIdAndUpdate(
        req.body.shiftId,
        {
          $inc: {
            bookingCount: 1,
            totalCashIn:
              transaction?.paymentMethod === "cash" ? booking.totalPrice : 0,
            totalTransferIn:
              transaction?.paymentMethod === "transfer"
                ? booking.totalPrice
                : 0,
          },
        },
        { session },
      );
    }

    await session.commitTransaction();

    const populated = await Booking.findById(booking._id)
      .populate("user", "name email phone")
      .populate("court", "name type")
      .populate("checkedInBy", "name");

    res.json({
      success: true,
      message: "Check-in thành công!",
      booking: populated,
      transaction,
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

// ============================================================
//  CASE 2: WALK-IN – ĐẶT & CHECK-IN GỘP
// ============================================================

// @desc    Tạo booking walk-in + check-in ngay (POS)
// @route   POST /api/pos/bookings/walkin
const createWalkInBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      courtId,
      date,
      startTime,
      endTime,
      customerName,
      customerPhone,
      paymentMethod,
      note,
    } = req.body;

    if (!courtId || !date || !startTime || !endTime || !paymentMethod) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message:
          "Vui lòng cung cấp đầy đủ: courtId, date, startTime, endTime, paymentMethod",
      });
    }

    // Validate sân
    const court = await Court.findById(courtId).session(session);
    if (!court) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy sân" });
    }
    if (court.status !== "active") {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ success: false, message: "Sân hiện không khả dụng" });
    }

    // Validate khung giờ
    const timeCheck = validateTimeSlot(startTime, endTime);
    if (!timeCheck.valid) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ success: false, message: timeCheck.message });
    }

    // Kiểm tra trùng lịch
    const conflict = await Booking.findOne({
      court: courtId,
      date,
      status: { $nin: ["cancelled", "no_show"] },
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    }).session(session);

    if (conflict) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Sân đã có người đặt trong khung giờ này",
      });
    }

    // Kiểm tra bảo trì
    const maintConflict = await Maintenance.findOne({
      court: courtId,
      status: { $in: ["pending", "in_progress"] },
      startDate: { $lte: date },
      endDate: { $gte: date },
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    }).session(session);

    if (maintConflict) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Sân đang trong thời gian bảo trì (${maintConflict.startTime}-${maintConflict.endTime})`,
      });
    }

    // Tính giá
    const priceResult = await getPriceForBooking(
      court.pricePerHour,
      date,
      startTime,
      endTime,
    );

    // Tạo booking walk-in
    const booking = await Booking.create(
      [
        {
          user: req.user._id, // Tạm gán user là staff (sẽ có thể gán customer sau)
          court: courtId,
          bookingType: "walk-in",
          date,
          startTime,
          endTime,
          totalPrice: priceResult.totalPrice,
          priceBreakdown: priceResult.breakdown,
          customerPhone: customerPhone || "",
          createdBy: req.user._id,
          note: note || "",
          staffNote: customerName ? `Khách: ${customerName}` : "",
          status: "checked_in", // Walk-in: đặt & check-in luôn
          paymentStatus: "paid",
          checkedIn: true,
          checkedInAt: getVietnamTime(),
          checkedInBy: req.user._id,
        },
      ],
      { session },
    );

    // Tạo transaction thu tiền
    const transaction = await Transaction.create(
      [
        {
          type: "booking_payment",
          amount: priceResult.totalPrice,
          paymentMethod,
          booking: booking[0]._id,
          customerName: customerName || "Khách vãng lai",
          customerPhone: customerPhone || "",
          staff: req.user._id,
          staffName: req.user.name,
          description: `Walk-in: ${court.name} ${date} ${startTime}-${endTime}${customerName ? ` - ${customerName}` : ""}`,
        },
      ],
      { session },
    );

    // Cập nhật shift
    if (req.body.shiftId) {
      await ShiftReport.findByIdAndUpdate(
        req.body.shiftId,
        {
          $inc: {
            walkInCount: 1,
            bookingCount: 1,
            totalCashIn: paymentMethod === "cash" ? priceResult.totalPrice : 0,
            totalTransferIn:
              paymentMethod === "transfer" ? priceResult.totalPrice : 0,
          },
        },
        { session },
      );
    }

    await session.commitTransaction();

    const populated = await Booking.findById(booking[0]._id)
      .populate("court", "name type")
      .populate("createdBy", "name")
      .populate("checkedInBy", "name");

    res.status(201).json({
      success: true,
      message: "Tạo booking walk-in & check-in thành công!",
      booking: populated,
      transaction,
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

// ============================================================
//  CASE 3: HUỶ LỊCH & HOÀN TIỀN (CANCELLATION & REFUND)
// ============================================================

// @desc    Lấy chính sách hủy hiện tại
// @route   GET /api/pos/cancellation-policy
const getCancellationPolicy = async (req, res) => {
  try {
    const policy = await CancellationPolicy.findOne({ isActive: true }).sort({
      createdAt: -1,
    });
    if (!policy) {
      // Trả về policy mặc định
      return res.json({
        success: true,
        policy: {
          name: "Mặc định",
          rules: [
            { hoursBefore: 24, refundPercent: 100 },
            { hoursBefore: 2, refundPercent: 50 },
            { hoursBefore: 0, refundPercent: 0 },
          ],
          noShowMinutes: 15,
        },
      });
    }
    res.json({ success: true, policy });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Huỷ booking & hoàn tiền theo policy (POS)
// @route   PUT /api/pos/bookings/:id/cancel
const posCancelBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("court", "name")
      .populate("user", "name phone")
      .session(session);

    if (!booking) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy booking" });
    }

    if (["cancelled"].includes(booking.status)) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ success: false, message: "Booking đã bị huỷ trước đó" });
    }

    // Lấy chính sách hủy
    const policy = await CancellationPolicy.findOne({ isActive: true })
      .sort({ createdAt: -1 })
      .session(session);

    // Tính % hoàn tiền dựa trên thời gian huỷ so với giờ đặt
    const now = getVietnamTime();
    const bookingDateTime = new Date(`${booking.date}T${booking.startTime}:00`);
    // Convert to Vietnam time
    const bookingVN = new Date(
      bookingDateTime.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }),
    );
    const hoursUntilBooking =
      (bookingVN.getTime() - now.getTime()) / (1000 * 60 * 60);

    let refundPercent = 0;
    if (policy && policy.rules && policy.rules.length > 0) {
      // Rules sorted by hoursBefore descending
      const sortedRules = [...policy.rules].sort(
        (a, b) => b.hoursBefore - a.hoursBefore,
      );
      for (const rule of sortedRules) {
        if (hoursUntilBooking >= rule.hoursBefore) {
          refundPercent = rule.refundPercent;
          break;
        }
      }
    } else {
      // Default policy
      if (hoursUntilBooking >= 24) refundPercent = 100;
      else if (hoursUntilBooking >= 2) refundPercent = 50;
      else refundPercent = 0;
    }

    const refundAmount = Math.round((booking.totalPrice * refundPercent) / 100);
    const { reason, paymentMethod } = req.body;

    // Cập nhật booking
    booking.status = "cancelled";
    booking.paymentStatus =
      refundPercent === 100 ? "refunded" : "partially_refunded";
    booking.staffNote =
      (booking.staffNote || "") +
      ` | Huỷ bởi ${req.user.name}: ${reason || "Không có lý do"} | Hoàn ${refundPercent}% = ${refundAmount.toLocaleString()}đ`;
    await booking.save({ session });

    // Tạo transaction refund nếu có hoàn tiền
    let refundTransaction = null;
    if (refundAmount > 0) {
      refundTransaction = await Transaction.create(
        [
          {
            type: "refund",
            amount: -refundAmount,
            paymentMethod: paymentMethod || "cash",
            booking: booking._id,
            customer: booking.user?._id || null,
            customerName: booking.user?.name || "Khách",
            customerPhone: booking.customerPhone || booking.user?.phone || "",
            staff: req.user._id,
            staffName: req.user.name,
            description: `Hoàn ${refundPercent}% (${refundAmount.toLocaleString()}đ) huỷ booking ${booking.court?.name} ${booking.date} ${booking.startTime}. Lý do: ${reason || "Không có"}`,
          },
        ],
        { session },
      );
    }

    // Cập nhật shift nếu có
    if (req.body.shiftId) {
      await ShiftReport.findByIdAndUpdate(
        req.body.shiftId,
        {
          $inc: {
            refundCount: 1,
            totalCashOut:
              refundAmount > 0 && (paymentMethod || "cash") === "cash"
                ? refundAmount
                : 0,
          },
        },
        { session },
      );
    }

    await session.commitTransaction();

    res.json({
      success: true,
      message: `Đã huỷ booking. Hoàn ${refundPercent}% (${refundAmount.toLocaleString()}đ)`,
      booking,
      refundAmount,
      refundPercent,
      refundTransaction,
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

// @desc    Đánh dấu no-show (POS)
// @route   PUT /api/pos/bookings/:id/noshow
const markNoShow = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy booking" });
    }
    if (!["pending", "confirmed"].includes(booking.status)) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Không thể đánh dấu no-show cho trạng thái này",
        });
    }

    booking.status = "no_show";
    booking.staffNote =
      (booking.staffNote || "") +
      ` | No-show đánh dấu bởi ${req.user.name} lúc ${getVietnamTime().toISOString()}`;
    await booking.save();

    res.json({ success: true, message: "Đã đánh dấu no-show", booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
//  CASE 3: ĐỔI GIỜ (RESCHEDULE / SLOT SWAP)
// ============================================================

// @desc    Dời lịch sang khung giờ khác (POS)
// @route   PUT /api/pos/bookings/:id/reschedule
const rescheduleBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { newDate, newStartTime, newEndTime } = req.body;
    const booking = await Booking.findById(req.params.id)
      .populate("court", "name pricePerHour")
      .session(session);

    if (!booking) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy booking" });
    }

    if (["cancelled", "no_show"].includes(booking.status)) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({
          success: false,
          message: "Không thể dời lịch đã huỷ hoặc no-show",
        });
    }

    const targetDate = newDate || booking.date;
    const targetStart = newStartTime || booking.startTime;
    const targetEnd = newEndTime || booking.endTime;

    // Validate
    const timeCheck = validateTimeSlot(targetStart, targetEnd);
    if (!timeCheck.valid) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ success: false, message: timeCheck.message });
    }

    // Kiểm tra trùng lịch ở khung giờ mới (loại trừ chính booking này)
    const conflict = await Booking.findOne({
      _id: { $ne: booking._id },
      court: booking.court._id,
      date: targetDate,
      status: { $nin: ["cancelled", "no_show"] },
      startTime: { $lt: targetEnd },
      endTime: { $gt: targetStart },
    }).session(session);

    if (conflict) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Khung giờ mới đã có người đặt",
      });
    }

    // Tính lại giá nếu khung giờ thay đổi
    let newTotalPrice = booking.totalPrice;
    let newPriceBreakdown = booking.priceBreakdown;

    if (
      newStartTime !== booking.startTime ||
      newEndTime !== booking.endTime ||
      newDate !== booking.date
    ) {
      const priceResult = await getPriceForBooking(
        booking.court.pricePerHour,
        targetDate,
        targetStart,
        targetEnd,
      );
      newTotalPrice = priceResult.totalPrice;
      newPriceBreakdown = priceResult.breakdown;
    }

    // Lưu log cũ
    const oldInfo = `${booking.date} ${booking.startTime}-${booking.endTime}`;
    booking.date = targetDate;
    booking.startTime = targetStart;
    booking.endTime = targetEnd;
    booking.totalPrice = newTotalPrice;
    booking.priceBreakdown = newPriceBreakdown;
    booking.staffNote =
      (booking.staffNote || "") +
      ` | Dời lịch từ ${oldInfo} → ${targetDate} ${targetStart}-${targetEnd} bởi ${req.user.name}`;
    await booking.save({ session });

    await session.commitTransaction();

    const populated = await Booking.findById(booking._id)
      .populate("court", "name type")
      .populate("user", "name phone");

    res.json({
      success: true,
      message: "Dời lịch thành công!",
      booking: populated,
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

// ============================================================
//  CASE 4: POS SALES (BÁN DỊCH VỤ NHANH)
// ============================================================

// @desc    Tạo đơn bán dịch vụ nhanh (POS)
// @route   POST /api/pos/service-orders
const createPosServiceOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { items, bookingId, paymentMethod, note } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ success: false, message: "Vui lòng chọn ít nhất 1 sản phẩm" });
    }
    if (!paymentMethod) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({
          success: false,
          message: "Vui lòng chọn phương thức thanh toán",
        });
    }

    // Build items & kiểm tra kho
    const orderItems = [];
    let subtotalAmount = 0;
    let totalDeposit = 0;

    for (const input of items) {
      const product = await Product.findById(input.product).session(session);
      if (!product) {
        await session.abortTransaction();
        return res
          .status(404)
          .json({
            success: false,
            message: `Sản phẩm ${input.product} không tồn tại`,
          });
      }
      if (!product.isActive) {
        await session.abortTransaction();
        return res
          .status(400)
          .json({
            success: false,
            message: `Sản phẩm "${product.name}" đã ngừng bán`,
          });
      }

      const quantity = input.quantity || 1;
      // Kiểm tra tồn kho (trừ rental)
      if (product.category !== "rental" && product.stockQuantity < quantity) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Sản phẩm "${product.name}" chỉ còn ${product.stockQuantity} trong kho`,
        });
      }

      const itemSubtotal = product.price * quantity;
      const itemDeposit = product.isRentable
        ? product.depositAmount * quantity
        : 0;

      orderItems.push({
        product: product._id,
        productName: product.name,
        productCategory: product.category,
        quantity,
        unitPrice: product.price,
        depositPerItem: product.isRentable ? product.depositAmount : 0,
        subtotal: itemSubtotal,
        rentalStatus: product.isRentable ? "in_use" : null,
      });

      subtotalAmount += itemSubtotal;
      totalDeposit += itemDeposit;

      // Trừ kho (trừ rental)
      if (product.category !== "rental") {
        const stockResult = await Product.findOneAndUpdate(
          { _id: product._id, stockQuantity: { $gte: quantity } },
          { $inc: { stockQuantity: -quantity } },
          { new: true, session },
        );
        if (!stockResult) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `Không thể trừ kho cho "${product.name}". Có thể đã hết hàng.`,
          });
        }
      }
      // Với rental: trừ stockQuantity nhưng vẫn giữ để theo dõi
      if (product.category === "rental" && product.stockQuantity > 0) {
        await Product.findByIdAndUpdate(
          product._id,
          { $inc: { stockQuantity: -quantity } },
          { session },
        );
      }
    }

    const totalAmount = subtotalAmount + totalDeposit;

    // Kiểm tra booking nếu có
    if (bookingId) {
      const booking = await Booking.findById(bookingId).session(session);
      if (!booking) {
        await session.abortTransaction();
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy booking" });
      }
    }

    // Tạo ServiceOrder
    const serviceOrder = await ServiceOrder.create(
      [
        {
          createdBy: req.user._id,
          createdByName: req.user.name,
          booking: bookingId || null,
          items: orderItems,
          subtotalAmount,
          totalDeposit,
          totalAmount,
          status: "paid",
          paymentMethod,
          paidAt: getVietnamTime(),
          orderType: "pos",
          note: note || "",
        },
      ],
      { session },
    );

    // Tạo transaction
    const transaction = await Transaction.create(
      [
        {
          type: "service_payment",
          amount: totalAmount,
          paymentMethod,
          serviceOrder: serviceOrder[0]._id,
          booking: bookingId || null,
          customer: req.body.customerId || null,
          staff: req.user._id,
          staffName: req.user.name,
          description: `Bán dịch vụ: ${orderItems.map((i) => `${i.productName} x${i.quantity}`).join(", ")}${totalDeposit > 0 ? ` (cọc: ${totalDeposit.toLocaleString()}đ)` : ""}`,
        },
      ],
      { session },
    );

    // Nếu có deposit, tạo thêm transaction deposit
    let depositTransaction = null;
    if (totalDeposit > 0) {
      depositTransaction = await Transaction.create(
        [
          {
            type: "deposit",
            amount: totalDeposit,
            paymentMethod,
            serviceOrder: serviceOrder[0]._id,
            booking: bookingId || null,
            staff: req.user._id,
            staffName: req.user.name,
            description: `Thu cọc thuê đồ: ${orderItems
              .filter((i) => i.depositPerItem > 0)
              .map((i) => `${i.productName} x${i.quantity}`)
              .join(", ")}`,
          },
        ],
        { session },
      );
    }

    // Cập nhật shift
    if (req.body.shiftId) {
      await ShiftReport.findByIdAndUpdate(
        req.body.shiftId,
        {
          $inc: {
            serviceOrderCount: 1,
            totalCashIn: paymentMethod === "cash" ? totalAmount : 0,
            totalTransferIn: paymentMethod === "transfer" ? totalAmount : 0,
          },
        },
        { session },
      );
    }

    await session.commitTransaction();

    const populated = await ServiceOrder.findById(serviceOrder[0]._id)
      .populate("items.product", "name category price unit")
      .populate("booking", "date startTime endTime court");

    res.status(201).json({
      success: true,
      message: "Tạo đơn dịch vụ thành công!",
      serviceOrder: populated,
      transaction,
      depositTransaction,
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

// @desc    Lấy danh sách sản phẩm bán chạy (POS quick select)
// @route   GET /api/pos/top-products
const getTopProducts = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true })
      .sort({ category: 1, name: 1 })
      .lean();

    // Nhóm theo danh mục để UI hiển thị nhanh
    const grouped = {
      drink: products.filter((p) => p.category === "drink"),
      snack: products.filter((p) => p.category === "snack"),
      consumable: products.filter((p) => p.category === "consumable"),
      rental: products.filter((p) => p.category === "rental"),
    };

    res.json({ success: true, products, grouped });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
//  SHIFT MANAGEMENT (ĐỐI SOÁT CA)
// ============================================================

// @desc    Mở ca làm việc
// @route   POST /api/pos/shifts/open
const openShift = async (req, res) => {
  try {
    const { openingCash } = req.body;
    if (openingCash === undefined || openingCash < 0) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Vui lòng nhập số tiền tồn quỹ đầu ca",
        });
    }

    // Kiểm tra đã có ca mở chưa
    const existingOpen = await ShiftReport.findOne({
      staff: req.user._id,
      status: "open",
    });

    if (existingOpen) {
      return res.status(400).json({
        success: false,
        message: "Bạn đã có ca đang mở. Vui lòng đóng ca trước khi mở ca mới.",
        existingShift: existingOpen,
      });
    }

    const shift = await ShiftReport.create({
      staff: req.user._id,
      staffName: req.user.name,
      shiftDate: todayStr(),
      openedAt: getVietnamTime(),
      openingCash,
      status: "open",
    });

    res.status(201).json({
      success: true,
      message: `Mở ca thành công! Ngày: ${todayStr()}`,
      shift,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Lấy ca hiện tại đang mở
// @route   GET /api/pos/shifts/current
const getCurrentShift = async (req, res) => {
  try {
    const shift = await ShiftReport.findOne({
      staff: req.user._id,
      status: "open",
    }).sort({ openedAt: -1 });

    if (!shift) {
      return res.json({
        success: true,
        shift: null,
        message: "Chưa có ca nào đang mở",
      });
    }

    // Tính expectedCash real-time
    const transactions = await Transaction.find({
      staff: req.user._id,
      createdAt: { $gte: shift.openedAt },
      status: "completed",
    });

    let cashIn = 0;
    let cashOut = 0;
    for (const txn of transactions) {
      if (txn.paymentMethod === "cash") {
        if (txn.amount > 0) cashIn += txn.amount;
        else cashOut += Math.abs(txn.amount);
      }
    }

    const expectedCash = shift.openingCash + cashIn - cashOut;

    // Cập nhật shift
    shift.totalCashIn = cashIn;
    shift.totalCashOut = cashOut;
    shift.expectedCash = expectedCash;

    res.json({
      success: true,
      shift: {
        ...shift.toObject(),
        expectedCash,
        cashIn,
        cashOut,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Đóng ca làm việc
// @route   PUT /api/pos/shifts/:id/close
const closeShift = async (req, res) => {
  try {
    const { closingCash, differenceNote } = req.body;
    if (closingCash === undefined || closingCash < 0) {
      return res
        .status(400)
        .json({ success: false, message: "Vui lòng nhập số tiền mặt thực tế" });
    }

    const shift = await ShiftReport.findById(req.params.id);
    if (!shift) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy ca làm việc" });
    }
    if (
      shift.staff.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Không có quyền đóng ca của người khác",
        });
    }
    if (shift.status !== "open") {
      return res
        .status(400)
        .json({ success: false, message: "Ca này đã được đóng trước đó" });
    }

    // Tính expected cash
    const transactions = await Transaction.find({
      staff: shift.staff,
      createdAt: { $gte: shift.openedAt },
      status: "completed",
    });

    let cashIn = 0;
    let cashOut = 0;
    let transferIn = 0;
    for (const txn of transactions) {
      if (txn.paymentMethod === "cash") {
        if (txn.amount > 0) cashIn += txn.amount;
        else cashOut += Math.abs(txn.amount);
      } else if (txn.paymentMethod === "transfer") {
        if (txn.amount > 0) transferIn += txn.amount;
      }
    }

    const expectedCash = shift.openingCash + cashIn - cashOut;
    const cashDifference = closingCash - expectedCash;

    // Đếm số lượng giao dịch
    const bookingCount = await Booking.countDocuments({
      createdBy: shift.staff,
      createdAt: { $gte: shift.openedAt, $lte: new Date() },
    });
    const walkInCount = await Booking.countDocuments({
      createdBy: shift.staff,
      bookingType: "walk-in",
      createdAt: { $gte: shift.openedAt, $lte: new Date() },
    });
    const serviceOrderCount = await ServiceOrder.countDocuments({
      createdBy: shift.staff,
      createdAt: { $gte: shift.openedAt, $lte: new Date() },
    });
    const refundCount = await Transaction.countDocuments({
      staff: shift.staff,
      type: "refund",
      createdAt: { $gte: shift.openedAt, $lte: new Date() },
    });

    shift.closingCash = closingCash;
    shift.expectedCash = expectedCash;
    shift.cashDifference = cashDifference;
    shift.differenceNote = differenceNote || "";
    shift.totalCashIn = cashIn;
    shift.totalCashOut = cashOut;
    shift.totalTransferIn = transferIn;
    shift.bookingCount = bookingCount;
    shift.walkInCount = walkInCount;
    shift.serviceOrderCount = serviceOrderCount;
    shift.refundCount = refundCount;
    shift.closedAt = getVietnamTime();
    shift.status = "closed";
    await shift.save();

    res.json({
      success: true,
      message: "Đóng ca thành công!",
      shift: {
        ...shift.toObject(),
        expectedCash,
        cashDifference,
        isBalanced: cashDifference === 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Lấy lịch sử ca làm việc
// @route   GET /api/pos/shifts/history
const getShiftHistory = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === "pos_staff") {
      filter.staff = req.user._id;
    }
    const shifts = await ShiftReport.find(filter)
      .sort({ openedAt: -1 })
      .limit(30)
      .populate("staff", "name email");
    res.json({ success: true, count: shifts.length, shifts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
//  SƠ ĐỒ SÂN (COURT STATUS OVERVIEW)
// ============================================================

// @desc    Lấy trạng thái tổng quan các sân (POS dashboard)
// @route   GET /api/pos/courts-status
const getCourtsStatus = async (req, res) => {
  try {
    const courts = await Court.find().sort({ name: 1 }).lean();
    const date = req.query.date || todayStr();
    const now = getVietnamTime();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    // Lấy tất cả booking active hôm nay
    const activeBookings = await Booking.find({
      date,
      status: { $in: ["confirmed", "checked_in", "pending"] },
    })
      .populate("user", "name phone")
      .populate("checkedInBy", "name")
      .lean();

    // Lấy bảo trì active
    const activeMaintenances = await Maintenance.find({
      status: { $in: ["pending", "in_progress"] },
      startDate: { $lte: date },
      endDate: { $gte: date },
    }).lean();

    const result = courts.map((court) => {
      const courtBookings = activeBookings.filter(
        (b) => b.court.toString() === court._id.toString(),
      );
      const courtMaintenances = activeMaintenances.filter(
        (m) => m.court.toString() === court._id.toString(),
      );

      // Xác định trạng thái hiện tại
      let currentStatus = "available"; // Trống
      let currentBooking = null;

      // Kiểm tra bảo trì
      for (const maint of courtMaintenances) {
        if (currentTime >= maint.startTime && currentTime < maint.endTime) {
          currentStatus = "maintenance";
          break;
        }
      }

      // Kiểm tra booking
      if (currentStatus !== "maintenance") {
        for (const booking of courtBookings) {
          if (
            currentTime >= booking.startTime &&
            currentTime < booking.endTime
          ) {
            if (booking.status === "checked_in") {
              currentStatus = "in_use";
            } else if (
              booking.status === "confirmed" ||
              booking.status === "pending"
            ) {
              currentStatus = "reserved";
            }
            currentBooking = booking;
            break;
          }
        }
      }

      // Đếm booking sắp tới
      const upcomingBookings = courtBookings.filter(
        (b) => b.startTime > currentTime && b.status !== "cancelled",
      );

      return {
        ...court,
        currentStatus,
        currentBooking,
        upcomingCount: upcomingBookings.length,
        totalBookingsToday: courtBookings.length,
        maintenanceCount: courtMaintenances.length,
      };
    });

    res.json({ success: true, date, currentTime, courts: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Lấy danh sách transaction trong ca hiện tại
// @route   GET /api/pos/transactions
const getShiftTransactions = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === "pos_staff") {
      filter.staff = req.user._id;
    }
    if (req.query.shiftId) {
      filter.shift = req.query.shiftId;
    }
    if (req.query.type) {
      filter.type = req.query.type;
    }

    const transactions = await Transaction.find(filter)
      .populate("booking", "date startTime endTime court")
      .populate("serviceOrder", "orderNumber totalAmount")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, count: transactions.length, transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  searchBookings,
  posCheckIn,
  createWalkInBooking,
  getCancellationPolicy,
  posCancelBooking,
  markNoShow,
  rescheduleBooking,
  createPosServiceOrder,
  getTopProducts,
  openShift,
  getCurrentShift,
  closeShift,
  getShiftHistory,
  getCourtsStatus,
  getShiftTransactions,
};
