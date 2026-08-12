const PricingRule = require('../models/PricingRule');
const Court = require('../models/Court');
const { getPriceForBooking } = require('../services/pricingService');

// @desc    Lấy tất cả quy tắc giá
// @route   GET /api/pricing
const getPricingRules = async (req, res) => {
  try {
    const rules = await PricingRule.find().sort({ priority: -1, createdAt: -1 });
    res.json({ success: true, count: rules.length, rules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Tạo quy tắc giá mới
// @route   POST /api/pricing
const createPricingRule = async (req, res) => {
  try {
    const { name, type, daysOfWeek, startHour, endHour, priceMultiplier, priority, isActive } = req.body;

    if (!name || !type || !daysOfWeek || startHour === undefined || endHour === undefined || !priceMultiplier) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin quy tắc giá' });
    }

    if (Number(startHour) >= Number(endHour)) {
      return res.status(400).json({ success: false, message: 'Giờ bắt đầu phải nhỏ hơn giờ kết thúc' });
    }

    const rule = await PricingRule.create({
      name,
      type,
      daysOfWeek,
      startHour: Number(startHour),
      endHour: Number(endHour),
      priceMultiplier: Number(priceMultiplier),
      priority: priority ? Number(priority) : 1,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({ success: true, message: 'Tạo quy tắc giá thành công', rule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Cập nhật quy tắc giá
// @route   PUT /api/pricing/:id
const updatePricingRule = async (req, res) => {
  try {
    const { name, type, daysOfWeek, startHour, endHour, priceMultiplier, priority, isActive } = req.body;

    if (startHour !== undefined && endHour !== undefined) {
      if (Number(startHour) >= Number(endHour)) {
        return res.status(400).json({ success: false, message: 'Giờ bắt đầu phải nhỏ hơn giờ kết thúc' });
      }
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (daysOfWeek !== undefined) updateData.daysOfWeek = daysOfWeek;
    if (startHour !== undefined) updateData.startHour = Number(startHour);
    if (endHour !== undefined) updateData.endHour = Number(endHour);
    if (priceMultiplier !== undefined) updateData.priceMultiplier = Number(priceMultiplier);
    if (priority !== undefined) updateData.priority = Number(priority);
    if (isActive !== undefined) updateData.isActive = isActive;

    const rule = await PricingRule.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });

    if (!rule) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy quy tắc giá' });
    }

    res.json({ success: true, message: 'Cập nhật quy tắc giá thành công', rule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Xóa quy tắc giá
// @route   DELETE /api/pricing/:id
const deletePricingRule = async (req, res) => {
  try {
    const rule = await PricingRule.findByIdAndDelete(req.params.id);
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy quy tắc giá' });
    }
    res.json({ success: true, message: 'Xóa quy tắc giá thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle bật/tắt quy tắc giá nhanh
// @route   PATCH /api/pricing/:id/toggle
const togglePricingRule = async (req, res) => {
  try {
    const rule = await PricingRule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy quy tắc giá' });
    }
    rule.isActive = !rule.isActive;
    await rule.save();
    res.json({
      success: true,
      message: `Quy tắc giá đã được ${rule.isActive ? 'kích hoạt' : 'tắt'}`,
      rule,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Tính giá preview (không tạo booking) - dùng để hiển thị hóa đơn tạm tính
// @route   POST /api/pricing/preview
const previewPrice = async (req, res) => {
  try {
    const { courtId, date, startTime, endTime } = req.body;

    if (!courtId || !date || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin' });
    }

    const court = await Court.findById(courtId);
    if (!court) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sân' });
    }

    const result = await getPriceForBooking(court.pricePerHour, date, startTime, endTime);

    res.json({
      success: true,
      basePrice: court.pricePerHour,
      ...result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPricingRules,
  createPricingRule,
  updatePricingRule,
  deletePricingRule,
  togglePricingRule,
  previewPrice,
};
