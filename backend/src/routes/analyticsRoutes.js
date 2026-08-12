const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/auth");
const {
  getDashboardOverview,
  getDailyRevenue,
  getMonthlyRevenue,
  getOccupancyRate,
  getNetProfit,
  getCustomerInsights,
  exportReport,
} = require("../controllers/analyticsController");

// Tất cả routes analytics require admin
router.use(protect, adminOnly);

// Dashboard tổng quan
router.get("/dashboard", getDashboardOverview);

// Báo cáo doanh thu theo ngày
router.get("/daily-revenue", getDailyRevenue);

// Báo cáo doanh thu theo tháng
router.get("/monthly-revenue", getMonthlyRevenue);

// Báo cáo công suất sử dụng sân
router.get("/occupancy-rate", getOccupancyRate);

// Báo cáo lợi nhuận ròng
router.get("/net-profit", getNetProfit);

// Báo cáo khách hàng
router.get("/customer-insights", getCustomerInsights);

// Xuất báo cáo
router.get("/export", exportReport);

module.exports = router;
