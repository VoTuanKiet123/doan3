const express = require("express");
const router = express.Router();
const {
  getMaintenances,
  getMaintenanceById,
  createMaintenance,
  updateMaintenanceStatus,
  updateMaintenance,
  deleteMaintenance,
  previewConflicts,
  getActiveMaintenanceCourts,
} = require("../controllers/maintenanceController");
const { protect, adminOnly } = require("../middleware/auth");

// Public: danh sách sân đang bảo trì (cho frontend customer)
router.get("/active-courts", getActiveMaintenanceCourts);

// Admin only
router.get("/", protect, adminOnly, getMaintenances);
router.get("/:id", protect, adminOnly, getMaintenanceById);
router.post("/", protect, adminOnly, createMaintenance);
router.post("/preview-conflicts", protect, adminOnly, previewConflicts);
router.put("/:id", protect, adminOnly, updateMaintenance);
router.put("/:id/status", protect, adminOnly, updateMaintenanceStatus);
router.delete("/:id", protect, adminOnly, deleteMaintenance);

module.exports = router;
