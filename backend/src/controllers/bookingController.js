const Booking = require("../models/Booking");
const Court = require("../models/Court");
const { getPriceForBooking } = require("../services/pricingService");
const {
  generateFixedScheduleDates,
  bulkCheckConflicts,
} = require("../services/scheduleService");
const crypto = require("crypto");

const HOLD_MINUTES = 15;

// ============ HELPERS ============

// Lấy Date theo múi giờ Việt Nam
const getVietnamTime = () => {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }),
  );
};

// Validate khung giờ (dùng chung casual & fixed_monthly)
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
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;

  if (endMin <= startMin) {
    return { valid: false, message: "Giờ kết thúc phải sau giờ bắt đầu" };
  }

  const OPEN = 6 * 60; // 06:00
  const CLOSE = 22 * 60; // 22:00
  if (startMin < OPEN || endMin > CLOSE) {
    return {
      valid: false,
      message: "Thời gian đặt sân phải trong giờ 06:00 - 22:00",
    };
  }

  return { valid: true, startMin, endMin };
};

// Validate ngày không trong quá khứ
const validateNotPast = (dateStr, startMin) => {
  const vnNow = getVietnamTime();
  const y = vnNow.getFullYear();
  const m = String(vnNow.getMonth() + 1).padStart(2, "0");
  const d = String(vnNow.getDate()).padStart(2, "0");
  const todayStr = `${y}-${m}-${d}`;

  if (dateStr < todayStr) {
    return { valid: false, message: "Không thể đặt sân trong quá khứ" };
  }
  if (dateStr === todayStr) {
    const curMin = vnNow.getHours() * 60 + vnNow.getMinutes();
    if (startMin <= curMin) {
      return {
        valid: false,
        message: "Giờ bắt đầu phải sau thời điểm hiện tại",
      };
    }
  }
  return { valid: true };
};

// ============ CONTROLLER: CRUD CƠ BẢN ============

// @desc    Lấy danh sách booking (admin: tất cả, user: của mình)
// @route   GET /api/bookings
const getBookings = async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== "admin") {
      query.user = req.user._id;
    }
    const bookings = await Booking.find(query)
      .populate("user", "name email phone")
      .populate("court", "name pricePerHour")
      .sort({ createdAt: -1 });
    res.json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Lấy chi tiết booking
// @route   GET /api/bookings/:id
const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("user", "name email phone")
      .populate("court", "name pricePerHour");
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy booking" });
    }
    if (
      booking.user._id.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Không có quyền truy cập" });
    }
    res.json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const generatePaymentInfo = ({ court, date, startTime, endTime, totalPrice }) => {
  const description = `Thanh toán đặt sân ${court.name} ${date} ${startTime}-${endTime}`;
  const qrText = `BANK:VietQR;NAME:${court.name};ACCOUNT:1234567890;AMOUNT:${totalPrice};NOTE:${description}`;
  return {
    bankName: "VietQR",
    accountNumber: "1234567890",
    accountName: "Sân Cầu Lông Demo",
    amount: totalPrice,
    description,
    qrText,
  };
};

const cleanupExpiredPendingBookings = async () => {
  const now = getVietnamTime();
  const result = await Booking.updateMany(
    {
      status: "pending",
      expiresAt: { $lte: now },
    },
    {
      $set: {
        status: "cancelled",
        note: "Hết hạn giữ chỗ tự động",
      },
    },
  );
  return result.modifiedCount || 0;
};

