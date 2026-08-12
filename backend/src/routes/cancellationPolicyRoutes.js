const express = require("express");
const router = express.Router();
const {
  getPolicy,
  getAllPolicies,
  createPolicy,
  updatePolicy,
  deletePolicy,
} = require("../controllers/cancellationPolicyController");
const { protect, adminOnly } = require("../middleware/auth");

// Public: POS staff cần đọc policy để biết % hoàn tiền
router.get("/", protect, getPolicy);

// Admin only
router.get("/all", protect, adminOnly, getAllPolicies);
router.post("/", protect, adminOnly, createPolicy);
router.put("/:id", protect, adminOnly, updatePolicy);
router.delete("/:id", protect, adminOnly, deletePolicy);

module.exports = router;
