const RacketServiceTicket = require("../models/RacketServiceTicket");
const User = require("../models/User");

const { STATUSES, SERVICE_TYPES } = RacketServiceTicket;

// Chỉ giữ chữ số để so khớp SĐT ("0901 234 567" == "0901234567")
const normalizePhone = (p) => String(p || "").replace(/\D/g, "");

// Thông tin khách được phép xem (ẩn id nhân viên, ghi chú nội bộ)
const toCustomerView = (t) => ({
  _id: t._id,
  ticketCode: t.ticketCode,
  customerName: t.customerName,
  racketBrand: t.racketBrand,
  racketDescription: t.racketDescription,
  conditionAtReceive: t.conditionAtReceive,
  serviceType: t.serviceType,
  stringName: t.stringName,
  isCustomerString: t.isCustomerString,
  tensionLbs: t.tensionLbs,
  serviceFee: t.serviceFee,
  materialFee: t.materialFee,
  totalAmount: t.totalAmount,
  paymentStatus: t.paymentStatus,
  status: t.status,
  statusHistory: (t.statusHistory || []).map((h) => ({
    status: h.status,
    note: h.note,
    changedAt: h.changedAt,
  })),
  receivedAt: t.receivedAt,
  estimatedReadyAt: t.estimatedReadyAt,
  completedAt: t.completedAt,
  pickedUpAt: t.pickedUpAt,
});

// =====================================================================
// NHÂN VIÊN / ADMIN
// =====================================================================

// @desc    Tạo phiếu nhận vợt
// @route   POST /api/racket-services
// @access  admin, pos_staff
const createTicket = async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      racketBrand,
      racketDescription,
      conditionAtReceive,
      serviceType,
      stringName,
      isCustomerString,
      tensionLbs,
      serviceFee,
      materialFee,
      estimatedReadyAt,
      note,
    } = req.body;

    const phone = normalizePhone(customerPhone);
    if (phone.length < 9) {
      return res
        .status(400)
        .json({ success: false, message: "Số điện thoại khách không hợp lệ" });
    }

    // Liên kết tài khoản khách nếu có user cùng SĐT
    const users = await User.find({ phone: { $exists: true, $ne: null } }).select("phone");
    const matched = users.find((u) => normalizePhone(u.phone) === phone);

    const ticket = new RacketServiceTicket({
      customer: matched?._id || null,
      customerName,
      customerPhone: phone,
      racketBrand,
      racketDescription,
      conditionAtReceive,
      serviceType,
      stringName,
      isCustomerString: !!isCustomerString,
      tensionLbs: tensionLbs ? Number(tensionLbs) : undefined,
      serviceFee: Number(serviceFee) || 0,
      materialFee: isCustomerString ? 0 : Number(materialFee) || 0,
      estimatedReadyAt: estimatedReadyAt || undefined,
      note,
      receivedBy: req.user._id,
      status: "received",
      statusHistory: [
        { status: "received", note: "Đã tiếp nhận vợt tại quầy", changedBy: req.user._id },
      ],
    });
    await ticket.save();

    res.status(201).json({
      success: true,
      message: `Đã tạo phiếu ${ticket.ticketCode}`,
      ticket,
    });
  } catch (error) {
    const status = error.name === "ValidationError" ? 400 : 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

// @desc    Danh sách phiếu (lọc theo trạng thái, tìm theo mã / SĐT / tên)
// @route   GET /api/racket-services?status=&q=
// @access  admin, pos_staff
const getTickets = async (req, res) => {
  try {
    const { status, q } = req.query;
    const filter = {};
    if (status && STATUSES.includes(status)) filter.status = status;
    if (q && q.trim().length >= 2) {
      const text = q.trim();
      const digits = normalizePhone(text);
      const esc = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { ticketCode: { $regex: esc, $options: "i" } },
        { customerName: { $regex: esc, $options: "i" } },
        ...(digits.length >= 3 ? [{ customerPhone: { $regex: digits } }] : []),
      ];
    }
    const tickets = await RacketServiceTicket.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate("receivedBy", "name")
      .populate("statusHistory.changedBy", "name");
    res.json({ success: true, count: tickets.length, tickets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Chi tiết phiếu
// @route   GET /api/racket-services/:id
// @access  admin, pos_staff
const getTicketById = async (req, res) => {
  try {
    const ticket = await RacketServiceTicket.findById(req.params.id)
      .populate("receivedBy", "name")
      .populate("customer", "name email phone")
      .populate("statusHistory.changedBy", "name");
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Không tìm thấy phiếu" });
    }
    res.json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Cập nhật trạng thái thủ công (Đã nhận → Đang sửa → Đã sửa xong → Đã trả / Huỷ)
// @route   PUT /api/racket-services/:id/status
// @access  admin, pos_staff
const updateTicketStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: "Trạng thái không hợp lệ" });
    }
    const ticket = await RacketServiceTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Không tìm thấy phiếu" });
    }
    if (["picked_up", "cancelled"].includes(ticket.status) && ticket.status !== status) {
      return res.status(400).json({
        success: false,
        message: "Phiếu đã đóng (đã trả vợt hoặc đã huỷ), không thể đổi trạng thái",
      });
    }
    if (ticket.status === status && !note) {
      return res.status(400).json({ success: false, message: "Phiếu đã ở trạng thái này" });
    }

    const now = new Date();
    ticket.status = status;
    if (status === "completed" && !ticket.completedAt) ticket.completedAt = now;
    if (status === "picked_up") {
      ticket.pickedUpAt = now;
      if (!ticket.completedAt) ticket.completedAt = now;
    }
    ticket.statusHistory.push({ status, note, changedBy: req.user._id, changedAt: now });
    await ticket.save();

    res.json({ success: true, message: "Đã cập nhật trạng thái phiếu", ticket });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Sửa thông tin phiếu (giá, giờ hẹn, ghi chú...)
// @route   PUT /api/racket-services/:id
// @access  admin, pos_staff
const updateTicket = async (req, res) => {
  try {
    const ticket = await RacketServiceTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Không tìm thấy phiếu" });
    }
    const fields = [
      "customerName", "racketBrand", "racketDescription", "conditionAtReceive",
      "serviceType", "stringName", "isCustomerString", "tensionLbs",
      "serviceFee", "materialFee", "estimatedReadyAt", "note", "paymentStatus",
    ];
    for (const f of fields) {
      if (req.body[f] !== undefined) ticket[f] = req.body[f];
    }
    await ticket.save();
    res.json({ success: true, message: "Đã cập nhật phiếu", ticket });
  } catch (error) {
    const status = error.name === "ValidationError" ? 400 : 500;
    res.status(status).json({ success: false, message: error.message });
  }
};

