const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const c = require("../controllers/tournamentController");
const User = require("../models/User");
const { protect, adminOnly, adminOrPosStaff } = require("../middleware/auth");

// Đăng nhập không bắt buộc: có token hợp lệ thì gắn req.user (để admin xem giải nháp,
// khách xem đăng ký của mình), không có thì vẫn cho xem như khách vãng lai.
const optionalAuth = async (req, res, next) => {
  const h = req.headers.authorization;
  if (h && h.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(h.split(" ")[1], process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id);
    } catch {
      /* token sai thì coi như chưa đăng nhập */
    }
  }
  next();
};

// ===== Loại sự kiện =====
router.get("/event-types", optionalAuth, c.getEventTypes);
router.post("/event-types", protect, adminOnly, c.createEventType);
router.put("/event-types/:id", protect, adminOnly, c.updateEventType);
router.delete("/event-types/:id", protect, adminOnly, c.deleteEventType);

// ===== Nhà tài trợ =====
router.get("/sponsors", optionalAuth, c.getSponsors);
router.post("/sponsors", protect, adminOnly, c.createSponsor);
router.put("/sponsors/:id", protect, adminOnly, c.updateSponsor);
router.delete("/sponsors/:id", protect, adminOnly, c.deleteSponsor);

// ===== Khách hàng =====
router.get("/my/registrations", protect, c.getMyRegistrations);
router.put("/registrations/:regId/cancel", protect, c.cancelMyRegistration);

// ===== Nhân viên phụ trách + Admin =====
router.get("/manage/list", protect, adminOrPosStaff, c.getManageList);
router.get("/manage/staff", protect, adminOnly, c.getStaffOptions);
router.get("/manage/stats", protect, adminOnly, c.getStats);
router.put("/registrations/:regId/review", protect, adminOrPosStaff, c.reviewRegistration);
router.put("/registrations/:regId/payment", protect, adminOrPosStaff, c.updatePayment);
router.put("/registrations/:regId/checkin", protect, adminOrPosStaff, c.updateCheckIn);
router.put("/matches/:matchId", protect, adminOrPosStaff, c.updateMatch);

// ===== Giải đấu =====
router.get("/", c.getTournaments);
router.post("/", protect, adminOnly, c.createTournament);
router.get("/:id", optionalAuth, c.getTournament);
router.put("/:id", protect, adminOnly, c.updateTournament);
router.delete("/:id", protect, adminOnly, c.deleteTournament);
router.put("/:id/staff", protect, adminOnly, c.assignStaff);
router.post("/:id/register", protect, c.registerTournament);

router.get("/:id/matches", optionalAuth, c.getMatches);
router.get("/:id/registrations", protect, adminOrPosStaff, c.getRegistrations);
router.post("/:id/matches/generate", protect, adminOrPosStaff, c.generateBracket);
router.post("/:id/matches", protect, adminOrPosStaff, c.createMatch);
router.delete("/:id/matches", protect, adminOnly, c.resetMatches);

router.get("/:id/results/suggest", protect, adminOrPosStaff, c.suggestResults);
router.post("/:id/results/publish", protect, adminOnly, c.publishResults);
router.put("/:id/results/unpublish", protect, adminOnly, c.unpublishResults);

module.exports = router;
