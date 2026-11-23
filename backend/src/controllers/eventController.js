const mongoose = require("mongoose");
const Event = require("../models/Event");
const EventType = require("../models/EventType");
const Registration = require("../models/Registration");
const {
  getEventState,
  STATE_LABELS,
  registerToEvent,
  cancelRegistration,
} = require("../services/eventService");

// ============ HELPERS ============

// "A, B ,, a" → ["A","B"] — dedup không phân biệt hoa thường, cắt rác
const parseSponsors = (v) => {
  const arr = Array.isArray(v) ? v : String(v || "").split(",");
  const out = [];
  const seen = new Set();
  for (const raw of arr) {
    const s = String(raw || "").trim().slice(0, 100);
    if (!s) continue;
    const key = s.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(s);
    }
  }
  return out.slice(0, 30);
};

// Lọc Top 5 hợp lệ: có tên, rank 1..5, sắp theo rank
const parseResults = (v) => {
  const arr = Array.isArray(v) ? v : [];
  const out = [];
  for (const r of arr) {
    const name = String(r && r.name ? r.name : "").trim().slice(0, 100);
    if (!name) continue;
    const rank = Number(r.rank) || out.length + 1;
    if (rank >= 1 && rank <= 5) out.push({ rank, name });
  }
  out.sort((a, b) => a.rank - b.rank);
  return out.slice(0, 5);
};

// Đọc + validate payload sự kiện từ req.body; trả về { error } để controller báo 400
const buildEventPayload = (body, current = {}) => {
  const p = { ...current };
  const FIELDS = [
    "name", "type", "court", "startDate", "endDate",
    "description", "registrationDeadline", "maxRegistrations", "status",
  ];
  for (const f of FIELDS) if (body[f] !== undefined) p[f] = body[f];
  if (body.sponsors !== undefined) p.sponsors = parseSponsors(body.sponsors);
  if (body.results !== undefined) p.results = parseResults(body.results);

  for (const idField of ["type", "court"]) {
    if (p[idField] && !mongoose.isValidObjectId(p[idField]))
      return { error: `Dữ liệu ${idField} không hợp lệ` };
  }
  const startDate = p.startDate ? new Date(p.startDate) : null;
  const deadline = p.registrationDeadline ? new Date(p.registrationDeadline) : null;
  if (!startDate || isNaN(startDate)) return { error: "Ngày bắt đầu không hợp lệ" };
  if (!deadline || isNaN(deadline)) return { error: "Hạn đăng ký không hợp lệ" };
  // Chốt trong plan: hạn đăng ký luôn trước ngày bắt đầu (BTC cần lúc chốt danh sách)
  if (deadline > startDate)
    return { error: "Hạn đăng ký phải trước ngày bắt đầu sự kiện" };
  if (p.endDate) {
    const endDate = new Date(p.endDate);
    if (isNaN(endDate)) return { error: "Ngày kết thúc không hợp lệ" };
    if (endDate < startDate) return { error: "Ngày kết thúc phải sau ngày bắt đầu" };
    p.endDate = endDate;
  }
  p.startDate = startDate;
  p.registrationDeadline = deadline;
  p.maxRegistrations = Math.max(0, Number(p.maxRegistrations) || 0);
  return { payload: p };
};

// Gắn state suy ra + nhãn vào event trước khi trả client
const decorate = (ev) => {
  const obj = ev.toObject ? ev.toObject() : ev;
  obj.state = getEventState(obj);
  obj.stateLabel = STATE_LABELS[obj.state] || obj.state;
  return obj;
};

// ============ EVENT TYPES ============

