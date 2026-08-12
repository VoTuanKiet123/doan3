const express = require("express");
const router = express.Router();
const {
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
} = require("../controllers/posController");
const { protect, adminOrPosStaff } = require("../middleware/auth");

// ========== Tất cả POS routes yêu cầu đăng nhập + role admin hoặc pos_staff ==========
router.use(protect);
router.use(adminOrPosStaff);

// ========== Tra cứu booking ==========
router.get("/bookings/search", searchBookings);

// ========== Sơ đồ sân ==========
router.get("/courts-status", getCourtsStatus);

// ========== Check-in ==========
router.put("/bookings/:id/checkin", posCheckIn);

// ========== Check-out (kết phiên & thanh toán tổng) ==========
router.put("/bookings/:id/checkout", posCheckOut);

// ========== Dịch vụ trong phiên ==========
router.get("/bookings/:id/services", getBookingServices);
router.post("/bookings/:id/services", addServiceToBooking);

// ========== Walk-in ==========
router.post("/bookings/walkin", createWalkInBooking);

// ========== Huỷ & đổi lịch ==========
router.get("/cancellation-policy", getCancellationPolicy);
router.put("/bookings/:id/cancel", posCancelBooking);
router.put("/bookings/:id/noshow", markNoShow);
router.put("/bookings/:id/reschedule", rescheduleBooking);

// ========== Bán dịch vụ ==========
router.get("/top-products", getTopProducts);
router.post("/service-orders", createPosServiceOrder);

// ========== Quản lý ca ==========
router.post("/shifts/open", openShift);
router.get("/shifts/current", getCurrentShift);
router.put("/shifts/:id/close", closeShift);
router.get("/shifts/history", getShiftHistory);
// Handover (bàn giao ca)
router.get("/shifts/last-closed", getLastClosedShift);
router.put("/shifts/:id/handover-confirm", confirmHandover);

// ========== Giao dịch ==========
router.get("/transactions", getShiftTransactions);

module.exports = router;
