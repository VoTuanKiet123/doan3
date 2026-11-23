const express = require("express");
const router = express.Router();
const {
  getMyRegistrations,
  cancel,
} = require("../controllers/eventController");
const { protect, adminOnly } = require("../middleware/auth");

router.get("/mine", protect, getMyRegistrations);
router.put("/:id/cancel", protect, adminOnly, cancel);

module.exports = router;
