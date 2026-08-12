const express = require("express");
const router = express.Router();
const {
  getSettings,
  getAdminSettings,
  updateSettings,
  getFloatAmount,
} = require("../controllers/settingsController");
const { protect, adminOnly } = require("../middleware/auth");

// ========== Public (hoặc authenticated) ==========
router.get("/", getSettings);
router.get("/float-amount", protect, getFloatAmount); // Cần đăng nhập để lấy floatAmount khi mở ca

// ========== Admin only ==========
router.get("/admin", protect, adminOnly, getAdminSettings);
router.put("/admin", protect, adminOnly, updateSettings);

module.exports = router;
