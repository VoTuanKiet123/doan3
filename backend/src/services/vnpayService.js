/**
 * VNPay Service – Xử lý build URL thanh toán, verify IPN/Return.
 * Dùng chung cho luồng Online (Redirect) và POS (QR Code).
 */
const crypto = require("crypto");
const qs = require("querystring");

// ============ CONFIG ============
const VNP_TMN_CODE = process.env.VNP_TMN_CODE;
const VNP_HASH_SECRET = process.env.VNP_HASH_SECRET;
const VNP_URL = process.env.VNP_URL;
const VNP_RETURN_URL = process.env.VNP_RETURN_URL;
const VNP_IPN_URL = process.env.VNP_IPN_URL;
const VNP_VERSION = "2.1.0";
const VNP_CURRENCY = "VND";
const VNP_LOCALE = "vn";

/**
 * Format ngày giờ theo chuẩn VNPay: yyyyMMddHHmmss (UTC+7)
 */
const getVnpDate = (date = new Date()) => {
  // Lấy giờ VN (UTC+7)
  const vnDate = new Date(
    date.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }),
  );
  const y = vnDate.getFullYear();
  const m = String(vnDate.getMonth() + 1).padStart(2, "0");
  const d = String(vnDate.getDate()).padStart(2, "0");
  const h = String(vnDate.getHours()).padStart(2, "0");
  const min = String(vnDate.getMinutes()).padStart(2, "0");
  const s = String(vnDate.getSeconds()).padStart(2, "0");
  return `${y}${m}${d}${h}${min}${s}`;
};

/**
 * Sắp xếp object theo alphabet key, build query string, ký HMAC SHA512.
 * @param {Object} params - Các tham số cần ký
 * @returns {string} - vnp_SecureHash
 */
const signParams = (params) => {
  const sorted = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      // Bỏ qua vnp_SecureHash và vnp_SecureHashType nếu có
      if (key === "vnp_SecureHash" || key === "vnp_SecureHashType") return acc;
      const val = params[key];
      if (val !== null && val !== undefined && val !== "") {
        acc[key] = val;
      }
      return acc;
    }, {});

  const queryString = qs.stringify(sorted, undefined, undefined, {
    encodeURIComponent: (str) => str, // VNPay cần encode đặc biệt
  });

  // Encode theo chuẩn VNPay (giữ nguyên ký tự đặc biệt nhưng encode space, etc.)
  const encodedQuery = Object.keys(sorted)
    .sort()
    .map((key) => {
      const val = encodeURIComponent(sorted[key]).replace(/%20/g, "+");
      return `${key}=${val}`;
    })
    .join("&");

  const hmac = crypto.createHmac("sha512", VNP_HASH_SECRET);
  hmac.update(Buffer.from(encodedQuery, "utf-8"));
  return hmac.digest("hex");
};

/**
 * Build URL thanh toán VNPay đầy đủ.
 * @param {Object} options
 * @param {string} options.orderId - Mã đơn hàng duy nhất (vnp_TxnRef)
 * @param {number} options.amount - Số tiền (VND)
 * @param {string} options.orderInfo - Mô tả đơn hàng
 * @param {string} options.ipAddr - IP của khách
 * @param {string} [options.returnUrl] - URL redirect (nếu khác mặc định)
 * @param {string} [options.bankCode] - Mã ngân hàng (optional, để trống = chọn tất cả)
 * @returns {Object} { paymentUrl, params }
 */
const buildPaymentUrl = (options) => {
  const { orderId, amount, orderInfo, ipAddr, returnUrl, bankCode } = options;

  const createDate = getVnpDate();

  const params = {
    vnp_Version: VNP_VERSION,
    vnp_Command: "pay",
    vnp_TmnCode: VNP_TMN_CODE,
    vnp_Amount: String(Math.round(amount * 100)), // Nhân 100 (VNPay tính theo đơn vị nhỏ nhất)
    vnp_CurrCode: VNP_CURRENCY,
    vnp_TxnRef: orderId,
    vnp_OrderInfo: orderInfo.substring(0, 255), // Giới hạn 255 ký tự
    vnp_OrderType: "other",
    vnp_Locale: VNP_LOCALE,
    vnp_ReturnUrl: returnUrl || VNP_RETURN_URL,
    vnp_IpAddr: ipAddr || "127.0.0.1",
    vnp_CreateDate: createDate,
  };

  if (bankCode) {
    params.vnp_BankCode = bankCode;
  }

  const secureHash = signParams(params);
  params.vnp_SecureHash = secureHash;
  params.vnp_SecureHashType = "SHA512";

  // Build URL đầy đủ
  const queryString = Object.keys(params)
    .map(
      (key) => `${key}=${encodeURIComponent(params[key]).replace(/%20/g, "+")}`,
    )
    .join("&");

  const paymentUrl = `${VNP_URL}?${queryString}`;

  return { paymentUrl, params };
};

/**
 * Verify chữ ký trả về từ VNPay (dùng cho cả Return URL và IPN).
 * @param {Object} queryParams - Toàn bộ query params VNPay gửi về
 * @returns {Object} { isValid, message, data }
 */
const verifyCallback = (queryParams) => {
  const { vnp_SecureHash, vnp_SecureHashType, ...rest } = queryParams;

  if (!vnp_SecureHash) {
    return {
      isValid: false,
      message: "Thiếu chữ ký bảo mật (vnp_SecureHash)",
      data: null,
    };
  }

  // Tính lại chữ ký từ các params còn lại
  const computedHash = signParams(rest);

  const isValid = computedHash.toLowerCase() === vnp_SecureHash.toLowerCase();

  if (!isValid) {
    return {
      isValid: false,
      message: "Chữ ký không hợp lệ – dữ liệu có thể đã bị giả mạo",
      data: rest,
    };
  }

  return {
    isValid: true,
    message: "Chữ ký hợp lệ",
    data: {
      txnRef: rest.vnp_TxnRef,
      amount: parseInt(rest.vnp_Amount) / 100,
      bankCode: rest.vnp_BankCode || "",
      bankTranNo: rest.vnp_BankTranNo || "",
      cardType: rest.vnp_CardType || "",
      payDate: rest.vnp_PayDate || "",
      orderInfo: rest.vnp_OrderInfo || "",
      responseCode: rest.vnp_ResponseCode || "",
      tmnCode: rest.vnp_TmnCode || "",
      transactionNo: rest.vnp_TransactionNo || "",
      transactionStatus: rest.vnp_TransactionStatus || "",
      secureHash: vnp_SecureHash,
    },
  };
};

module.exports = {
  buildPaymentUrl,
  verifyCallback,
  signParams,
  getVnpDate,
};
