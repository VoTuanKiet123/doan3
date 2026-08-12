/**
 * VNPay Controller – Xử lý thanh toán online (redirect) & POS (QR code).
 * Dùng chung 1 endpoint IPN cho cả 2 luồng.
 */
const mongoose = require("mongoose");
const crypto = require("crypto");
const Booking = require("../models/Booking");
const Transaction = require("../models/Transaction");
const ShiftReport = require("../models/ShiftReport");
const ServiceOrder = require("../models/ServiceOrder");
const { buildPaymentUrl, verifyCallback } = require("../services/vnpayService");

// ============ HELPERS ============

const getVietnamTime = () => {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }),
  );
};

/**
 * Sinh orderId duy nhất: TxnRef_YYYYMMDD_HHmmss_XXXX
 */
const generateOrderId = () => {
  const now = getVietnamTime();
  const dateStr =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");
  const timeStr =
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0");
  const random = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `TXNREF_${dateStr}_${timeStr}_${random}`;
};

// ============================================================
//  1. TẠO THANH TOÁN ONLINE (REDIRECT FLOW)
// ============================================================

/**
 * POST /api/vnpay/create-payment
 * Body: { bookingId, amount, orderInfo }
 * Tạo Transaction pending + build URL redirect VNPay.
 */
const createPayment = async (req, res) => {
  try {
    const { bookingId, amount, orderInfo } = req.body;

    if (!bookingId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin: bookingId, amount",
      });
    }

    // Kiểm tra booking tồn tại
    const booking = await Booking.findById(bookingId).populate("court", "name");
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy booking",
      });
    }

    // Chỉ cho phép thanh toán khi booking ở trạng thái pending hoặc confirmed
    if (!["pending", "confirmed"].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Không thể thanh toán. Trạng thái hiện tại: ${booking.status}`,
      });
    }

    const orderId = generateOrderId();
    const ipAddr =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.connection?.remoteAddress ||
      "127.0.0.1";

    const description =
      orderInfo ||
      `Thanh toan dat san ${booking.court?.name || ""} - ${booking.date}`;

    // Tạo Transaction pending
    const transaction = await Transaction.create({
      orderId,
      booking: booking._id,
      amount,
      paymentMethod: "vnpay",
      type: "payment",
      status: "pending",
      description,
      customer: booking.user,
      customerName: req.user?.name || "",
      customerPhone: booking.customerPhone || "",
    });

    // Build URL thanh toán VNPay
    const { paymentUrl } = buildPaymentUrl({
      orderId,
      amount,
      orderInfo: description,
      ipAddr,
    });

    res.json({
      success: true,
      paymentUrl,
      transaction: {
        _id: transaction._id,
        orderId: transaction.orderId,
        amount: transaction.amount,
        status: transaction.status,
      },
    });
  } catch (error) {
    console.error("[VNPay] createPayment error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
//  2. TẠO THANH TOÁN QR CHO POS (VNPAY-QR)
// ============================================================

/**
 * POST /api/vnpay/create-qr
 * Body: { bookingId, amount, orderInfo, shiftId }
 * Tạo Transaction pending + trả về URL QR VNPay cho POS.
 * Không redirect, hiển thị QR tại quầy.
 */
const createQrPayment = async (req, res) => {
  try {
    const { bookingId, amount, orderInfo, shiftId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin: amount",
      });
    }

    const orderId = generateOrderId();
    const ipAddr =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.connection?.remoteAddress ||
      "127.0.0.1";

    const description = orderInfo || `Thanh toan POS - ${orderId}`;

    // Tạo Transaction pending
    const transaction = await Transaction.create({
      orderId,
      booking: bookingId || null,
      amount,
      paymentMethod: "vnpay",
      type: "payment",
      status: "pending",
      description,
      customerName: req.body.customerName || "Khách POS",
      customerPhone: req.body.customerPhone || "",
      staff: req.user?._id,
      staffName: req.user?.name || "",
      shift: shiftId || null,
      // Lưu metadata để xử lý khi IPN về
      metadata: {
        source: "pos",
        shiftId: shiftId || null,
        bookingId: bookingId || null,
      },
    });

    // Build URL thanh toán VNPay (dùng để tạo QR)
    const { paymentUrl } = buildPaymentUrl({
      orderId,
      amount,
      orderInfo: description,
      ipAddr,
    });

    res.json({
      success: true,
      paymentUrl, // Frontend dùng URL này để tạo QR code
      transaction: {
        _id: transaction._id,
        orderId: transaction.orderId,
        amount: transaction.amount,
        status: transaction.status,
      },
    });
  } catch (error) {
    console.error("[VNPay] createQrPayment error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
//  3. XỬ LÝ RETURN URL (REDIRECT TỪ VNPAY)
// ============================================================

/**
 * GET /api/vnpay/return
 * VNPay redirect khách về đây sau khi thanh toán.
 * CHỈ hiển thị UI "đang xử lý", KHÔNG xác nhận thanh toán ở đây.
 * Việc xác nhận thật được thực hiện ở IPN.
 */
const handleReturnUrl = async (req, res) => {
  try {
    const verifyResult = verifyCallback(req.query);

    if (!verifyResult.isValid) {
      // Redirect về frontend với lỗi
      return res.redirect(
        `${process.env.FRONTEND_URL || "http://localhost:5173"}/payment/result?status=failed&message=${encodeURIComponent(verifyResult.message)}`,
      );
    }

    const { txnRef, responseCode } = verifyResult.data;

    // Tìm transaction
    const transaction = await Transaction.findOne({ orderId: txnRef });

    if (!transaction) {
      return res.redirect(
        `${process.env.FRONTEND_URL || "http://localhost:5173"}/payment/result?status=failed&message=Không+tìm+thấy+giao+dịch`,
      );
    }

    // Redirect về frontend với trạng thái pending (chờ IPN xác nhận)
    const redirectUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/payment/result?orderId=${txnRef}&status=${responseCode === "00" ? "processing" : "failed"}&responseCode=${responseCode}`;

    res.redirect(redirectUrl);
  } catch (error) {
    console.error("[VNPay] handleReturnUrl error:", error);
    res.redirect(
      `${process.env.FRONTEND_URL || "http://localhost:5173"}/payment/result?status=error`,
    );
  }
};

