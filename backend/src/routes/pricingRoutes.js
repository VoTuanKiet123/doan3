const express = require('express');
const router = express.Router();
const {
  getPricingRules,
  createPricingRule,
  updatePricingRule,
  deletePricingRule,
  togglePricingRule,
  previewPrice,
} = require('../controllers/pricingController');
const { protect, adminOnly } = require('../middleware/auth');

// Public: lấy danh sách rule (frontend cần để hiển thị thông tin giá)
router.get('/', getPricingRules);

// Private: preview giá trước khi đặt sân
router.post('/preview', protect, previewPrice);

// Admin only: CRUD rules
router.post('/', protect, adminOnly, createPricingRule);
router.put('/:id', protect, adminOnly, updatePricingRule);
router.patch('/:id/toggle', protect, adminOnly, togglePricingRule);
router.delete('/:id', protect, adminOnly, deletePricingRule);

module.exports = router;
