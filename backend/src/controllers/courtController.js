const Court = require('../models/Court');

// @desc    Lấy tất cả sân
// @route   GET /api/courts
const getCourts = async (req, res) => {
  try {
    const courts = await Court.find().sort({ createdAt: -1 });
    res.json({ success: true, count: courts.length, courts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Lấy chi tiết một sân
// @route   GET /api/courts/:id
const getCourtById = async (req, res) => {
  try {
    const court = await Court.findById(req.params.id);
    if (!court) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sân' });
    }
    res.json({ success: true, court });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Thêm sân mới (admin)
// @route   POST /api/courts
const createCourt = async (req, res) => {
  try {
    const court = await Court.create(req.body);
    res.status(201).json({ success: true, message: 'Thêm sân thành công', court });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Cập nhật sân (admin)
// @route   PUT /api/courts/:id
const updateCourt = async (req, res) => {
  try {
    const court = await Court.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!court) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sân' });
    }
    res.json({ success: true, message: 'Cập nhật sân thành công', court });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Xóa sân (admin)
// @route   DELETE /api/courts/:id
const deleteCourt = async (req, res) => {
  try {
    const court = await Court.findByIdAndDelete(req.params.id);
    if (!court) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sân' });
    }
    res.json({ success: true, message: 'Xóa sân thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getCourts, getCourtById, createCourt, updateCourt, deleteCourt };
