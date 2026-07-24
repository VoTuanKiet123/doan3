const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Không có quyền truy cập" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Token không hợp lệ" });
    }
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, message: "Token không hợp lệ hoặc đã hết hạn" });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    return res
      .status(403)
      .json({ success: false, message: "Chỉ admin mới có quyền thực hiện" });
  }
};

// Cho phép cả admin và pos_staff
const adminOrPosStaff = (req, res, next) => {
  if (
    req.user &&
    (req.user.role === "admin" || req.user.role === "pos_staff")
  ) {
    next();
  } else {
    return res
      .status(403)
      .json({ success: false, message: "Không có quyền thực hiện" });
  }
};

// Chỉ pos_staff (có thể mở rộng cho admin nếu muốn)
const posStaffOnly = (req, res, next) => {
  if (req.user && req.user.role === "pos_staff") {
    next();
  } else if (req.user && req.user.role === "admin") {
    // Admin cũng có thể làm mọi thao tác của POS staff
    next();
  } else {
    return res
      .status(403)
      .json({
        success: false,
        message: "Chỉ nhân viên POS mới có quyền thực hiện",
      });
  }
};

module.exports = { protect, adminOnly, adminOrPosStaff, posStaffOnly };
