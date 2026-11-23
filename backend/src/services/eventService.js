const mongoose = require("mongoose");
const Event = require("../models/Event");
const Registration = require("../models/Registration");

// ============ TRẠNG THÁI SUY RA ============
const getEventState = (event, now = new Date()) => {
  if (!event) return null;
  if (event.status === "cancelled") return "cancelled";
  if (event.status === "draft") return "draft";
  const endAt = event.endDate || event.startDate;
  if (endAt && now > endAt) return "finished";
  if (event.registrationDeadline && now > event.registrationDeadline)
    return "closed_deadline";
  if (event.maxRegistrations > 0 && event.registeredCount >= event.maxRegistrations)
    return "closed_full";
  return "open";
};

const STATE_LABELS = {
  open: "Đang mở đăng ký",
  closed_deadline: "Hết hạn đăng ký",
  closed_full: "Đã đủ suất",
  finished: "Đã kết thúc",
  cancelled: "Đã hủy",
  draft: "Bản nháp",
};

// ============ GIỮ SLOT NGUYÊN TỬ ============
const reserveSlot = async (eventId) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    const ev = await Event.findOne({ _id: eventId, isDeleted: { $ne: true } }).lean();
    if (!ev) return { ok: false, reason: "not_found" };
    if (ev.status !== "published")
      return { ok: false, reason: ev.status === "cancelled" ? "cancelled" : "draft" };
    const now = new Date();
    if (ev.registrationDeadline && now > ev.registrationDeadline)
      return { ok: false, reason: "closed_deadline" };
    if (ev.maxRegistrations > 0 && ev.registeredCount >= ev.maxRegistrations)
      return { ok: false, reason: "closed_full" };
    const upd = await Event.updateOne(
      { _id: eventId, registeredCount: ev.registeredCount },
      { $inc: { registeredCount: 1 } },
    );
    if (upd.modifiedCount === 1) return { ok: true };
  }
  return { ok: false, reason: "try_again" };
};

const releaseSlot = (eventId) =>
  Event.updateOne({ _id: eventId }, { $inc: { registeredCount: -1 } });

// ============ VALIDATE FORM ĐĂNG KÝ DÙNG CHUNG ============
const CLOSE_MESSAGES = {
  closed_deadline: "Hết hạn đăng ký",
  closed_full: "Sự kiện đã đủ suất đăng ký",
  cancelled: "Sự kiện đã bị hủy",
  not_found: "Không tìm thấy sự kiện",
  draft: "Không tìm thấy sự kiện",
  try_again: "Sự kiện vừa thay đổi, vui lòng thử lại",
};

const ALLOWED_GENDERS = ["Nam", "Nữ", "Khác"];
const ALLOWED_LEVELS = ["Mới chơi", "Phong trào", "Khá", "Bán chuyên"];

const validateRegistrationForm = (formData = {}, user = {}, eventTypeName = "") => {
  const name = String(formData.name ?? user.name ?? "").trim().slice(0, 100);
  if (!name) return { error: "Vui lòng nhập họ và tên người tham gia" };

  const phone = String(formData.phone ?? user.phone ?? "").replace(/\s+/g, "").trim();
  if (!phone) return { error: "Vui lòng nhập số điện thoại liên hệ" };
  if (!/^(0|\+84)[0-9]{8,10}$/.test(phone))
    return { error: "Số điện thoại không hợp lệ (VD: 0912345678)" };

  const gender = ALLOWED_GENDERS.includes(formData.gender) ? formData.gender : "Nam";
  const skillLevel = ALLOWED_LEVELS.includes(formData.skillLevel)
    ? formData.skillLevel
    : "Phong trào";
  const partnerOrTeamName = String(formData.partnerOrTeamName || "").trim().slice(0, 120);
  const note = String(formData.note || "").trim().slice(0, 300);

  if (/đôi|đội/i.test(eventTypeName) && !partnerOrTeamName) {
    return { error: "Vui lòng nhập tên đồng đội hoặc tên đội thi đấu" };
  }

  return {
    data: { name, phone, gender, skillLevel, partnerOrTeamName, note },
  };
};

