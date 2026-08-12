const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Court = require("../models/Court");
const Transaction = require("../models/Transaction");
const ShiftReport = require("../models/ShiftReport");
const SystemSettings = require("../models/SystemSettings");
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
      return res.status(400).json({
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
//  CASE 1: CHECK-IN KHÁCH ĐÃ ĐẶT (MỞ PHIÊN - KHÔNG THU TIỀN)
// ============================================================

// @desc    POS Staff check-in khách đã đặt trước (mở phiên, chưa thanh toán)
// @route   PUT /api/pos/bookings/:id/checkin
const posCheckIn = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("user", "name phone")
      .populate("court", "name pricePerHour");

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy booking" });
    }

    // Chỉ admin hoặc pos_staff được check-in tại quầy
    if (req.user.role !== "admin" && req.user.role !== "pos_staff") {
      return res
        .status(403)
        .json({ success: false, message: "Không có quyền thực hiện" });
    }

    // Cho phép check-in khi status = pending hoặc confirmed
    if (!["pending", "confirmed"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Không thể check-in. Trạng thái hiện tại: ${booking.status}`,
      });
    }

    if (booking.checkedIn) {
      return res
        .status(400)
        .json({ success: false, message: "Booking này đã được check-in" });
    }

    // === MÔ HÌNH MỚI: Check-in = mở phiên, CHƯA thanh toán ===
    booking.checkedIn = true;
    booking.checkedInAt = getVietnamTime();
    booking.checkedInBy = req.user._id;
    booking.status = "checked_in";
    booking.paymentStatus = "unpaid"; // Luôn unpaid khi check-in

    await booking.save();

    // Cập nhật shift nếu có (chỉ tăng bookingCount, KHÔNG cộng tiền)
    if (req.body.shiftId) {
      await ShiftReport.findByIdAndUpdate(req.body.shiftId, {
        $inc: { bookingCount: 1 },
      });
    }

    const populated = await Booking.findById(booking._id)
      .populate("user", "name email phone")
      .populate("court", "name type")
      .populate("checkedInBy", "name");

    res.json({
      success: true,
      message: "Mở phiên thành công! Khách đã vào sân.",
      booking: populated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
//  CASE 2: WALK-IN – TẠO PHIÊN (MỞ TAB, CHƯA THANH TOÁN)
// ============================================================

// @desc    Tạo booking walk-in + check-in ngay (POS) – Mô hình mới: mở phiên, chưa thu tiền
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
      note,
    } = req.body;

    if (!courtId || !date || !startTime || !endTime) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp đầy đủ: courtId, date, startTime, endTime",
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
      status: { $nin: ["cancelled", "no_show", "checked_out"] },
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

    // === MÔ HÌNH MỚI: Tạo phiên checked_in + unpaid, thanh toán khi check-out ===
    const booking = await Booking.create(
      [
        {
          user: req.user._id,
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
          staffNote: customerName ? `Khách: ${customerName}` : "Khách vãng lai",
          status: "checked_in", // Mở phiên ngay
          paymentStatus: "unpaid", // Chưa thanh toán
          checkedIn: true,
          checkedInAt: getVietnamTime(),
          checkedInBy: req.user._id,
        },
      ],
      { session },
    );

    // Cập nhật shift (chỉ tăng count, KHÔNG cộng tiền)
    if (req.body.shiftId) {
      await ShiftReport.findByIdAndUpdate(
        req.body.shiftId,
        {
          $inc: { walkInCount: 1, bookingCount: 1 },
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
      message: `Mở phiên walk-in thành công! ${court.name} - ${customerName || "Khách vãng lai"}`,
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
//  CASE 2B: CHECK-OUT – KẾT PHIÊN & THANH TOÁN TỔNG
// ============================================================

// @desc    Lấy danh sách dịch vụ của 1 booking (để hiển thị giỏ hàng phiên)
// @route   GET /api/pos/bookings/:id/services
const getBookingServices = async (req, res) => {
  try {
    const serviceOrders = await ServiceOrder.find({
      booking: req.params.id,
      status: { $ne: "cancelled" },
    })
      .populate("items.product", "name category price unit")
      .populate("createdBy", "name")
      .sort({ createdAt: 1 });

    res.json({ success: true, count: serviceOrders.length, serviceOrders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Thêm dịch vụ vào phiên đang check-in (không thu tiền ngay)
// @route   POST /api/pos/bookings/:id/services
const addServiceToBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const booking = await Booking.findById(req.params.id).session(session);
    if (!booking) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy booking" });
    }
    if (booking.status !== "checked_in") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Chỉ có thể thêm dịch vụ khi phiên đang mở (checked_in)",
      });
    }

    const { items, note } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ success: false, message: "Vui lòng chọn ít nhất 1 sản phẩm" });
    }

    // Build items & kiểm tra kho
    const orderItems = [];
    let subtotalAmount = 0;
    let totalDeposit = 0;

    for (const input of items) {
      const product = await Product.findById(input.product).session(session);
      if (!product) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: `Sản phẩm ${input.product} không tồn tại`,
        });
      }
      if (!product.isActive) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Sản phẩm "${product.name}" đã ngừng bán`,
        });
      }

      const quantity = input.quantity || 1;
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

      // Trừ kho
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
      if (product.category === "rental" && product.stockQuantity > 0) {
        await Product.findByIdAndUpdate(
          product._id,
          { $inc: { stockQuantity: -quantity } },
          { session },
        );
      }
    }

    const totalAmount = subtotalAmount + totalDeposit;

    // Tạo ServiceOrder với status "pending" (chưa thanh toán, sẽ thanh toán khi check-out)
    const serviceOrder = await ServiceOrder.create(
      [
        {
          createdBy: req.user._id,
          createdByName: req.user.name,
          booking: booking._id,
          items: orderItems,
          subtotalAmount,
          totalDeposit,
          totalAmount,
          status: "pending", // Chờ thanh toán khi check-out
          paymentMethod: null,
          orderType: "booking",
          note: note || "",
        },
      ],
      { session },
    );

    await session.commitTransaction();

    const populated = await ServiceOrder.findById(serviceOrder[0]._id)
      .populate("items.product", "name category price unit")
      .populate("booking", "date startTime endTime court");

    res.status(201).json({
      success: true,
      message: `Đã thêm ${orderItems.length} món vào phiên`,
      serviceOrder: populated,
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

// @desc    Check-out: kết phiên, tính tổng bill, thu tiền 1 lần
// @route   PUT /api/pos/bookings/:id/checkout
const posCheckOut = async (req, res) => {
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

    if (booking.status !== "checked_in") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Không thể check-out. Trạng thái hiện tại: ${booking.status}. Chỉ check-out được phiên đang mở (checked_in).`,
      });
    }

    const {
      paymentMethod,
      paymentMethod2,
      splitAmount,
      rentalReturns,
      cancelMidSession,
      cancelReason,
      shiftId,
      note,
    } = req.body;

    if (!paymentMethod) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn phương thức thanh toán",
      });
    }

    // ============ 1. TÍNH TIỀN SÂN ============
    const now = getVietnamTime();
    let courtFee = 0;
    let overtimeFee = 0;
    let overtimeMinutes = 0;

    if (cancelMidSession) {
      // Khách hủy giữa chừng: tính phí theo chính sách riêng
      courtFee = 0; // Có thể cấu hình phí hủy giữa chừng sau
    } else if (booking.paymentStatus === "unpaid") {
      // Chưa trả trước: tính tiền sân
      courtFee = booking.totalPrice;

      // Tính phụ thu chơi quá giờ (over-time)
      const [eh, em] = booking.endTime.split(":").map(Number);
      const endMin = eh * 60 + em;
      const curMin = now.getHours() * 60 + now.getMinutes();

      if (curMin > endMin) {
        overtimeMinutes = curMin - endMin;
        // Phụ thu: tính theo giá giờ của sân, làm tròn lên 30 phút
        const overtimeBlocks = Math.ceil(overtimeMinutes / 30);
        const hourlyRate = booking.court?.pricePerHour || 100000;
        overtimeFee = Math.round(hourlyRate * (overtimeBlocks * 0.5));
      }
    }
    // Nếu đã trả trước (paymentStatus = paid trước đó): courtFee = 0 (chỉ hiển thị đối chiếu)

    // ============ 2. TÍNH TIỀN DỊCH VỤ ============
    const serviceOrders = await ServiceOrder.find({
      booking: booking._id,
      status: "pending",
    }).session(session);

    let totalServiceFee = 0;
    let totalDeposit = 0;
    const allServiceOrderIds = serviceOrders.map((so) => so._id);

    for (const so of serviceOrders) {
      totalServiceFee += so.subtotalAmount;
      totalDeposit += so.totalDeposit;
    }

    // ============ 3. XỬ LÝ CỌC THIẾT BỊ THUÊ ============
    let depositReturned = totalDeposit;
    let depositDeducted = 0;

    if (rentalReturns && Array.isArray(rentalReturns)) {
      for (const ret of rentalReturns) {
        // ret: { orderId, itemId, status: 'returned_good'|'returned_damaged'|'lost', damageFee, note }
        const order = serviceOrders.find(
          (so) => so._id.toString() === ret.orderId,
        );
        if (!order) continue;

        const item = order.items.id(ret.itemId);
        if (!item) continue;

        if (ret.status === "returned_good") {
          item.rentalStatus = "returned_good";
          item.rentalReturnedAt = now;
          // Hoàn cọc cho món này
        } else if (ret.status === "returned_damaged") {
          item.rentalStatus = "returned_damaged";
          item.rentalReturnedAt = now;
          item.rentalDamageFee = ret.damageFee || 0;
          item.rentalNote = ret.note || "";
          // Trừ cọc
          const deductAmount = Math.min(
            item.depositPerItem * item.quantity,
            ret.damageFee || item.depositPerItem * item.quantity,
          );
          depositReturned -= deductAmount;
          depositDeducted += deductAmount;
        } else if (ret.status === "lost") {
          item.rentalStatus = "lost";
          item.rentalReturnedAt = now;
          item.rentalDamageFee = item.depositPerItem * item.quantity;
          item.rentalNote = ret.note || "Mất đồ";
          depositReturned -= item.depositPerItem * item.quantity;
          depositDeducted += item.depositPerItem * item.quantity;
        }
      }

      // Lưu các service orders đã cập nhật rental status
      for (const so of serviceOrders) {
        await so.save({ session });
      }
    }

    // ============ 4. TỔNG BILL CUỐI ============
    const finalBillAmount =
      courtFee + overtimeFee + totalServiceFee - depositReturned;

    // ============ 5. TẠO TRANSACTION & THANH TOÁN ============
    const transactions = [];

    // Nếu bill > 0 mới tạo transaction
    if (finalBillAmount > 0) {
      // Hỗ trợ thanh toán tách: 1 phần cash + 1 phần transfer
      let remaining = finalBillAmount;

      if (
        paymentMethod2 &&
        splitAmount &&
        splitAmount > 0 &&
        splitAmount < finalBillAmount
      ) {
        // Phần 1: method 1
        const amount1 = finalBillAmount - splitAmount;
        if (amount1 > 0) {
          const txn1 = await Transaction.create(
            [
              {
                type: "booking_payment",
                amount: amount1,
                paymentMethod,
                booking: booking._id,
                customer: booking.user?._id || null,
                customerName: booking.user?.name || "Khách",
                customerPhone:
                  booking.customerPhone || booking.user?.phone || "",
                staff: req.user._id,
                staffName: req.user.name,
                shift: shiftId || null,
                description: `Check-out: ${booking.court?.name} ${booking.date} (${paymentMethod}) - Tiền sân + dịch vụ`,
              },
            ],
            { session },
          );
          transactions.push(txn1[0]);
          remaining -= amount1;
        }
        // Phần 2: method 2
        if (remaining > 0) {
          const txn2 = await Transaction.create(
            [
              {
                type: "booking_payment",
                amount: remaining,
                paymentMethod: paymentMethod2,
                booking: booking._id,
                customer: booking.user?._id || null,
                customerName: booking.user?.name || "Khách",
                customerPhone:
                  booking.customerPhone || booking.user?.phone || "",
                staff: req.user._id,
                staffName: req.user.name,
                shift: shiftId || null,
                description: `Check-out: ${booking.court?.name} ${booking.date} (${paymentMethod2}) - Tiền sân + dịch vụ`,
              },
            ],
            { session },
          );
          transactions.push(txn2[0]);
        }
      } else {
        const txn = await Transaction.create(
          [
            {
              type: "booking_payment",
              amount: finalBillAmount,
              paymentMethod,
              booking: booking._id,
              customer: booking.user?._id || null,
              customerName: booking.user?.name || "Khách",
              customerPhone: booking.customerPhone || booking.user?.phone || "",
              staff: req.user._id,
              staffName: req.user.name,
              shift: shiftId || null,
              description: `Check-out: ${booking.court?.name} ${booking.date} - ${overtimeMinutes > 0 ? `(Phụ thu quá giờ ${overtimeMinutes}ph: +${overtimeFee.toLocaleString()}đ) ` : ""}Tiền sân + dịch vụ`,
            },
          ],
          { session },
        );
        transactions.push(txn[0]);
      }

      // Nếu có hoàn cọc, tạo transaction deposit_return
      if (depositReturned > 0) {
        await Transaction.create(
          [
            {
              type: "deposit_return",
              amount: -depositReturned,
              paymentMethod,
              booking: booking._id,
              customer: booking.user?._id || null,
              customerName: booking.user?.name || "Khách",
              staff: req.user._id,
              staffName: req.user.name,
              shift: shiftId || null,
              description: `Hoàn cọc thuê đồ: ${depositReturned.toLocaleString()}đ`,
            },
          ],
          { session },
        );
      }
    }

    // ============ 6. CẬP NHẬT BOOKING ============
    booking.status = "checked_out";
    booking.paymentStatus = "paid";
    booking.checkedOutAt = now;
    booking.checkedOutBy = req.user._id;
    booking.checkoutNote = cancelMidSession
      ? `Hủy giữa chừng: ${cancelReason || "Không có lý do"}`
      : note || "";
    booking.actualCourtFee = courtFee + overtimeFee;
    booking.totalServiceFee = totalServiceFee;
    booking.depositReturned = depositReturned;
    booking.depositDeducted = depositDeducted;
    booking.finalBillAmount = finalBillAmount;

    await booking.save({ session });

    // ============ 7. CẬP NHẬT SERVICE ORDERS → PAID ============
    await ServiceOrder.updateMany(
      { _id: { $in: allServiceOrderIds } },
      {
        $set: {
          status: "paid",
          paymentMethod,
          paidAt: now,
        },
      },
      { session },
    );

    // ============ 8. CẬP NHẬT SHIFT (Imprest: cashRevenue, cashRefundOut) ============
    if (shiftId) {
      let cashRevenue = 0;
      let transferIn = 0;
      for (const txn of transactions) {
        if (txn.paymentMethod === "cash" && txn.amount > 0)
          cashRevenue += txn.amount;
        else if (txn.paymentMethod === "transfer") transferIn += txn.amount;
      }
      if (cashRevenue > 0 || transferIn > 0) {
        await ShiftReport.findByIdAndUpdate(
          shiftId,
          {
            $inc: {
              cashRevenue: cashRevenue,
              totalTransferIn: transferIn,
            },
          },
          { session },
        );
      }
    }

    await session.commitTransaction();

    const populated = await Booking.findById(booking._id)
      .populate("user", "name email phone")
      .populate("court", "name type")
      .populate("checkedInBy", "name")
      .populate("checkedOutBy", "name");

    res.json({
      success: true,
      message: cancelMidSession
        ? "Đã kết thúc phiên (hủy giữa chừng)"
        : "Check-out thành công! Đã thu tiền & kết phiên.",
      booking: populated,
      bill: {
        courtFee,
        overtimeFee,
        overtimeMinutes,
        totalServiceFee,
        totalDeposit,
        depositReturned,
        depositDeducted,
        finalBillAmount,
      },
      transactions,
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

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

    // Cập nhật shift nếu có (Imprest: cashRefundOut)
    if (req.body.shiftId) {
      await ShiftReport.findByIdAndUpdate(
        req.body.shiftId,
        {
          $inc: {
            refundCount: 1,
            cashRefundOut:
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
      return res.status(400).json({
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
      return res.status(400).json({
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
      status: { $nin: ["cancelled", "no_show", "checked_out"] },
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
//          - Nếu gắn với booking đang checked_in: order "pending", thanh toán khi check-out
//          - Nếu không gắn booking (bán tại quầy): order "paid" ngay
// @route   POST /api/pos/service-orders
const createPosServiceOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { items, bookingId, paymentMethod, note, shiftId } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ success: false, message: "Vui lòng chọn ít nhất 1 sản phẩm" });
    }

    // Kiểm tra booking nếu có
    let linkedBooking = null;
    let isLinkedToCheckedIn = false;
    if (bookingId) {
      linkedBooking = await Booking.findById(bookingId).session(session);
      if (!linkedBooking) {
        await session.abortTransaction();
        return res
          .status(404)
          .json({ success: false, message: "Không tìm thấy booking" });
      }
      // Nếu booking đang checked_in, dịch vụ sẽ được cộng dồn, thanh toán khi check-out
      if (linkedBooking.status === "checked_in") {
        isLinkedToCheckedIn = true;
      }
    }

    // Nếu không gắn booking checked_in thì bắt buộc phải có paymentMethod
    if (!isLinkedToCheckedIn && !paymentMethod) {
      await session.abortTransaction();
      return res.status(400).json({
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
        return res.status(404).json({
          success: false,
          message: `Sản phẩm ${input.product} không tồn tại`,
        });
      }
      if (!product.isActive) {
        await session.abortTransaction();
        return res.status(400).json({
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

    // Quyết định status dựa vào việc có gắn với phiên đang mở không
    const orderStatus = isLinkedToCheckedIn ? "pending" : "paid";
    const orderPaymentMethod = isLinkedToCheckedIn ? null : paymentMethod;
    const orderPaidAt = isLinkedToCheckedIn ? null : getVietnamTime();
    const orderType = isLinkedToCheckedIn ? "booking" : "pos";

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
          status: orderStatus,
          paymentMethod: orderPaymentMethod,
          paidAt: orderPaidAt,
          orderType,
          note: note || "",
        },
      ],
      { session },
    );

    let transaction = null;
    let depositTransaction = null;

    // Chỉ tạo transaction nếu thanh toán ngay (không gắn phiên checked_in)
    if (!isLinkedToCheckedIn) {
      transaction = await Transaction.create(
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
            shift: shiftId || null,
            description: `Bán dịch vụ: ${orderItems.map((i) => `${i.productName} x${i.quantity}`).join(", ")}${totalDeposit > 0 ? ` (cọc: ${totalDeposit.toLocaleString()}đ)` : ""}`,
          },
        ],
        { session },
      );

      // Nếu có deposit, tạo thêm transaction deposit
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
              shift: shiftId || null,
              description: `Thu cọc thuê đồ: ${orderItems
                .filter((i) => i.depositPerItem > 0)
                .map((i) => `${i.productName} x${i.quantity}`)
                .join(", ")}`,
            },
          ],
          { session },
        );
      }

      // Cập nhật shift (chỉ khi thanh toán ngay)
      if (shiftId) {
        await ShiftReport.findByIdAndUpdate(
          shiftId,
          {
            $inc: {
              serviceOrderCount: 1,
              cashRevenue: paymentMethod === "cash" ? totalAmount : 0,
              totalTransferIn: paymentMethod === "transfer" ? totalAmount : 0,
            },
          },
          { session },
        );
      }
    }

    await session.commitTransaction();

    const populated = await ServiceOrder.findById(serviceOrder[0]._id)
      .populate("items.product", "name category price unit")
      .populate("booking", "date startTime endTime court");

    res.status(201).json({
      success: true,
      message: isLinkedToCheckedIn
        ? "Đã thêm dịch vụ vào phiên! Sẽ thanh toán khi check-out."
        : "Tạo đơn dịch vụ thành công!",
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

// @desc    Mở ca làm việc (Imprest System: floatAmount từ Admin Settings)
// @route   POST /api/pos/shifts/open
const openShift = async (req, res) => {
  try {
    // Lấy floatAmount từ SystemSettings (quỹ định mức cố định)
    const settings = await SystemSettings.getSettings();
    const floatAmount = settings.floatAmount;

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

    // Kiểm tra ca trước đã được bàn giao chưa (nếu có)
    const lastShift = await ShiftReport.findOne({
      status: "closed",
      handoverStatus: "pending",
    }).sort({ closedAt: -1 });

    // Nhân viên ca sau xác nhận số tiền quỹ nhận được từ ca trước
    const { handoverConfirmed } = req.body;

    if (lastShift && !handoverConfirmed) {
      // Cảnh báo: ca trước chưa được xác nhận bàn giao
      return res.status(400).json({
        success: false,
        message: `Ca trước (${lastShift.staffName}, ngày ${lastShift.shiftDate}) chưa được xác nhận bàn giao. Vui lòng kiểm tra quỹ và xác nhận.`,
        needHandoverConfirmation: true,
        lastShift: {
          _id: lastShift._id,
          staffName: lastShift.staffName,
          shiftDate: lastShift.shiftDate,
          floatAmount: lastShift.floatAmount,
          amountLeftForNextShift: lastShift.amountLeftForNextShift,
        },
      });
    }

    const shift = await ShiftReport.create({
      staff: req.user._id,
      staffName: req.user.name,
      shiftDate: todayStr(),
      openedAt: getVietnamTime(),
      floatAmount, // Từ Admin Settings, không cho nhân viên tự nhập
      status: "open",
      // Nếu có xác nhận bàn giao từ ca trước
      handoverReceivedAmount: handoverConfirmed ? floatAmount : 0,
    });

    // Nếu nhân viên xác nhận bàn giao, cập nhật ca trước
    if (lastShift && handoverConfirmed) {
      lastShift.handoverStatus = "confirmed";
      lastShift.handoverConfirmedBy = req.user._id;
      lastShift.handoverConfirmedByName = req.user.name;
      lastShift.handoverConfirmedAt = getVietnamTime();
      lastShift.handoverNote = `Đã nhận bàn giao quỹ ${floatAmount.toLocaleString()}đ từ ca trước`;
      await lastShift.save();
    }

    res.status(201).json({
      success: true,
      message: `Mở ca thành công! Quỹ định mức: ${floatAmount.toLocaleString()}đ`,
      shift,
      floatAmount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Lấy ca hiện tại đang mở (Imprest System, có fallback cho legacy shift)
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

    // Fallback cho legacy shift (chưa có floatAmount)
    if (shift.floatAmount === undefined || shift.floatAmount === null) {
      const settings = await SystemSettings.getSettings();
      shift.floatAmount = settings.floatAmount;
      // Nếu có openingCash cũ thì dùng, không thì fallback về settings
      if (shift.openingCash !== undefined) {
        shift.floatAmount = shift.openingCash;
      }
    }

    // Tính cashRevenue & cashRefundOut real-time từ transactions
    const transactions = await Transaction.find({
      staff: req.user._id,
      createdAt: { $gte: shift.openedAt },
      status: "completed",
    });

    let cashRevenue = shift.cashRevenue || 0;
    let cashRefundOut = shift.cashRefundOut || 0;
    let transferIn = shift.totalTransferIn || 0;

    // Nếu shift chưa có cashRevenue (legacy), tính từ transactions
    if (!shift.cashRevenue && !shift.cashRefundOut) {
      cashRevenue = 0;
      cashRefundOut = 0;
      transferIn = 0;
      for (const txn of transactions) {
        if (txn.paymentMethod === "cash") {
          if (txn.amount > 0) cashRevenue += txn.amount;
          else cashRefundOut += Math.abs(txn.amount);
        } else if (txn.paymentMethod === "transfer") {
          if (txn.amount > 0) transferIn += txn.amount;
        }
      }
    }

    // Công thức Imprest: expectedCash = floatAmount + cashRevenue − cashRefundOut
    const expectedCash = shift.floatAmount + cashRevenue - cashRefundOut;

    res.json({
      success: true,
      shift: {
        ...shift.toObject(),
        floatAmount: shift.floatAmount,
        expectedCash,
        cashRevenue,
        cashRefundOut,
        transferIn,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Đóng ca làm việc (Imprest System, có fallback cho legacy shift)
// @route   PUT /api/pos/shifts/:id/close
const closeShift = async (req, res) => {
  try {
    const { actualCashCounted, discrepancyNote, confirmedLeaveFloat } =
      req.body;

    if (actualCashCounted === undefined || actualCashCounted < 0) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập số tiền mặt thực tế đếm được",
      });
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
      return res.status(403).json({
        success: false,
        message: "Không có quyền đóng ca của người khác",
      });
    }
    if (shift.status !== "open") {
      return res
        .status(400)
        .json({ success: false, message: "Ca này đã được đóng trước đó" });
    }

    // Fallback cho legacy shift (chưa có floatAmount)
    if (shift.floatAmount === undefined || shift.floatAmount === null) {
      const settings = await SystemSettings.getSettings();
      shift.floatAmount = settings.floatAmount;
      if (shift.openingCash !== undefined) {
        shift.floatAmount = shift.openingCash;
      }
    }

    // Tính toán từ transactions
    const transactions = await Transaction.find({
      staff: shift.staff,
      createdAt: { $gte: shift.openedAt },
      status: "completed",
    });

    let cashRevenue = shift.cashRevenue || 0;
    let cashRefundOut = shift.cashRefundOut || 0;
    let transferIn = shift.totalTransferIn || 0;

    // Nếu shift chưa có cashRevenue (legacy), tính lại từ transactions
    if (!shift.cashRevenue && !shift.cashRefundOut) {
      cashRevenue = 0;
      cashRefundOut = 0;
      transferIn = 0;
      for (const txn of transactions) {
        if (txn.paymentMethod === "cash") {
          if (txn.amount > 0) cashRevenue += txn.amount;
          else cashRefundOut += Math.abs(txn.amount);
        } else if (txn.paymentMethod === "transfer") {
          if (txn.amount > 0) transferIn += txn.amount;
        }
      }
    }

    // Công thức Imprest System:
    // expectedCash = floatAmount + cashRevenue − cashRefundOut
    const expectedCash = shift.floatAmount + cashRevenue - cashRefundOut;
    // discrepancy = actualCashCounted − expectedCash
    const discrepancy = actualCashCounted - expectedCash;
    // amountWithdrawn = actualCashCounted − floatAmount (số tiền rút nộp doanh thu)
    const amountWithdrawn = actualCashCounted - shift.floatAmount;
    // amountLeftForNextShift = floatAmount (luôn giữ nguyên định mức)
    const amountLeftForNextShift = shift.floatAmount;

    // Kiểm tra cảnh báo: không đủ quỹ để lại cho ca sau
    const needAdminApproval = actualCashCounted < shift.floatAmount;

    // Nếu cần admin duyệt và người đóng ca không phải admin
    if (
      needAdminApproval &&
      req.user.role !== "admin" &&
      !req.body.adminOverride
    ) {
      return res.status(400).json({
        success: false,
        message: `⚠️ CẢNH BÁO: Số tiền thực tế (${actualCashCounted.toLocaleString()}đ) thấp hơn quỹ định mức (${shift.floatAmount.toLocaleString()}đ). Không đủ tiền để lại quỹ cho ca sau. Cần Admin duyệt để đóng ca.`,
        needAdminApproval: true,
        floatAmount: shift.floatAmount,
        actualCashCounted,
        shortage: shift.floatAmount - actualCashCounted,
      });
    }

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

    // Cập nhật shift
    shift.actualCashCounted = actualCashCounted;
    shift.cashRevenue = cashRevenue;
    shift.cashRefundOut = cashRefundOut;
    shift.expectedCash = expectedCash;
    shift.discrepancy = discrepancy;
    shift.amountWithdrawn = amountWithdrawn;
    shift.amountLeftForNextShift = amountLeftForNextShift;
    shift.discrepancyNote = discrepancyNote || "";
    shift.totalTransferIn = transferIn;
    shift.bookingCount = bookingCount;
    shift.walkInCount = walkInCount;
    shift.serviceOrderCount = serviceOrderCount;
    shift.refundCount = refundCount;
    shift.closedAt = getVietnamTime();
    shift.status = "closed";
    shift.handoverStatus = confirmedLeaveFloat ? "pending" : "pending"; // Chờ ca sau xác nhận
    shift.handoverNote = confirmedLeaveFloat
      ? `Đã để lại quỹ ${shift.floatAmount.toLocaleString()}đ trong quầy`
      : "";

    await shift.save();

    res.json({
      success: true,
      message:
        discrepancy === 0
          ? "Đóng ca thành công! Quỹ khớp ✅"
          : `Đóng ca thành công! ${discrepancy > 0 ? "Dư" : "Thiếu"} ${Math.abs(discrepancy).toLocaleString()}đ ⚠️`,
      shift: {
        ...shift.toObject(),
        expectedCash,
        discrepancy,
        amountWithdrawn,
        amountLeftForNextShift,
        isBalanced: discrepancy === 0,
        needAdminApproval,
      },
      summary: {
        floatAmount: shift.floatAmount,
        cashRevenue,
        cashRefundOut,
        expectedCash,
        actualCashCounted,
        discrepancy,
        amountWithdrawn,
        amountLeftForNextShift,
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
//  HANDOVER (BÀN GIAO CA) — IMPREST SYSTEM
// ============================================================

// @desc    Xác nhận bàn giao quỹ từ ca trước (nhân viên ca sau hoặc Admin)
// @route   PUT /api/pos/shifts/:id/handover-confirm
const confirmHandover = async (req, res) => {
  try {
    const shift = await ShiftReport.findById(req.params.id);
    if (!shift) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy ca làm việc" });
    }

    if (shift.status !== "closed") {
      return res.status(400).json({
        success: false,
        message: "Chỉ có thể xác nhận bàn giao cho ca đã đóng",
      });
    }

    const { receivedAmount, note } = req.body;

    if (receivedAmount === undefined || receivedAmount < 0) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập số tiền quỹ nhận được",
      });
    }

    const isMatch = receivedAmount === shift.floatAmount;
    const isDisputed = !isMatch;

    shift.handoverStatus = isDisputed ? "disputed" : "confirmed";
    shift.handoverConfirmedBy = req.user._id;
    shift.handoverConfirmedByName = req.user.name;
    shift.handoverConfirmedAt = getVietnamTime();
    shift.handoverReceivedAmount = receivedAmount;
    shift.handoverNote =
      note ||
      (isMatch
        ? `Đã nhận đủ quỹ ${shift.floatAmount.toLocaleString()}đ`
        : `Nhận được ${receivedAmount.toLocaleString()}đ, lệch ${(receivedAmount - shift.floatAmount).toLocaleString()}đ so với định mức ${shift.floatAmount.toLocaleString()}đ`);

    await shift.save();

    res.json({
      success: true,
      message: isMatch
        ? "✅ Xác nhận bàn giao thành công! Quỹ khớp định mức."
        : `⚠️ Xác nhận bàn giao với chênh lệch! Cần Admin kiểm tra.`,
      shift,
      isMatch,
      isDisputed,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Lấy thông tin ca trước để bàn giao (dùng khi mở ca)
// @route   GET /api/pos/shifts/last-closed
const getLastClosedShift = async (req, res) => {
  try {
    const lastShift = await ShiftReport.findOne({
      status: "closed",
    })
      .sort({ closedAt: -1 })
      .populate("staff", "name");

    if (!lastShift) {
      return res.json({
        success: true,
        shift: null,
        message: "Không có ca nào trước đó",
      });
    }

    res.json({
      success: true,
      shift: {
        _id: lastShift._id,
        staffName: lastShift.staffName,
        shiftDate: lastShift.shiftDate,
        floatAmount: lastShift.floatAmount,
        amountLeftForNextShift: lastShift.amountLeftForNextShift,
        handoverStatus: lastShift.handoverStatus,
        handoverNote: lastShift.handoverNote,
        closedAt: lastShift.closedAt,
      },
    });
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

    // Lấy tất cả booking active hôm nay (checked_out đã kết thúc, không hiển thị)
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
  posCheckOut,
  getBookingServices,
  addServiceToBooking,
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
  confirmHandover,
  getLastClosedShift,
  getCourtsStatus,
  getShiftTransactions,
};
