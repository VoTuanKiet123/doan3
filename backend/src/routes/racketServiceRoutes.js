const express = require("express");
const router = express.Router();
const {
  createTicket,
  getTickets,
  getTicketById,
  updateTicketStatus,
  updateTicket,
  getMyTickets,
  lookupTicket,
} = require("../controllers/racketServiceController");
const { protect, adminOrPosStaff } = require("../middleware/auth");

// ===== Khách hàng (đặt trước /:id) =====
router.get("/lookup", lookupTicket); // public: cần mã phiếu + SĐT
router.get("/my", protect, getMyTickets);

// ===== Nhân viên quầy + Admin =====
router.get("/", protect, adminOrPosStaff, getTickets);
router.post("/", protect, adminOrPosStaff, createTicket);
router.get("/:id", protect, adminOrPosStaff, getTicketById);
router.put("/:id", protect, adminOrPosStaff, updateTicket);
router.put("/:id/status", protect, adminOrPosStaff, updateTicketStatus);

module.exports = router;
