const express = require('express');
const router = express.Router();
const { getBookings, getBookingById, createBooking, updateBookingStatus, cancelBooking } = require('../controllers/bookingController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', protect, getBookings);
router.get('/:id', protect, getBookingById);
router.post('/', protect, createBooking);
router.put('/:id/status', protect, adminOnly, updateBookingStatus);
router.delete('/:id', protect, cancelBooking);

module.exports = router;
