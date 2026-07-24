const CancellationPolicy = require("../models/CancellationPolicy");

// @desc    Lấy chính sách huỷ hiện tại (admin)
// @route   GET /api/cancellation-policy
const getPolicy = async (req, res) => {
  try {
    const policy = await CancellationPolicy.findOne({ isActive: true }).sort({
      createdAt: -1,
    });
    if (!policy) {
      return res.json({
        success: true,
        policy: null,
        message: "Chưa có chính sách huỷ nào",
      });
    }
    res.json({ success: true, policy });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Lấy tất cả chính sách (admin)
// @route   GET /api/cancellation-policy/all
const getAllPolicies = async (req, res) => {
  try {
    const policies = await CancellationPolicy.find().sort({ createdAt: -1 });
    res.json({ success: true, count: policies.length, policies });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Tạo chính sách huỷ mới (admin)
// @route   POST /api/cancellation-policy
const createPolicy = async (req, res) => {
  try {
    const { name, rules, noShowMinutes, description } = req.body;

    if (!rules || !Array.isArray(rules) || rules.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Vui lòng thêm ít nhất 1 rule" });
    }

    // Validate rules
    for (const rule of rules) {
      if (rule.hoursBefore === undefined || rule.refundPercent === undefined) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Mỗi rule cần hoursBefore và refundPercent",
          });
      }
      if (rule.refundPercent < 0 || rule.refundPercent > 100) {
        return res
          .status(400)
          .json({ success: false, message: "refundPercent phải từ 0-100" });
      }
    }

    // Nếu set active, deactivate các policy cũ
    if (req.body.isActive !== false) {
      await CancellationPolicy.updateMany(
        { isActive: true },
        { isActive: false },
      );
    }

    const policy = await CancellationPolicy.create({
      name: name || "Chính sách huỷ",
      isActive: true,
      rules: rules.sort((a, b) => b.hoursBefore - a.hoursBefore),
      noShowMinutes: noShowMinutes || 15,
      description: description || "",
    });

    res
      .status(201)
      .json({
        success: true,
        message: "Tạo chính sách huỷ thành công",
        policy,
      });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Cập nhật chính sách huỷ (admin)
// @route   PUT /api/cancellation-policy/:id
const updatePolicy = async (req, res) => {
  try {
    const policy = await CancellationPolicy.findById(req.params.id);
    if (!policy) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy chính sách" });
    }

    if (req.body.name) policy.name = req.body.name;
    if (req.body.rules) {
      policy.rules = req.body.rules.sort(
        (a, b) => b.hoursBefore - a.hoursBefore,
      );
    }
    if (req.body.noShowMinutes !== undefined)
      policy.noShowMinutes = req.body.noShowMinutes;
    if (req.body.description !== undefined)
      policy.description = req.body.description;
    if (req.body.isActive !== undefined) {
      if (req.body.isActive) {
        await CancellationPolicy.updateMany(
          { _id: { $ne: policy._id }, isActive: true },
          { isActive: false },
        );
      }
      policy.isActive = req.body.isActive;
    }

    await policy.save();
    res.json({
      success: true,
      message: "Cập nhật chính sách thành công",
      policy,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Xoá chính sách (admin)
// @route   DELETE /api/cancellation-policy/:id
const deletePolicy = async (req, res) => {
  try {
    const policy = await CancellationPolicy.findByIdAndDelete(req.params.id);
    if (!policy) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy chính sách" });
    }
    res.json({ success: true, message: "Xoá chính sách thành công" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPolicy,
  getAllPolicies,
  createPolicy,
  updatePolicy,
  deletePolicy,
};
