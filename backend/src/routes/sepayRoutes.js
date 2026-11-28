const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");

const buildCheckInCode = (id) =>
  `BHUB-${String(id).slice(-6).toUpperCase()}`;

// @desc    Nhận biến động số dư từ SePay Webhook để tự động xác nhận thanh toán
// @route   POST /api/webhooks/sepay
router.post("/sepay", async (req, res) => {
  try {
    // 1. Xác thực API Key từ SePay (Header: Authorization: Apikey <KEY>)
    const expectedKey = (process.env.SEPAY_API_KEY || "").trim();
    if (expectedKey) {
      const authHeader = String(req.headers.authorization || "").trim();
      const match = authHeader.match(/^Apikey\s+(.+)$/i);
      const providedKey = match ? match[1].trim() : "";
      if (providedKey !== expectedKey) {
        return res
          .status(401)
          .json({ success: false, message: "Sai SePay API Key" });
      }
    }

    const { transferType, transferAmount, content, code, description } =
      req.body || {};

    // 2. Chỉ xử lý giao dịch tiền VÀO
    if (transferType !== "in") {
      return res.json({ success: true, message: "Bỏ qua giao dịch tiền ra" });
    }

    const amount = Number(transferAmount) || 0;
    const rawText = `${code || ""} ${content || ""} ${description || ""}`
      .toUpperCase()
      .trim();

    // 3. Tìm mã đơn dạng BHUB XXXXXX hoặc BHUBXXXXXX
    const codeMatch = rawText.match(/BHUB[\s\-_]*([0-9A-F]{6})/);
    if (!codeMatch) {
      return res.json({
        success: true,
        message: "Không tìm thấy mã đơn BHUB trong nội dung chuyển khoản",
      });
    }

    const hex6 = codeMatch[1];
    const checkInCode = `BHUB-${hex6}`;

    // 4. Tìm booking tương ứng
    let booking = await Booking.findOne({ checkInCode });
    if (!booking) {
      const recentList = await Booking.find({
        status: { $in: ["pending", "cancelled"] },
      })
        .sort({ createdAt: -1 })
        .limit(100);
      booking = recentList.find(
        (b) => b._id.toString().slice(-6).toUpperCase() === hex6,
      );
    }

    if (!booking) {
      return res.json({
        success: true,
        message: `Không tìm thấy booking khớp mã ${checkInCode}`,
      });
    }

    // 5. Nếu đã thanh toán trước đó (tránh xử lý trùng khi SePay retry)
    if (booking.paymentStatus === "paid" && booking.status === "confirmed") {
      return res.json({
        success: true,
        message: "Đơn này đã được thanh toán trước đó",
      });
    }

    // 6. Chặn xác nhận nếu đơn đã bị hủy hoặc đã quá thời gian hết hạn mã QR
    if (
      booking.status === "cancelled" ||
      (booking.expiresAt && new Date(booking.expiresAt).getTime() < Date.now())
    ) {
      if (booking.status === "pending") {
        booking.status = "cancelled";
        await booking.save();
      }
      console.warn(
        `[SePay] ⚠️ Nhận ${amount}đ cho đơn đã hết hạn/hủy ${checkInCode} — không tự xác nhận để tránh trùng lịch.`,
      );
      return res.json({
        success: true,
        message: "Đơn đặt sân đã hết hạn hoặc đã hủy",
      });
    }

    // 7. Kiểm tra số tiền chuyển vào phải đủ tiền sân
    if (amount < booking.totalPrice) {
      console.warn(
        `[SePay] Thiếu tiền cho đơn ${checkInCode}: nhận ${amount}đ / cần ${booking.totalPrice}đ`,
      );
      return res.json({
        success: true,
        message: "Số tiền chuyển khoản nhỏ hơn tổng tiền đơn",
      });
    }

    // 8. Tự động xác nhận đơn & mở khóa vé QR Check-in
    booking.status = "confirmed";
    booking.paymentStatus = "paid";
    booking.expiresAt = null;
    if (!booking.checkInCode) {
      booking.checkInCode = buildCheckInCode(booking._id);
    }
    await booking.save();

    console.log(
      `[SePay] ✅ Đã tự động xác nhận đơn ${booking.checkInCode} (+${amount.toLocaleString("vi-VN")}đ)`,
    );

    return res.status(200).json({
      success: true,
      message: "Đã xác nhận thanh toán thành công",
      checkInCode: booking.checkInCode,
    });
  } catch (error) {
    console.error("[SePay Webhook Error]:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;