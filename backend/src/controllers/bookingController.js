const Booking = require('../models/Booking');
const Court = require('../models/Court');
const { getPriceForBooking } = require('../services/pricingService');

// @desc    Lấy danh sách booking (admin: tất cả, user: của mình)
// @route   GET /api/bookings
const getBookings = async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'admin') {
      query.user = req.user._id;
    }
    const bookings = await Booking.find(query)
      .populate('user', 'name email phone')
      .populate('court', 'name pricePerHour')
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
      .populate('user', 'name email phone')
      .populate('court', 'name pricePerHour');
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy booking' });
    }
    // Chỉ cho phép xem của mình hoặc admin
    if (booking.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Không có quyền truy cập' });
    }
    res.json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper để lấy Date theo múi giờ Việt Nam độc lập với múi giờ máy chủ
const getVietnamTime = () => {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
};

// @desc    Tạo booking mới
// @route   POST /api/bookings
const createBooking = async (req, res) => {
  try {
    const { courtId, date, startTime, endTime, note } = req.body;

    // Kiểm tra thông tin đầu vào
    if (!courtId || !date || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin' });
    }

    // Kiểm tra sân có tồn tại không
    const court = await Court.findById(courtId);
    if (!court) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sân' });
    }
    if (court.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Sân hiện không khả dụng' });
    }

    // 1. Kiểm tra định dạng thời gian HH:mm
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return res.status(400).json({ success: false, message: 'Định dạng thời gian không hợp lệ (HH:mm)' });
    }

    // 2. Chuyển sang phút để so sánh và tính toán
    const startParts = startTime.split(':');
    const endParts = endTime.split(':');
    const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
    const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);

    if (endMinutes <= startMinutes) {
      return res.status(400).json({ success: false, message: 'Giờ kết thúc phải sau giờ bắt đầu' });
    }

    // 3. Giờ hoạt động (06:00 - 22:00)
    const OPEN_MINUTES = 6 * 60;
    const CLOSE_MINUTES = 22 * 60;
    if (startMinutes < OPEN_MINUTES || endMinutes > CLOSE_MINUTES) {
      return res.status(400).json({ success: false, message: 'Thời gian đặt sân phải nằm trong giờ hoạt động (06:00 - 22:00)' });
    }

    // 4. Validate ngày đặt không nằm trong quá khứ
    const vnNow = getVietnamTime();
    const year = vnNow.getFullYear();
    const month = String(vnNow.getMonth() + 1).padStart(2, '0');
    const day = String(vnNow.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    if (date < todayStr) {
      return res.status(400).json({ success: false, message: 'Không thể đặt sân trong quá khứ' });
    }

    // 5. Nếu ngày đặt là hôm nay, kiểm tra giờ bắt đầu có lớn hơn giờ hiện tại hay không
    if (date === todayStr) {
      const currentMinutes = vnNow.getHours() * 60 + vnNow.getMinutes();
      if (startMinutes <= currentMinutes) {
        return res.status(400).json({ success: false, message: 'Giờ bắt đầu đặt sân phải sau thời điểm hiện tại' });
      }
    }

    // Kiểm tra trùng lịch
    const conflictBooking = await Booking.findOne({
      court: courtId,
      date,
      status: { $ne: 'cancelled' },
      $or: [
        { startTime: { $lt: endTime }, endTime: { $gt: startTime } },
      ],
    });
    if (conflictBooking) {
      return res.status(400).json({ success: false, message: 'Sân đã được đặt trong khung giờ này' });
    }

    // Tính tổng tiền động dựa trên quy tắc giá (Peak hours / Weekend)
    const priceResult = await getPriceForBooking(court.pricePerHour, date, startTime, endTime);
    const { totalPrice, breakdown: priceBreakdown } = priceResult;

    const booking = await Booking.create({
      user: req.user._id,
      court: courtId,
      date,
      startTime,
      endTime,
      totalPrice,
      priceBreakdown,
      note,
    });

    await booking.populate('court', 'name pricePerHour');
    res.status(201).json({ success: true, message: 'Đặt sân thành công', booking });
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
      { new: true }
    ).populate('user', 'name email').populate('court', 'name');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy booking' });
    }
    res.json({ success: true, message: 'Cập nhật trạng thái thành công', booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Huỷ booking
// @route   DELETE /api/bookings/:id
const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy booking' });
    }
    if (booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Không có quyền thực hiện' });
    }
    booking.status = 'cancelled';
    await booking.save();
    res.json({ success: true, message: 'Huỷ booking thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getBookings, getBookingById, createBooking, updateBookingStatus, cancelBooking };
