const express = require("express");
const router = express.Router();
const {
  getMyOrders,
  getOrderById,
  createServiceOrder,
  payOrder,
  cancelOrder,
  returnRentalItem,
  getAllOrders,
  getActiveRentals,
  getRevenueReport,
} = require("../controllers/serviceOrderController");
const { protect, adminOnly } = require("../middleware/auth");

// ========== User ==========
router.get("/", protect, getMyOrders);
router.get("/:id", protect, getOrderById);
router.post("/", protect, createServiceOrder);

// ========== Admin only ==========
router.get("/admin/all", protect, adminOnly, getAllOrders);
router.get("/admin/active-rentals", protect, adminOnly, getActiveRentals);
router.get("/admin/revenue", protect, adminOnly, getRevenueReport);
router.put("/:id/pay", protect, adminOnly, payOrder);
router.put("/:id/cancel", protect, cancelOrder); // Ai cũng hủy được đơn của mình, nhưng controller sẽ check quyền
router.put("/:id/return-item/:itemId", protect, adminOnly, returnRentalItem);

module.exports = router;
