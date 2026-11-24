const mongoose = require("mongoose");
const Event = require("../models/Event");
const EventType = require("../models/EventType");
const Registration = require("../models/Registration");
const {
  getEventState,
  STATE_LABELS,
  registerToEvent,
  updateUserRegistration,
  cancelRegistration,
} = require("../services/eventService");

const DEFAULT_EVENT_TYPES = [
  {
    name: "Giải cá nhân",
    note: "Thi đấu đơn nam / đơn nữ theo thể thức loại trực tiếp hoặc vòng bảng.",
  },
  {
    name: "Giải đôi",
    note: "Thi đấu đôi nam, đôi nữ hoặc đôi nam nữ (2 VĐV/đội).",
  },
  {
    name: "Giải đồng đội",
    note: "Thi đấu theo đội/CLB gồm nhiều nội dung đơn và đôi.",
  },
  {
    name: "Giải giao hữu",
    note: "Giao lưu cọ xát phong trào, không đặt nặng thành tích.",
  },
];

// ============ HELPERS ============

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

const buildEventPayload = (body, current = {}) => {
  const p = { ...current };
  const FIELDS = [
    "name",
    "type",
    "court",
    "posterUrl",
    "startDate",
    "endDate",
    "description",
    "registrationDeadline",
    "maxRegistrations",
    "status",
  ];
  for (const f of FIELDS) if (body[f] !== undefined) p[f] = body[f];
  if (body.sponsors !== undefined) p.sponsors = parseSponsors(body.sponsors);
  if (body.results !== undefined) p.results = parseResults(body.results);

  if (p.type === "") p.type = null;
  if (p.court === "") p.court = null;
  if (p.posterUrl !== undefined) p.posterUrl = String(p.posterUrl || "").trim();

  for (const idField of ["type", "court"]) {
    if (p[idField] && !mongoose.isValidObjectId(p[idField]))
      return { error: `Dữ liệu ${idField} không hợp lệ` };
  }
  const startDate = p.startDate ? new Date(p.startDate) : null;
  const deadline = p.registrationDeadline ? new Date(p.registrationDeadline) : null;
  if (!startDate || isNaN(startDate)) return { error: "Ngày bắt đầu không hợp lệ" };
  if (!deadline || isNaN(deadline)) return { error: "Hạn đăng ký không hợp lệ" };
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

const decorate = (ev) => {
  const obj = ev.toObject ? ev.toObject() : ev;
  obj.state = getEventState(obj);
  obj.stateLabel = STATE_LABELS[obj.state] || obj.state;
  return obj;
};

// ============ UPLOAD ẢNH BÌA (POSTER) ============

// @desc    Admin tải ảnh bìa giải đấu lên thư mục uploads/events
// @route   POST /api/events/upload-poster
const uploadPoster = (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: "Vui lòng chọn file ảnh để tải lên" });
  }
  return res.status(201).json({
    success: true,
    posterUrl: `/uploads/events/${req.file.filename}`,
  });
};

// ============ EVENT TYPES ============

