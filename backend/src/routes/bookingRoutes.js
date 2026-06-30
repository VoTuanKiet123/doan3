const express = require("express");
const router = express.Router();
const {
  getBookings,
  getBookingById,
  createBooking,
  createFixedMonthlyBooking,
  previewFixedSchedule,
  getBookingsByBatch,
  cancelBookingByBatch,
  updateBookingStatus,
  cancelBooking,
  getBookingPaymentInfo,
  confirmBookingPayment,
} = require("../controllers/bookingController");
const { protect, adminOnly } = require("../middleware/auth");

// ========== Đặt sân vãng lai ==========
router.get("/", protect, getBookings);
router.get("/batch/:batchId", protect, getBookingsByBatch); // phải đặt trước /:id
router.get("/:id", protect, getBookingById);
router.get("/:id/payment", protect, getBookingPaymentInfo);
router.post("/", protect, createBooking);

// ========== Đặt lịch cố định theo tháng ==========
router.post("/fixed-monthly", protect, createFixedMonthlyBooking);
router.post("/preview-fixed-schedule", protect, previewFixedSchedule);
router.put("/batch/:batchId/cancel", protect, cancelBookingByBatch);

// ========== Quản lý (admin) ==========
router.put("/:id/status", protect, adminOnly, updateBookingStatus);
router.delete("/:id", protect, cancelBooking);
router.put("/:id/payment/confirm", protect, confirmBookingPayment);

module.exports = router;
