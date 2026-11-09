const express = require("express");
const router = express.Router();
const {
  getQueue,
  getLogsForTicket,
  startWork,
  updateLog,
  voidLog,
  pauseWork,
  finishWork,
} = require("../controllers/maintenanceLogController");
const { protect, posStaffOnly } = require("../middleware/auth");

// Nhân viên trực sân (pos_staff / admin): hàng đợi việc + thực hiện bảo trì
router.get("/queue", protect, posStaffOnly, getQueue);
router.get("/", protect, posStaffOnly, getLogsForTicket);
router.post("/start", protect, posStaffOnly, startWork);
router.put("/:id", protect, posStaffOnly, updateLog);
router.post("/:id/void", protect, posStaffOnly, voidLog);
router.post("/pause", protect, posStaffOnly, pauseWork);
router.post("/finish", protect, posStaffOnly, finishWork);

module.exports = router;