const getEventTypes = async (req, res) => {
  try {
    const count = await EventType.countDocuments();
    if (count === 0) {
      await EventType.insertMany(DEFAULT_EVENT_TYPES, { ordered: false }).catch(() => {});
    }
    const filter = req.query.includeInactive === "true" ? {} : { isActive: true };
    const types = await EventType.find(filter).sort({ createdAt: 1 });
    res.json({ success: true, types });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const saveEventType = async (req, res) => {
  try {
    const { name, note } = req.body;
    if (!name || !name.trim())
      return res.status(400).json({ success: false, message: "Vui lòng nhập tên loại sự kiện" });
    const created = await EventType.create({
      name: name.trim(),
      note: note ? String(note).trim() : "",
    });
    res.status(201).json({ success: true, type: created });
  } catch (error) {
    if (error.code === 11000)
      return res.status(400).json({ success: false, message: "Loại sự kiện đã tồn tại" });
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateEventType = async (req, res) => {
  try {
    const updates = {};
    if (req.body.name !== undefined) {
      if (!String(req.body.name).trim())
        return res.status(400).json({ success: false, message: "Tên loại sự kiện không được để trống" });
      updates.name = String(req.body.name).trim();
    }
    if (req.body.note !== undefined) updates.note = String(req.body.note).trim();
    if (req.body.isActive !== undefined) updates.isActive = Boolean(req.body.isActive);

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

const getPublicEvents = async (req, res) => {
  try {
    const events = await Event.find({ status: "published", isDeleted: { $ne: true } })
      .populate("type", "name note")
      .populate("court", "name")
      .sort({ startDate: 1 })
      .lean();
    res.json({ success: true, events: events.map(decorate) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getPublicEvent = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(404).json({ success: false, message: "Không tìm thấy sự kiện" });
    const ev = await Event.findOne({
      _id: req.params.id,
      status: "published",
      isDeleted: { $ne: true },
    })
      .populate("type", "name note")
      .populate("court", "name")
      .lean();
    if (!ev) return res.status(404).json({ success: false, message: "Không tìm thấy sự kiện" });
    res.json({ success: true, event: decorate(ev) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getManagedEvents = async (req, res) => {
  try {
    const filter = { isDeleted: { $ne: true } };
    if (req.query.status) filter.status = req.query.status;
    const events = await Event.find(filter)
      .populate("type", "name note")
      .populate("court", "name")
      .sort({ startDate: -1 })
      .lean();
    res.json({ success: true, events: events.map(decorate) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getManagedEvent = async (req, res) => {
  try {
    const ev = await Event.findOne({ _id: req.params.id, isDeleted: { $ne: true } })
      .populate("type", "name note")
      .populate("court", "name")
      .lean();
    if (!ev) return res.status(404).json({ success: false, message: "Không tìm thấy sự kiện" });
    res.json({ success: true, event: decorate(ev) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createEvent = async (req, res) => {
  try {
    const { payload, error } = buildEventPayload(req.body);
    if (error) return res.status(400).json({ success: false, message: error });
    if (!payload.name || !payload.name.trim())
      return res.status(400).json({ success: false, message: "Vui lòng nhập tên sự kiện" });
    if (!payload.type)
      return res.status(400).json({ success: false, message: "Vui lòng chọn loại sự kiện" });
    const created = await Event.create(payload);
    res.status(201).json({ success: true, event: decorate(created) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateEvent = async (req, res) => {
  try {
    const ev = await Event.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!ev) return res.status(404).json({ success: false, message: "Không tìm thấy sự kiện" });
    const { payload, error } = buildEventPayload(req.body, ev.toObject());
    if (error) return res.status(400).json({ success: false, message: error });
    if (!payload.type)
      return res.status(400).json({ success: false, message: "Vui lòng chọn loại sự kiện" });
    delete payload._id;
    delete payload.registeredCount;
    delete payload.isDeleted;
    delete payload.deletedAt;
    ev.set(payload);
    await ev.save();
    res.json({ success: true, event: decorate(ev) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

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

const register = async (req, res) => {
  try {
    const result = await registerToEvent(req.params.id, req.user, req.body);
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

// @desc    Người dùng sửa phiếu đăng ký của chính mình trước hạn
// @route   PUT /api/events/:id/register
const updateMyRegistration = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(404).json({ success: false, message: "Không tìm thấy sự kiện" });

    const result = await updateUserRegistration(req.params.id, req.user, req.body);
    if (!result.ok)
      return res.status(result.status).json({ success: false, message: result.message });

    res.json({
      success: true,
      message: "Đã cập nhật phiếu đăng ký",
      registration: result.registration,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const cancelMyRegistration = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(404).json({ success: false, message: "Không tìm thấy sự kiện" });

    const ev = await Event.findOne({ _id: req.params.id, isDeleted: { $ne: true } }).lean();
    if (!ev)
      return res.status(404).json({ success: false, message: "Không tìm thấy sự kiện" });
    if (ev.status === "cancelled")
      return res.status(400).json({ success: false, message: "Sự kiện đã bị hủy" });

    const now = new Date();
    if (ev.registrationDeadline && now > new Date(ev.registrationDeadline)) {
      return res.status(400).json({
        success: false,
        message: "Đã quá hạn đăng ký, không thể tự hủy. Vui lòng liên hệ Ban tổ chức.",
      });
    }
    if (ev.startDate && now > new Date(ev.startDate)) {
      return res.status(400).json({
        success: false,
        message: "Sự kiện đã bắt đầu, không thể tự hủy.",
      });
    }

    const existing = await Registration.findOne({
      event: ev._id,
      user: req.user._id,
      status: "registered",
    }).lean();
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Bạn chưa đăng ký sự kiện này hoặc đơn đã bị hủy trước đó",
      });
    }

    const rawReason = String(req.body?.reason || "").trim().slice(0, 200);
    const cancelNote = rawReason
      ? `Người dùng tự hủy: ${rawReason}`
      : "Người dùng tự hủy trước hạn";

    const reg = await cancelRegistration(existing._id, cancelNote);
    if (!reg)
      return res.status(400).json({ success: false, message: "Đăng ký này đã bị hủy trước đó" });

    res.json({
      success: true,
      message: "Đã hủy đăng ký thành công",
      registration: reg,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

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
    const items = regs
      .filter((r) => r.event && r.event.status !== "draft" && !r.event.isDeleted)
      .map((r) => ({
        ...r,
        event: {
          ...r.event,
          state: getEventState(r.event),
          stateLabel: STATE_LABELS[getEventState(r.event)],
        },
      }));
    res.json({ success: true, registrations: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

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
  uploadPoster,
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
  updateMyRegistration,
  cancelMyRegistration,
  getEventRegistrations,
  getMyRegistrations,
  cancel,
};