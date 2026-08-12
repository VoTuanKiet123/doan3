const express = require("express");
const router = express.Router();
const {
  createPayment,
  createQrPayment,
  handleReturnUrl,
  handleIpnUrl,
  checkPaymentStatus,
  getVnpayTransactions,
} = require("../controllers/vnpayController");
const { protect, adminOrPosStaff, adminOnly } = require("../middleware/auth");

// ========== IPN & Return (KHÔNG cần auth – VNPay gọi trực tiếp) ==========
router.get("/ipn", handleIpnUrl);
router.get("/return", handleReturnUrl);

// ========== Tạo thanh toán (yêu cầu đăng nhập) ==========
router.post("/create-payment", protect, createPayment);

// ========== POS QR Payment (yêu cầu admin/pos_staff) ==========
router.post("/create-qr", protect, adminOrPosStaff, createQrPayment);

// ========== Kiểm tra trạng thái (polling) ==========
router.get("/check-status/:orderId", protect, checkPaymentStatus);

// ========== Lịch sử giao dịch (admin) ==========
router.get("/transactions", protect, adminOnly, getVnpayTransactions);

module.exports = router;
