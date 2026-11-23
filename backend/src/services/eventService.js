const mongoose = require("mongoose");
const Event = require("../models/Event");
const Registration = require("../models/Registration");

// ============ TRẠNG THÁI SUY RA (derived — kiểu ACTIVE_STATUSES bên maintenance) ============
// Một nguồn sự thật cho: nút [Đăng ký] trang khách, badge list khách,
// badge màn admin, và quyết định của POST /register phía backend.
// cancelled | draft | finished | closed_deadline | closed_full | open
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
// CAS lạc quan: update chỉ match khi registeredCount VẪN bằng giá trị vừa đọc.
// Hai người đua slot cuối → đúng một người $inc thành công, người kia đọc lại
// thấy đầy và nhận 400. Không phụ thuộc $expr trong update filter của server.
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
    // count bị người khác đổi giữa lúc đọc và lúc ghi → thử lại với số mới
  }
  return { ok: false, reason: "try_again" };
};

const releaseSlot = (eventId) =>
  Event.updateOne({ _id: eventId }, { $inc: { registeredCount: -1 } });

// ============ ĐĂNG KÝ ============
const CLOSE_MESSAGES = {
  closed_deadline: "Hết hạn đăng ký",
  closed_full: "Sự kiện đã đủ suất đăng ký",
  cancelled: "Sự kiện đã bị hủy",
  not_found: "Không tìm thấy sự kiện",
  draft: "Không tìm thấy sự kiện",
  try_again: "Sự kiện vừa thay đổi, vui lòng thử lại",
};

const registerToEvent = async (eventId, user) => {
  // Chặn trùng trước cho thông báo đẹp; unique partial index vẫn là lưới cuối
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
      status: slot.reason === "not_found" || slot.reason === "draft" ? 404 : slot.reason === "try_again" ? 409 : 400,
      message: CLOSE_MESSAGES[slot.reason],
    };

  try {
    const registration = await Registration.create({
      event: eventId,
      user: user._id,
      name: user.name,
      phone: user.phone,
    });
    return { ok: true, registration };
  } catch (e) {
    await releaseSlot(eventId); // 2 cú click cùng giây đụng unique index → hoàn slot
    if (e.code === 11000)
      return { ok: false, status: 409, message: "Bạn đã đăng ký sự kiện này" };
    throw e;
  }
};

// ============ ADMIN HỦY ĐĂNG KÝ (lý do bắt buộc) ============
// Guard status:"registered" trong chính câu update → hủy 2 lần không trừ slot 2 lần.
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
  cancelRegistration,
};
