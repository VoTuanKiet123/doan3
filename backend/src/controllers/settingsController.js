const SystemSettings = require("../models/SystemSettings");

// @desc    Lấy cấu hình hệ thống (public fields)
// @route   GET /api/settings
const getSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Lấy cấu hình hệ thống (đầy đủ, chỉ admin)
// @route   GET /api/settings/admin
const getAdminSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Cập nhật cấu hình hệ thống (chỉ admin)
// @route   PUT /api/settings/admin
const updateSettings = async (req, res) => {
  try {
    const {
      floatAmount,
      venueName,
      venueAddress,
      venuePhone,
      openTime,
      closeTime,
    } = req.body;

    const updateFields = {};
    if (floatAmount !== undefined) {
      if (floatAmount < 0) {
        return res.status(400).json({
          success: false,
          message: "Quỹ định mức không được âm",
        });
      }
      updateFields.floatAmount = floatAmount;
    }
    if (venueName !== undefined) updateFields.venueName = venueName;
    if (venueAddress !== undefined) updateFields.venueAddress = venueAddress;
    if (venuePhone !== undefined) updateFields.venuePhone = venuePhone;
    if (openTime !== undefined) updateFields.openTime = openTime;
    if (closeTime !== undefined) updateFields.closeTime = closeTime;

    const settings = await SystemSettings.findOneAndUpdate(
      {},
      { $set: updateFields },
      { new: true, upsert: true },
    );

    res.json({
      success: true,
      message: "Đã cập nhật cấu hình hệ thống",
      settings,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Lấy floatAmount (dùng cho POS mở ca)
// @route   GET /api/settings/float-amount
const getFloatAmount = async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    res.json({
      success: true,
      floatAmount: settings.floatAmount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSettings,
  getAdminSettings,
  updateSettings,
  getFloatAmount,
};