// ============================================================
//  4. XỬ LÝ IPN (INSTANT PAYMENT NOTIFICATION)
// ============================================================

/**
 * GET /api/vnpay/ipn
 * VNPay gọi ngầm endpoint này để xác nhận thanh toán.
 * Đây là nơi xử lý THẬT: verify chữ ký, cập nhật Transaction + Booking.
 */
const handleIpnUrl = async (req, res) => {
  try {
    const verifyResult = verifyCallback(req.query);

    if (!verifyResult.isValid) {
      console.warn("[VNPay IPN] Chữ ký không hợp lệ:", verifyResult.message);
      return res.json({ RspCode: "97", Message: "Invalid signature" });
    }

    const { txnRef, responseCode, transactionNo, bankCode, payDate, amount } =
      verifyResult.data;

    // Tìm transaction
    const transaction = await Transaction.findOne({ orderId: txnRef });

    if (!transaction) {
      console.warn(`[VNPay IPN] Không tìm thấy transaction: ${txnRef}`);
      return res.json({ RspCode: "01", Message: "Order not found" });
    }

    // === IDEMPOTENT CHECK: Nếu đã success rồi thì trả về "02" ===
    if (transaction.status === "success") {
      console.log(
        `[VNPay IPN] Transaction ${txnRef} đã được xác nhận trước đó`,
      );
      return res.json({
        RspCode: "02",
        Message: "Order already confirmed",
      });
    }

    // Cập nhật transaction
    transaction.vnpTransactionNo = transactionNo || "";
    transaction.vnpResponseCode = responseCode || "";
    transaction.vnpBankCode = bankCode || "";
    transaction.paidAt = payDate
      ? new Date(
          payDate.replace(
            /(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/,
            "$1-$2-$3T$4:$5:$6+07:00",
          ),
        )
      : getVietnamTime();

    if (responseCode === "00") {
      // === THANH TOÁN THÀNH CÔNG ===
      transaction.status = "success";

      // Cập nhật Booking nếu có
      if (transaction.booking) {
        const booking = await Booking.findById(transaction.booking);
        if (booking) {
          booking.paymentStatus = "paid";

          // Nếu là POS QR → tự động check-out luôn
          if (transaction.metadata?.source === "pos") {
            booking.status = "checked_out";
            booking.checkedOutAt = getVietnamTime();
            booking.checkedOutBy = transaction.staff;
            booking.finalBillAmount = transaction.amount;
            booking.paymentStatus = "paid";

            // Cập nhật shift nếu có
            if (transaction.metadata?.shiftId) {
              await ShiftReport.findByIdAndUpdate(
                transaction.metadata.shiftId,
                {
                  $inc: { totalTransferIn: transaction.amount },
                },
              );
            }

            // Cập nhật service orders → paid
            await ServiceOrder.updateMany(
              { booking: booking._id, status: "pending" },
              {
                $set: {
                  status: "paid",
                  paymentMethod: "vnpay",
                  paidAt: getVietnamTime(),
                },
              },
            );
          }

          await booking.save();
        }
      }

      console.log(
        `[VNPay IPN] ✅ Thanh toán thành công: ${txnRef} - ${amount}đ`,
      );
      await transaction.save();
      return res.json({ RspCode: "00", Message: "Confirm success" });
    } else {
      // === THANH TOÁN THẤT BẠI ===
      transaction.status = "failed";
      console.log(
        `[VNPay IPN] ❌ Thanh toán thất bại: ${txnRef} - ResponseCode: ${responseCode}`,
      );
      await transaction.save();
      return res.json({ RspCode: "00", Message: "Confirm success" });
    }
  } catch (error) {
    console.error("[VNPay IPN] Lỗi xử lý:", error);
    return res.json({ RspCode: "99", Message: "Unknown error" });
  }
};

// ============================================================
//  5. KIỂM TRA TRẠNG THÁI GIAO DỊCH (POLLING)
// ============================================================

/**
 * GET /api/vnpay/check-status/:orderId
 * Frontend POS polling để kiểm tra trạng thái thanh toán QR.
 */
const checkPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    const transaction = await Transaction.findOne({ orderId }).select(
      "orderId status amount vnpResponseCode vnpTransactionNo paidAt",
    );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy giao dịch",
      });
    }

    res.json({
      success: true,
      status: transaction.status,
      orderId: transaction.orderId,
      amount: transaction.amount,
      vnpResponseCode: transaction.vnpResponseCode,
      vnpTransactionNo: transaction.vnpTransactionNo,
      paidAt: transaction.paidAt,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
//  6. LẤY LỊCH SỬ GIAO DỊCH VNPay
// ============================================================

/**
 * GET /api/vnpay/transactions
 * Lấy danh sách giao dịch VNPay (admin).
 */
const getVnpayTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = { paymentMethod: "vnpay" };
    if (status) query.status = status;

    const transactions = await Transaction.find(query)
      .populate("booking", "date startTime endTime court")
      .populate("customer", "name phone")
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(query);

    res.json({
      success: true,
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
//  CRON JOB: QUÉT GIAO DỊCH PENDING HẾT HẠN
// ============================================================

const PENDING_TIMEOUT_MINUTES = 15; // 15 phút

/**
 * Quét Transaction VNPay pending quá hạn → chuyển failed.
 * Gọi từ cron job trong server.js
 */
const cleanupExpiredTransactions = async () => {
  const now = getVietnamTime();
  const expiredTime = new Date(now.getTime() - PENDING_TIMEOUT_MINUTES * 60000);

  const result = await Transaction.updateMany(
    {
      paymentMethod: "vnpay",
      status: "pending",
      createdAt: { $lte: expiredTime },
    },
    {
      $set: {
        status: "failed",
        description: "Giao dịch hết hạn (không thanh toán trong 15 phút)",
      },
    },
  );

  if (result.modifiedCount > 0) {
    console.log(
      `[VNPay Cleanup] Đã chuyển ${result.modifiedCount} giao dịch VNPay hết hạn → failed`,
    );
  }

  return result.modifiedCount || 0;
};

module.exports = {
  createPayment,
  createQrPayment,
  handleReturnUrl,
  handleIpnUrl,
  checkPaymentStatus,
  getVnpayTransactions,
  cleanupExpiredTransactions,
};
