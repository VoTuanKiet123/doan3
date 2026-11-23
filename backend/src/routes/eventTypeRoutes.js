const express = require("express");
const router = express.Router();
const {
  getEventTypes,
  saveEventType,
  updateEventType,
} = require("../controllers/eventController");
const { protect, adminOnly } = require("../middleware/auth");

router.get("/", getEventTypes);
router.post("/", protect, adminOnly, saveEventType);
router.put("/:id", protect, adminOnly, updateEventType);

module.exports = router;