// @desc    Loại sự kiện đang bật (công khai — form admin cũng dùng)
// @route   GET /api/event-types
const getEventTypes = async (req, res) => {
  try {
    const types = await EventType.find({ isActive: true }).sort({ createdAt: 1 });
    res.json({ success: true, types });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Thêm loại sự kiện (admin)
// @route   POST /api/event-types
const saveEventType = async (req, res) => {
  try {
    const { name, note } = req.body;
    if (!name || !name.trim())
      return res.status(400).json({ success: false, message: "Vui lòng nhập tên loại sự kiện" });
    const created = await EventType.create({ name, note });
    res.status(201).json({ success: true, type: created });
  } catch (error) {
    if (error.code === 11000)
      return res.status(400).json({ success: false, message: "Loại sự kiện đã tồn tại" });
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Sửa / tắt loại sự kiện (admin) — không xóa cứng
// @route   PUT /api/event-types/:id
const updateEventType = async (req, res) => {
  try {
    const updates = {};
    ["name", "note", "isActive"].forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });
    const updated = await EventType.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!updated)
      return res.status(404).json({ success: false, message: "Không tìm thấy loại sự kiện" });
    res.json({ success: true, type: updated });
  } catch (error) {
    if (error.code === 11000)
      return res.status(400).json({ success: false, message: "Loại sự kiện đã tồn tại" });
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ EVENTS ============

// @desc    List sự kiện published cho khách (không cần đăng nhập)
// @route   GET /api/events
const getPublicEvents = async (req, res) => {
  try {
    const events = await Event.find({ status: "published", isDeleted: { $ne: true } })
      .populate("type", "name")
      .populate("court", "name")
      .sort({ startDate: 1 })
      .lean();
    res.json({ success: true, events: events.map(decorate) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Chi tiết sự kiện published cho khách
// @route   GET /api/events/:id
const getPublicEvent = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(404).json({ success: false, message: "Không tìm thấy sự kiện" });
    const ev = await Event.findOne({ _id: req.params.id, status: "published", isDeleted: { $ne: true } })
      .populate("type", "name")
      .populate("court", "name")
      .lean();
    if (!ev) return res.status(404).json({ success: false, message: "Không tìm thấy sự kiện" });
    res.json({ success: true, event: decorate(ev) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    List mọi sự kiện cho admin (kèm draft/cancelled)
// @route   GET /api/events/manage
const getManagedEvents = async (req, res) => {
  try {
    const filter = { isDeleted: { $ne: true } };
    if (req.query.status) filter.status = req.query.status;
    const events = await Event.find(filter)
      .populate("type", "name")
      .populate("court", "name")
      .sort({ startDate: -1 })
      .lean();
    res.json({ success: true, events: events.map(decorate) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Chi tiết sự kiện cho admin (cả draft)
// @route   GET /api/events/manage/:id
const getManagedEvent = async (req, res) => {
  try {
    const ev = await Event.findOne({ _id: req.params.id, isDeleted: { $ne: true } })
      .populate("type", "name")
      .populate("court", "name")
      .lean();
    if (!ev) return res.status(404).json({ success: false, message: "Không tìm thấy sự kiện" });
    res.json({ success: true, event: decorate(ev) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Tạo sự kiện (admin)
// @route   POST /api/events
const createEvent = async (req, res) => {
  try {
    const { payload, error } = buildEventPayload(req.body);
    if (error) return res.status(400).json({ success: false, message: error });
    if (!payload.name || !payload.name.trim())
      return res.status(400).json({ success: false, message: "Vui lòng nhập tên sự kiện" });
    const created = await Event.create(payload);
    res.status(201).json({ success: true, event: decorate(created) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Sửa sự kiện / đổi trạng thái / nhập Top 5 (admin)
// @route   PUT /api/events/:id
const updateEvent = async (req, res) => {
  try {
    const ev = await Event.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!ev) return res.status(404).json({ success: false, message: "Không tìm thấy sự kiện" });
    // Hợp nhất với doc hiện tại rồi validate chéo — PUT một phần vẫn chặn deadline > startDate
    const { payload, error } = buildEventPayload(req.body, ev.toObject());
    if (error) return res.status(400).json({ success: false, message: error });
    delete payload._id;
    delete payload.registeredCount; // chỉ service được đụng counter
    delete payload.isDeleted;
    delete payload.deletedAt;
    ev.set(payload);
    await ev.save();
    res.json({ success: true, event: decorate(ev) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Xóa mềm sự kiện (admin)
// @route   DELETE /api/events/:id
const deleteEvent = async (req, res) => {
  try {
    const ev = await Event.findOneAndUpdate(
      { _id: req.params.id, isDeleted: { $ne: true } },
      { isDeleted: true, deletedAt: new Date() },
      { new: true },
    );
    if (!ev) return res.status(404).json({ success: false, message: "Không tìm thấy sự kiện" });
    res.json({ success: true, message: "Đã xóa sự kiện" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ ĐĂNG KÝ ============

// @desc    Khách đăng ký tham gia (user đăng nhập)
// @route   POST /api/events/:id/register
const register = async (req, res) => {
  try {
    const result = await registerToEvent(req.params.id, req.user);
    if (!result.ok)
      return res.status(result.status).json({ success: false, message: result.message });
    res.status(201).json({
      success: true,
      message: "Đăng ký thành công",
      registration: result.registration,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Danh sách đăng ký của một sự kiện (admin)
// @route   GET /api/events/:id/registrations
const getEventRegistrations = async (req, res) => {
  try {
    const ev = await Event.findOne({ _id: req.params.id, isDeleted: { $ne: true } }).lean();
    if (!ev) return res.status(404).json({ success: false, message: "Không tìm thấy sự kiện" });
    const registrations = await Registration.find({ event: req.params.id })
      .sort({ createdAt: 1 })
      .lean();
    res.json({
      success: true,
      eventName: ev.name,
      registeredCount: ev.registeredCount,
      maxRegistrations: ev.maxRegistrations,
      registrations,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    "Giải đấu của tôi" (user đăng nhập)
// @route   GET /api/registrations/mine
const getMyRegistrations = async (req, res) => {
  try {
    const regs = await Registration.find({ user: req.user._id })
      .populate({
        path: "event",
        populate: [
          { path: "type", select: "name" },
          { path: "court", select: "name" },
        ],
      })
      .sort({ createdAt: -1 })
      .lean();
    // Ẩn đăng ký thuộc sự kiện đã xóa mềm hoặc còn là bản nháp
    const items = regs
      .filter((r) => r.event && r.event.status !== "draft" && !r.event.isDeleted)
      .map((r) => ({
        ...r,
        event: { ...r.event, state: getEventState(r.event), stateLabel: STATE_LABELS[getEventState(r.event)] },
      }));
    res.json({ success: true, registrations: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Admin hủy đăng ký (lý do bắt buộc) — hoàn 1 slot
// @route   PUT /api/registrations/:id/cancel
const cancel = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim())
      return res.status(400).json({ success: false, message: "Vui lòng nhập lý do hủy" });
    const existing = await Registration.findById(req.params.id).lean();
    if (!existing)
      return res.status(404).json({ success: false, message: "Không tìm thấy đăng ký" });
    const reg = await cancelRegistration(req.params.id, reason.trim());
    if (!reg)
      return res.status(400).json({ success: false, message: "Đăng ký này đã bị hủy trước đó" });
    res.json({ success: true, registration: reg });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getEventTypes,
  saveEventType,
  updateEventType,
  getPublicEvents,
  getPublicEvent,
  getManagedEvents,
  getManagedEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  register,
  getEventRegistrations,
  getMyRegistrations,
  cancel,
};
