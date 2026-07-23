const express = require('express');
const router = express.Router();
const { getCourts, getCourtById, createCourt, updateCourt, deleteCourt } = require('../controllers/courtController');
const { getCourtReviews } = require('../controllers/bookingController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', getCourts);
router.get('/:id', getCourtById);
router.get('/:id/reviews', getCourtReviews);
router.post('/', protect, adminOnly, createCourt);
router.put('/:id', protect, adminOnly, updateCourt);
router.delete('/:id', protect, adminOnly, deleteCourt);

module.exports = router;
