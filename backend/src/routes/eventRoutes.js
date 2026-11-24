const express = require("express");
const router = express.Router();
const {
  uploadPoster,
  getManagedEvents,
  getManagedEvent,
  getPublicEvents,
  getPublicEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  register,
  updateMyRegistration,
  cancelMyRegistration,
  getEventRegistrations,
} = require("../controllers/eventController");
const { protect, adminOnly } = require("../middleware/auth");
const uploadEventPoster = require("../middleware/uploadEventPoster");

// Admin — các route tĩnh đặt TRƯỚC /:id
router.post("/upload-poster", protect, adminOnly, uploadEventPoster, uploadPoster);
router.get("/manage", protect, adminOnly, getManagedEvents);
router.get("/manage/:id", protect, adminOnly, getManagedEvent);
router.get("/:id/registrations", protect, adminOnly, getEventRegistrations);

// Công khai cho khách
router.get("/", getPublicEvents);
router.get("/:id", getPublicEvent);

// Đăng ký, sửa phiếu & tự hủy đăng ký (user đăng nhập)
router.post("/:id/register", protect, register);
router.put("/:id/register/cancel", protect, cancelMyRegistration);
router.put("/:id/register", protect, updateMyRegistration);

// Admin tạo/sửa/xóa
router.post("/", protect, adminOnly, createEvent);
router.put("/:id", protect, adminOnly, updateEvent);
router.delete("/:id", protect, adminOnly, deleteEvent);

module.exports = router;