// @desc    Lấy thông tin thanh toán QR cho booking
// @route   GET /api/bookings/:id/payment
const getBookingPaymentInfo = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate(
      "court",
      "name pricePerHour",
    );
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy booking" });
    }
    if (
      booking.user.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Không có quyền truy cập" });
    }
    if (!booking.paymentInfo) {
      booking.paymentInfo = generatePaymentInfo({
        court: booking.court,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        totalPrice: booking.totalPrice,
      });
      await booking.save();
    }
    res.json({
      success: true,
      paymentInfo: booking.paymentInfo,
      expiresAt: booking.expiresAt,
      status: booking.status,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Xác nhận đã thanh toán booking
// @route   PUT /api/bookings/:id/payment/confirm
const confirmBookingPayment = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy booking" });
    }
    if (
      booking.user.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Không có quyền truy cập" });
    }
    if (booking.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Booking không ở trạng thái chờ thanh toán",
      });
    }
    if (booking.expiresAt && booking.expiresAt <= getVietnamTime()) {
      booking.status = "cancelled";
      await booking.save();
      return res.status(410).json({
        success: false,
        message: "Giữ chỗ đã hết hạn",
      });
    }
    booking.status = "confirmed";
    await booking.save();
    res.json({ success: true, message: "Thanh toán thành công", booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Cập nhật trạng thái booking (admin)
// @route   PUT /api/bookings/:id/status
const updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    )
      .populate("user", "name email")
      .populate("court", "name");

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy booking" });
    }
    res.json({
      success: true,
      message: "Cập nhật trạng thái thành công",
      booking,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Huỷ booking đơn lẻ
// @route   DELETE /api/bookings/:id
const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy booking" });
    }
    if (
      booking.user.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Không có quyền thực hiện" });
    }
    booking.status = "cancelled";
    await booking.save();
    res.json({ success: true, message: "Huỷ booking thành công" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ CONTROLLER: ĐẶT SÂN VÃNG LAI ============

// @desc    Tạo booking vãng lai (1 ngày)
// @route   POST /api/bookings
const createBooking = async (req, res) => {
  try {
    const { courtId, date, startTime, endTime, note } = req.body;

    if (!courtId || !date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp đầy đủ thông tin",
      });
    }

    const court = await Court.findById(courtId);
    if (!court) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy sân" });
    }
    if (court.status !== "active") {
      return res
        .status(400)
        .json({ success: false, message: "Sân hiện không khả dụng" });
    }

    const timeCheck = validateTimeSlot(startTime, endTime);
    if (!timeCheck.valid) {
      return res
        .status(400)
        .json({ success: false, message: timeCheck.message });
    }

    const pastCheck = validateNotPast(date, timeCheck.startMin);
    if (!pastCheck.valid) {
      return res
        .status(400)
        .json({ success: false, message: pastCheck.message });
    }

    // Kiểm tra trùng lịch
    const conflict = await Booking.findOne({
      court: courtId,
      date,
      status: { $ne: "cancelled" },
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    });
    if (conflict) {
      return res.status(400).json({
        success: false,
        message: "Sân đã được đặt trong khung giờ này",
      });
    }

    const priceResult = await getPriceForBooking(
      court.pricePerHour,
      date,
      startTime,
      endTime,
    );

    const paymentInfo = generatePaymentInfo({
      court,
      date,
      startTime,
      endTime,
      totalPrice: priceResult.totalPrice,
    });
    const expiresAt = new Date(getVietnamTime().getTime() + HOLD_MINUTES * 60000);

    const booking = await Booking.create({
      user: req.user._id,
      court: courtId,
      bookingType: "casual",
      date,
      startTime,
      endTime,
      totalPrice: priceResult.totalPrice,
      priceBreakdown: priceResult.breakdown,
      note: note || "",
      status: "pending",
      expiresAt,
      paymentInfo,
    });

    await booking.populate("court", "name pricePerHour");
    res.status(201).json({
      success: true,
      message: "Đặt sân thành công. Vui lòng thanh toán trong 15 phút để giữ chỗ.",
      booking,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ CONTROLLER: ĐẶT LỊCH CỐ ĐỊNH THEO THÁNG ============

// @desc    Tạo booking cố định theo tháng (hàng loạt)
// @route   POST /api/bookings/fixed-monthly
const createFixedMonthlyBooking = async (req, res) => {
  try {
    const {
      courtId,
      startDate,
      endDate,
      daysOfWeek,
      startTime,
      endTime,
      note,
    } = req.body;

    // ----- Validate đầu vào -----
    if (
      !courtId ||
      !startDate ||
      !endDate ||
      !daysOfWeek ||
      !startTime ||
      !endTime
    ) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp đầy đủ thông tin",
      });
    }
    if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn ít nhất 1 thứ trong tuần",
      });
    }
    const invalidDays = daysOfWeek.filter(
      (d) => d < 0 || d > 6 || !Number.isInteger(d),
    );
    if (invalidDays.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Thứ không hợp lệ (0=CN, 1=T2,...,6=T7)",
      });
    }
    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        message: "Ngày bắt đầu phải trước ngày kết thúc",
      });
    }

    const court = await Court.findById(courtId);
    if (!court) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy sân" });
    }
    if (court.status !== "active") {
      return res
        .status(400)
        .json({ success: false, message: "Sân hiện không khả dụng" });
    }

    const timeCheck = validateTimeSlot(startTime, endTime);
    if (!timeCheck.valid) {
      return res
        .status(400)
        .json({ success: false, message: timeCheck.message });
    }

    // ----- Sinh danh sách ngày -----
    const generatedSlots = generateFixedScheduleDates(
      startDate,
      endDate,
      daysOfWeek,
      startTime,
      endTime,
    );
    if (generatedSlots.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Không có ngày nào trùng với thứ đã chọn trong khoảng này",
      });
    }

    // Lọc quá khứ
    const validSlots = generatedSlots.filter((slot) => {
      const pastCheck = validateNotPast(slot.date, timeCheck.startMin);
      return pastCheck.valid;
    });
    if (validSlots.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Tất cả các ngày sinh ra đều đã trong quá khứ",
      });
    }

    // ----- Bulk conflict check (1 query duy nhất) -----
    const conflictDates = await bulkCheckConflicts(courtId, validSlots);
    if (conflictDates.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Có ${conflictDates.length} ngày bị trùng lịch`,
        conflictDates,
        totalSlots: validSlots.length,
        availableSlots: validSlots.length - conflictDates.length,
      });
    }

    // ----- Tạo batch & insert hàng loạt -----
    const batchId = crypto.randomUUID();
    const bookingDocs = [];

    for (const slot of validSlots) {
      const priceResult = await getPriceForBooking(
        court.pricePerHour,
        slot.date,
        slot.startTime,
        slot.endTime,
      );
        bookingDocs.push({
        user: req.user._id,
        court: courtId,
        bookingType: "fixed_monthly",
        batchId,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        totalPrice: priceResult.totalPrice,
        priceBreakdown: priceResult.breakdown,
        fixedScheduleMeta: { startDate, endDate, daysOfWeek },
        note: note || "",
        status: "confirmed",
      });
    }

    const createdBookings = await Booking.insertMany(bookingDocs);
    const populatedBookings = await Booking.find({ batchId })
      .populate("court", "name pricePerHour")
      .sort({ date: 1 });

    res.status(201).json({
      success: true,
      message: `Đặt lịch cố định thành công: ${createdBookings.length} buổi`,
      batchId,
      totalCount: createdBookings.length,
      totalPrice: populatedBookings.reduce((sum, b) => sum + b.totalPrice, 0),
      bookings: populatedBookings,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Xem trước lịch cố định (không lưu DB)
// @route   POST /api/bookings/preview-fixed-schedule
const previewFixedSchedule = async (req, res) => {
  try {
    const { startDate, endDate, daysOfWeek, startTime, endTime, courtId } =
      req.body;

    if (!startDate || !endDate || !daysOfWeek || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp đầy đủ thông tin",
      });
    }

    const timeCheck = validateTimeSlot(startTime, endTime);
    if (!timeCheck.valid) {
      return res
        .status(400)
        .json({ success: false, message: timeCheck.message });
    }
    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        message: "Ngày bắt đầu phải trước ngày kết thúc",
      });
    }

    const slots = generateFixedScheduleDates(
      startDate,
      endDate,
      daysOfWeek,
      startTime,
      endTime,
    );

    const vnNow = getVietnamTime();
    const todayStr = `${vnNow.getFullYear()}-${String(vnNow.getMonth() + 1).padStart(2, "0")}-${String(vnNow.getDate()).padStart(2, "0")}`;
    const futureSlots = slots.filter((s) => s.date >= todayStr);

    let conflictDates = [];
    if (courtId) {
      conflictDates = await bulkCheckConflicts(courtId, futureSlots);
    }

    res.json({
      success: true,
      totalGenerated: slots.length,
      futureSlots: futureSlots.length,
      pastSlots: slots.length - futureSlots.length,
      conflictDates,
      availableSlots: futureSlots.length - conflictDates.length,
      sampleDates: futureSlots.slice(0, 5).map((s) => s.date),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Lấy tất cả booking trong 1 batch
// @route   GET /api/bookings/batch/:batchId
const getBookingsByBatch = async (req, res) => {
  try {
    const bookings = await Booking.find({ batchId: req.params.batchId })
      .populate("user", "name email phone")
      .populate("court", "name pricePerHour")
      .sort({ date: 1 });

    if (bookings.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy batch" });
    }
    if (
      bookings[0].user._id.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Không có quyền truy cập" });
    }

    res.json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Huỷ toàn bộ booking trong 1 batch
// @route   PUT /api/bookings/batch/:batchId/cancel
const cancelBookingByBatch = async (req, res) => {
  try {
    const bookings = await Booking.find({ batchId: req.params.batchId });
    if (bookings.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy batch" });
    }
    if (
      bookings[0].user.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Không có quyền thực hiện" });
    }

    const result = await Booking.updateMany(
      { batchId: req.params.batchId, status: { $ne: "cancelled" } },
      { status: "cancelled" },
    );

    res.json({
      success: true,
      message: `Đã huỷ ${result.modifiedCount} booking trong lịch cố định`,
      cancelledCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Khách hàng check-in sân
// @route   PUT /api/bookings/:id/checkin
const checkInBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("court", "name");
    if (!booking) {
      return res.status(404).json({ success: false, message: "Không tìm thấy booking" });
    }
    if (booking.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Không có quyền thực hiện" });
    }
    if (booking.status !== "confirmed") {
      return res.status(400).json({ success: false, message: "Chỉ có thể check-in khi booking đã được xác nhận" });
    }
    if (booking.checkedIn) {
      return res.status(400).json({ success: false, message: "Booking này đã được check-in trước đó" });
    }
    booking.checkedIn = true;
    booking.checkedInAt = getVietnamTime();
    await booking.save();
    res.json({ success: true, message: "Check-in thành công!", booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Khách hàng đánh giá sân sau khi chơi
// @route   POST /api/bookings/:id/review
const submitReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Đánh giá phải từ 1 đến 5 sao" });
    }
    const booking = await Booking.findById(req.params.id).populate("court", "name");
    if (!booking) {
      return res.status(404).json({ success: false, message: "Không tìm thấy booking" });
    }
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Không có quyền thực hiện" });
    }
    if (booking.status !== "confirmed") {
      return res.status(400).json({ success: false, message: "Chỉ có thể đánh giá booking đã xác nhận" });
    }

    // Kiểm tra ngày chơi đã qua chưa (cho phép đánh giá từ ngày chơi trở đi)
    const vnNow = getVietnamTime();
    const todayStr = `${vnNow.getFullYear()}-${String(vnNow.getMonth() + 1).padStart(2, "0")}-${String(vnNow.getDate()).padStart(2, "0")}`;
    if (booking.date > todayStr) {
      return res.status(400).json({ success: false, message: "Chỉ có thể đánh giá sau khi đã chơi xong" });
    }

    if (booking.review && booking.review.rating) {
      return res.status(400).json({ success: false, message: "Bạn đã đánh giá sân này rồi" });
    }

    booking.review = {
      rating: Number(rating),
      comment: comment || "",
      createdAt: getVietnamTime(),
    };
    await booking.save();
    res.json({ success: true, message: "Cảm ơn bạn đã đánh giá!", booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Lấy tất cả đánh giá mà user hiện tại đã gửi
// @route   GET /api/bookings/my-reviews
const getMyReviews = async (req, res) => {
  try {
    const reviews = await Booking.find({
      user: req.user._id,
      "review.rating": { $exists: true, $ne: null },
    })
      .populate("court", "name")
      .select("review date court startTime endTime status")
      .sort({ "review.createdAt": -1 });

    res.json({
      success: true,
      count: reviews.length,
      reviews: reviews.map((b) => ({
        _id: b._id,
        court: b.court,
        date: b.date,
        startTime: b.startTime,
        endTime: b.endTime,
        rating: b.review.rating,
        comment: b.review.comment,
        createdAt: b.review.createdAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Lấy các booking đã xác nhận & đã qua ngày (để đánh giá)
// @route   GET /api/bookings/reviewable
const getReviewableBookings = async (req, res) => {
  try {
    const vnNow = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }),
    );
    const todayStr = `${vnNow.getFullYear()}-${String(vnNow.getMonth() + 1).padStart(2, "0")}-${String(vnNow.getDate()).padStart(2, "0")}`;

    const bookings = await Booking.find({
      user: req.user._id,
      status: "confirmed",
      date: { $lte: todayStr },
      "review.rating": { $exists: false },
    })
      .populate("court", "name")
      .select("date startTime endTime court totalPrice")
      .sort({ date: -1 });

    res.json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Lấy tất cả đánh giá của một sân
// @route   GET /api/courts/:id/reviews
const getCourtReviews = async (req, res) => {
  try {
    const reviews = await Booking.find({
      court: req.params.id,
      "review.rating": { $exists: true, $ne: null },
    })
      .populate("user", "name")
      .select("review date user checkedIn")
      .sort({ "review.createdAt": -1 });

    const totalRating = reviews.reduce((sum, b) => sum + (b.review?.rating || 0), 0);
    const avgRating = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : 0;

    res.json({
      success: true,
      count: reviews.length,
      avgRating: Number(avgRating),
      reviews: reviews.map((b) => ({
        _id: b._id,
        user: b.user,
        date: b.date,
        rating: b.review.rating,
        comment: b.review.comment,
        createdAt: b.review.createdAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getBookings,
  getBookingById,
  createBooking,
  updateBookingStatus,
  cancelBooking,
  cleanupExpiredPendingBookings,
  createFixedMonthlyBooking,
  previewFixedSchedule,
  getBookingsByBatch,
  cancelBookingByBatch,
  getBookingPaymentInfo,
  confirmBookingPayment,
  checkInBooking,
  submitReview,
  getCourtReviews,
  getMyReviews,
  getReviewableBookings,
};
