const express = require("express");
const router = express.Router();
const {
  getManagedEvents,
  getManagedEvent,
  getPublicEvents,
  getPublicEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  register,
  getEventRegistrations,
} = require("../controllers/eventController");
const { protect, adminOnly } = require("../middleware/auth");

// Admin — route /manage đặt TRƯỚC /:id để không bị /:id nuốt mất
router.get("/manage", protect, adminOnly, getManagedEvents);
router.get("/manage/:id", protect, adminOnly, getManagedEvent);
router.get("/:id/registrations", protect, adminOnly, getEventRegistrations);

// Công khai cho khách (không cần đăng nhập)
router.get("/", getPublicEvents);
router.get("/:id", getPublicEvent);

// Admin tạo/sửa/xóa; đăng ký phải là user đăng nhập
router.post("/", protect, adminOnly, createEvent);
router.put("/:id", protect, adminOnly, updateEvent);
router.delete("/:id", protect, adminOnly, deleteEvent);
router.post("/:id/register", protect, register);

module.exports = router;