// =====================================================================
// KHÁCH HÀNG
// =====================================================================

// @desc    Phiếu vợt của tôi (theo tài khoản hoặc SĐT của tài khoản)
// @route   GET /api/racket-services/my
// @access  đăng nhập
const getMyTickets = async (req, res) => {
  try {
    const phone = normalizePhone(req.user.phone);
    const or = [{ customer: req.user._id }];
    if (phone.length >= 9) or.push({ customerPhone: phone });
    const tickets = await RacketServiceTicket.find({ $or: or }).sort({ createdAt: -1 });
    res.json({ success: true, count: tickets.length, tickets: tickets.map(toCustomerView) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Tra cứu phiếu bằng mã phiếu + SĐT (không cần đăng nhập)
// @route   GET /api/racket-services/lookup?code=&phone=
// @access  public — bắt buộc đủ cả mã và SĐT để người khác không dò được
const lookupTicket = async (req, res) => {
  try {
    const code = String(req.query.code || "").trim().toUpperCase();
    const phone = normalizePhone(req.query.phone);
    if (!code || phone.length < 9) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập mã phiếu và số điện thoại đã đăng ký khi gửi vợt",
      });
    }
    const ticket = await RacketServiceTicket.findOne({ ticketCode: code, customerPhone: phone });
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phiếu khớp với mã và số điện thoại này",
      });
    }
    res.json({ success: true, ticket: toCustomerView(ticket) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createTicket,
  getTickets,
  getTicketById,
  updateTicketStatus,
  updateTicket,
  getMyTickets,
  lookupTicket,
  SERVICE_TYPES,
};