// ============ ĐĂNG KÝ ============
const registerToEvent = async (eventId, user, formData = {}) => {
  const ev = await Event.findOne({ _id: eventId, isDeleted: { $ne: true } })
    .populate("type", "name")
    .lean();
  if (!ev || ev.status === "draft")
    return { ok: false, status: 404, message: "Không tìm thấy sự kiện" };

  const validated = validateRegistrationForm(formData, user, ev.type?.name || "");
  if (validated.error)
    return { ok: false, status: 400, message: validated.error };

  const existing = await Registration.findOne({
    event: eventId,
    user: user._id,
    status: "registered",
  });
  if (existing)
    return { ok: false, status: 409, message: "Bạn đã đăng ký sự kiện này" };

  const slot = await reserveSlot(eventId);
  if (!slot.ok)
    return {
      ok: false,
      status:
        slot.reason === "not_found" || slot.reason === "draft"
          ? 404
          : slot.reason === "try_again"
            ? 409
            : 400,
      message: CLOSE_MESSAGES[slot.reason],
    };

  try {
    const registration = await Registration.create({
      event: eventId,
      user: user._id,
      ...validated.data,
    });
    return { ok: true, registration };
  } catch (e) {
    await releaseSlot(eventId);
    if (e.code === 11000)
      return { ok: false, status: 409, message: "Bạn đã đăng ký sự kiện này" };
    throw e;
  }
};

// ============ NGƯỜI DÙNG CHỈNH SỬA PHIẾU ĐĂNG KÝ TRƯỚC HẠN ============
const updateUserRegistration = async (eventId, user, formData = {}) => {
  const ev = await Event.findOne({ _id: eventId, isDeleted: { $ne: true } })
    .populate("type", "name")
    .lean();
  if (!ev || ev.status === "draft")
    return { ok: false, status: 404, message: "Không tìm thấy sự kiện" };
  if (ev.status === "cancelled")
    return { ok: false, status: 400, message: "Sự kiện đã bị hủy" };

  const now = new Date();
  if (ev.registrationDeadline && now > new Date(ev.registrationDeadline)) {
    return {
      ok: false,
      status: 400,
      message: "Đã quá hạn đăng ký, không thể chỉnh sửa phiếu",
    };
  }
  if (ev.startDate && now > new Date(ev.startDate)) {
    return {
      ok: false,
      status: 400,
      message: "Sự kiện đã bắt đầu, không thể chỉnh sửa phiếu",
    };
  }

  const validated = validateRegistrationForm(formData, user, ev.type?.name || "");
  if (validated.error)
    return { ok: false, status: 400, message: validated.error };

  const updated = await Registration.findOneAndUpdate(
    { event: eventId, user: user._id, status: "registered" },
    { $set: validated.data },
    { new: true },
  );
  if (!updated) {
    return {
      ok: false,
      status: 404,
      message: "Không tìm thấy phiếu đăng ký hợp lệ để chỉnh sửa",
    };
  }

  return { ok: true, registration: updated };
};

// ============ HỦY ĐĂNG KÝ (HOÀN SLOT NGUYÊN TỬ) ============
const cancelRegistration = async (registrationId, note) => {
  const session = await mongoose.startSession();
  try {
    let result = null;
    await session.withTransaction(async () => {
      const reg = await Registration.findOneAndUpdate(
        { _id: registrationId, status: "registered" },
        { status: "cancelled", cancelNote: note },
        { new: true, session },
      );
      if (!reg) return;
      await Event.updateOne(
        { _id: reg.event },
        { $inc: { registeredCount: -1 } },
        { session },
      );
      result = reg;
    });
    return result;
  } finally {
    await session.endSession();
  }
};

module.exports = {
  getEventState,
  STATE_LABELS,
  reserveSlot,
  releaseSlot,
  registerToEvent,
  updateUserRegistration,
  cancelRegistration,
};