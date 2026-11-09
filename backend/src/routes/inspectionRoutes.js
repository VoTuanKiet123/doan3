const express = require("express");
const router = express.Router();
const {
  getChecklist,
  saveChecklistItem,
  updateChecklistItem,
  submitInspection,
  submitAcceptance,
  getInspections,
  getInspectionById,
  getPendingCount,
  dismissInspection,
} = require("../controllers/inspectionController");
const {
  protect,
  adminOnly,
  adminOrPosStaff,
  posStaffOnly,
} = require("../middleware/auth");

// Mục kiểm tra mẫu: mọi nhân viên đọc được, admin sửa được
router.get("/checklist", protect, getChecklist);
router.post("/checklist", protect, adminOnly, saveChecklistItem);
router.put("/checklist/:id", protect, adminOnly, updateChecklistItem);

// Badge menu Admin
router.get("/pending-count", protect, adminOnly, getPendingCount);

// Danh sách / chi tiết báo cáo (Admin xử lý, POS xem lịch sử)
router.get("/", protect, adminOrPosStaff, getInspections);
router.get("/:id", protect, adminOrPosStaff, getInspectionById);

// Nhân viên gửi báo cáo kiểm tra sân
router.post("/", protect, posStaffOnly, submitInspection);

// Nhân viên kiểm tra lại sau sửa (nghiệm thu — N2.10)
router.post("/acceptance", protect, posStaffOnly, submitAcceptance);

// Admin bỏ qua báo cáo (bắt buộc lý do)
router.put("/:id/dismiss", protect, adminOnly, dismissInspection);

module.exports = router;
