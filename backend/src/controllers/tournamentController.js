const mongoose = require("mongoose");
const Tournament = require("../models/Tournament");
const EventType = require("../models/EventType");
const Sponsor = require("../models/Sponsor");
const Registration = require("../models/TournamentRegistration");
const Match = require("../models/TournamentMatch");
const User = require("../models/User");

// ---------------------------------------------------------------------
// Tiện ích chung
// ---------------------------------------------------------------------
const isAdmin = (req) => req.user?.role === "admin";
const ACTIVE_REG = ["pending", "confirmed"];
const fail = (res, code, message) => res.status(code).json({ success: false, message });
const handleErr = (res, error) => {
  const code = error.name === "ValidationError" || error.name === "CastError" ? 400 : 500;
  const message =
    error.name === "ValidationError"
      ? Object.values(error.errors).map((e) => e.message).join(", ")
      : error.message;
  return fail(res, code, message);
};
const isId = (id) => mongoose.Types.ObjectId.isValid(id);

// Lấy giải và kiểm tra quyền quản lý: admin mọi giải, nhân viên chỉ giải được phân công
const loadManaged = async (req, res, id) => {
  if (!isId(id)) {
    fail(res, 404, "Không tìm thấy giải đấu");
    return null;
  }
  const t = await Tournament.findById(id);
  if (!t) {
    fail(res, 404, "Không tìm thấy giải đấu");
    return null;
  }
  if (!isAdmin(req) && !t.staff.some((s) => String(s) === String(req.user._id))) {
    fail(res, 403, "Bạn không được phân công phụ trách giải này");
    return null;
  }
  return t;
};

const loadManagedReg = async (req, res, regId) => {
  if (!isId(regId)) {
    fail(res, 404, "Không tìm thấy đăng ký");
    return {};
  }
  const reg = await Registration.findById(regId);
  if (!reg) {
    fail(res, 404, "Không tìm thấy đăng ký");
    return {};
  }
  const t = await loadManaged(req, res, reg.tournament);
  return t ? { reg, t } : {};
};

const roundName = (matchesInRound, round) => {
  if (matchesInRound === 1) return "Chung kết";
  if (matchesInRound === 2) return "Bán kết";
  if (matchesInRound === 4) return "Tứ kết";
  if (matchesInRound === 8) return "Vòng 1/8";
  return `Vòng ${round}`;
};

const slotCount = (tournamentId) =>
  Registration.countDocuments({ tournament: tournamentId, status: { $in: ACTIVE_REG } });

// Đếm nhanh số đăng ký theo trạng thái cho nhiều giải
const regCounts = async (ids) => {
  const rows = await Registration.aggregate([
    { $match: { tournament: { $in: ids } } },
    {
      $group: {
        _id: { t: "$tournament", s: "$status" },
        n: { $sum: 1 },
        checkedIn: { $sum: { $cond: ["$checkedIn", 1, 0] } },
        paid: {
          $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$fee", 0] },
        },
      },
    },
  ]);
  const map = {};
  for (const r of rows) {
    const k = String(r._id.t);
    map[k] ??= { pending: 0, confirmed: 0, rejected: 0, cancelled: 0, checkedIn: 0, revenue: 0 };
    map[k][r._id.s] = r.n;
    if (r._id.s === "confirmed") map[k].checkedIn += r.checkedIn;
    if (r._id.s !== "cancelled" && r._id.s !== "rejected") map[k].revenue += r.paid;
  }
  return map;
};
const emptyCounts = { pending: 0, confirmed: 0, rejected: 0, cancelled: 0, checkedIn: 0, revenue: 0 };

// =====================================================================
// LOẠI SỰ KIỆN
// =====================================================================
const getEventTypes = async (req, res) => {
  try {
    const filter = isAdmin(req) ? {} : { isActive: true };
    const types = await EventType.find(filter).sort({ name: 1 });
    res.json({ success: true, eventTypes: types });
  } catch (e) {
    handleErr(res, e);
  }
};

const createEventType = async (req, res) => {
  try {
    const { name, playType, description, isActive } = req.body;
    const et = await EventType.create({ name, playType, description, isActive });
    res.status(201).json({ success: true, message: "Đã thêm loại sự kiện", eventType: et });
  } catch (e) {
    handleErr(res, e);
  }
};

const updateEventType = async (req, res) => {
  try {
    const et = await EventType.findById(req.params.id);
    if (!et) return fail(res, 404, "Không tìm thấy loại sự kiện");
    const { name, playType, description, isActive } = req.body;
    if (playType && playType !== et.playType) {
      const used = await Tournament.exists({ eventType: et._id });
      if (used) return fail(res, 400, "Loại này đã có giải đấu, không đổi được hình thức đơn/đôi");
    }
    Object.assign(et, {
      ...(name !== undefined && { name }),
      ...(playType !== undefined && { playType }),
      ...(description !== undefined && { description }),
      ...(isActive !== undefined && { isActive }),
    });
    await et.save();
    res.json({ success: true, message: "Đã cập nhật loại sự kiện", eventType: et });
  } catch (e) {
    handleErr(res, e);
  }
};

const deleteEventType = async (req, res) => {
  try {
    const used = await Tournament.countDocuments({ eventType: req.params.id });
    if (used) return fail(res, 400, `Đang có ${used} giải dùng loại này. Hãy ẩn thay vì xoá.`);
    const et = await EventType.findByIdAndDelete(req.params.id);
    if (!et) return fail(res, 404, "Không tìm thấy loại sự kiện");
    res.json({ success: true, message: "Đã xoá loại sự kiện" });
  } catch (e) {
    handleErr(res, e);
  }
};

// =====================================================================
// NHÀ TÀI TRỢ
// =====================================================================
const SPONSOR_FIELDS = ["name", "tier", "logoUrl", "website", "description", "contactName", "contactPhone", "isActive"];
const pick = (body, fields) =>
  Object.fromEntries(fields.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]));

const getSponsors = async (req, res) => {
  try {
    const admin = isAdmin(req);
    const sponsors = await Sponsor.find(admin ? {} : { isActive: true })
      .select(admin ? "" : "-contactName -contactPhone")
      .sort({ createdAt: -1 });
    // Số giải mỗi nhà tài trợ đồng hành
    const counts = await Tournament.aggregate([
      { $match: { status: { $ne: "draft" } } },
      { $unwind: "$sponsors" },
      { $group: { _id: "$sponsors", n: { $sum: 1 } } },
    ]);
    const cmap = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
    res.json({
      success: true,
      sponsors: sponsors.map((s) => ({ ...s.toObject(), tournamentCount: cmap[String(s._id)] || 0 })),
    });
  } catch (e) {
    handleErr(res, e);
  }
};

const createSponsor = async (req, res) => {
  try {
    const s = await Sponsor.create(pick(req.body, SPONSOR_FIELDS));
    res.status(201).json({ success: true, message: "Đã thêm nhà tài trợ", sponsor: s });
  } catch (e) {
    handleErr(res, e);
  }
};

const updateSponsor = async (req, res) => {
  try {
    const s = await Sponsor.findById(req.params.id);
    if (!s) return fail(res, 404, "Không tìm thấy nhà tài trợ");
    Object.assign(s, pick(req.body, SPONSOR_FIELDS));
    await s.save();
    res.json({ success: true, message: "Đã cập nhật nhà tài trợ", sponsor: s });
  } catch (e) {
    handleErr(res, e);
  }
};

const deleteSponsor = async (req, res) => {
  try {
    const s = await Sponsor.findByIdAndDelete(req.params.id);
    if (!s) return fail(res, 404, "Không tìm thấy nhà tài trợ");
    await Tournament.updateMany({ sponsors: s._id }, { $pull: { sponsors: s._id } });
    res.json({ success: true, message: "Đã xoá nhà tài trợ" });
  } catch (e) {
    handleErr(res, e);
  }
};

// =====================================================================
// GIẢI ĐẤU — KHÁCH XEM
// =====================================================================
// GET /api/tournaments?status=&eventType=
const getTournaments = async (req, res) => {
  try {
    const filter = { status: { $ne: "draft" } };
    if (req.query.status && Tournament.STATUSES.includes(req.query.status) && req.query.status !== "draft") {
      filter.status = req.query.status;
    }
    if (req.query.eventType && isId(req.query.eventType)) filter.eventType = req.query.eventType;
    const list = await Tournament.find(filter)
      .select("-staff -results -rules -createdBy")
      .populate("eventType", "name playType")
      .populate("sponsors", "name tier logoUrl")
      .sort({ startDate: 1 });
    const counts = await regCounts(list.map((t) => t._id));
    res.json({
      success: true,
      tournaments: list.map((t) => {
        const c = counts[String(t._id)] || emptyCounts;
        return { ...t.toObject(), registeredCount: c.pending + c.confirmed, confirmedCount: c.confirmed };
      }),
    });
  } catch (e) {
    handleErr(res, e);
  }
};

// GET /api/tournaments/:id
const getTournament = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, "Không tìm thấy giải đấu");
    const t = await Tournament.findById(req.params.id)
      .populate("eventType", "name playType description")
      .populate("sponsors", "name tier logoUrl website description")
      .populate("staff", "name");
    const canManage =
      isAdmin(req) || (req.user && t?.staff.some((s) => String(s._id) === String(req.user._id)));
    if (!t || (t.status === "draft" && !canManage)) return fail(res, 404, "Không tìm thấy giải đấu");

    const counts = (await regCounts([t._id]))[String(t._id)] || emptyCounts;
    const participants = await Registration.find({ tournament: t._id, status: "confirmed" })
      .select("displayName teamName playType")
      .sort({ createdAt: 1 });

    const obj = t.toObject();
    if (!obj.resultsPublished && !canManage) obj.results = [];
    if (!canManage) delete obj.staff;

    let myRegistration = null;
    if (req.user) {
      myRegistration = await Registration.findOne({ tournament: t._id, user: req.user._id }).sort({
        createdAt: -1,
      });
    }

    res.json({
      success: true,
      tournament: {
        ...obj,
        registeredCount: counts.pending + counts.confirmed,
        confirmedCount: counts.confirmed,
      },
      participants,
      myRegistration,
    });
  } catch (e) {
    handleErr(res, e);
  }
};

// GET /api/tournaments/:id/matches — lịch thi đấu (công khai, trừ giải nháp)
const getMatches = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, "Không tìm thấy giải đấu");
    const t = await Tournament.findById(req.params.id).select("status staff");
    const canManage =
      isAdmin(req) || (req.user && t?.staff.some((s) => String(s) === String(req.user._id)));
    if (!t || (t.status === "draft" && !canManage)) return fail(res, 404, "Không tìm thấy giải đấu");
    const matches = await Match.find({ tournament: t._id })
      .populate("entryA", "displayName code checkedIn")
      .populate("entryB", "displayName code checkedIn")
      .populate("winner", "displayName")
      .populate("court", "name")
      .sort({ round: 1, position: 1 });
    res.json({ success: true, matches });
  } catch (e) {
    handleErr(res, e);
  }
};

// =====================================================================
// ĐĂNG KÝ — KHÁCH HÀNG
// =====================================================================
// POST /api/tournaments/:id/register
const registerTournament = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, "Không tìm thấy giải đấu");
    const t = await Tournament.findById(req.params.id);
    if (!t || t.status === "draft") return fail(res, 404, "Không tìm thấy giải đấu");
    if (t.status !== "open") return fail(res, 400, "Giải đấu hiện không mở đăng ký");
    if (new Date() > t.registrationDeadline) return fail(res, 400, "Đã hết hạn đăng ký");

    const existed = await Registration.findOne({
      tournament: t._id,
      user: req.user._id,
      status: { $in: ACTIVE_REG },
    });
    if (existed) return fail(res, 400, `Bạn đã đăng ký giải này (mã ${existed.code})`);

    if ((await slotCount(t._id)) >= t.maxParticipants) {
      return fail(res, 400, "Giải đã đủ số lượng đăng ký");
    }

    const { player1 = {}, player2, teamName, note } = req.body;
    const reg = new Registration({
      tournament: t._id,
      user: req.user._id,
      playType: t.playType,
      teamName: teamName || "",
      player1: {
        name: player1.name || req.user.name,
        phone: player1.phone || req.user.phone,
        email: player1.email || req.user.email,
        birthYear: player1.birthYear || undefined,
      },
      player2: t.playType === "pair" ? player2 : null,
      note: note || "",
      fee: t.entryFee,
      // giải miễn phí: coi như đã thanh toán
      paymentStatus: t.entryFee > 0 ? "unpaid" : "paid",
    });
    await reg.save();
    res.status(201).json({
      success: true,
      message:
        t.entryFee > 0
          ? `Đăng ký thành công, mã ${reg.code}. Vui lòng nộp lệ phí để được xác nhận.`
          : `Đăng ký thành công, mã ${reg.code}. Vui lòng chờ ban tổ chức xác nhận.`,
      registration: reg,
    });
  } catch (e) {
    handleErr(res, e);
  }
};

// GET /api/tournaments/my/registrations
const getMyRegistrations = async (req, res) => {
  try {
    const regs = await Registration.find({ user: req.user._id })
      .populate({
        path: "tournament",
        select: "name startDate endDate status entryFee location resultsPublished results playType",
      })
      .sort({ createdAt: -1 });

    // Kèm trận sắp tới / kết quả của từng đăng ký
    const ids = regs.map((r) => r._id);
    const matches = await Match.find({ $or: [{ entryA: { $in: ids } }, { entryB: { $in: ids } }] })
      .populate("entryA entryB", "displayName")
      .populate("court", "name")
      .sort({ round: 1 });

    res.json({
      success: true,
      registrations: regs.map((r) => {
        const o = r.toObject();
        const t = o.tournament;
        if (t && !t.resultsPublished) t.results = [];
        o.myRank = t?.results?.find((x) => String(x.registration) === String(r._id))?.rank || null;
        o.matches = matches
          .filter((m) => [String(m.entryA?._id), String(m.entryB?._id)].includes(String(r._id)))
          .map((m) => m.toObject());
        delete o.reviewedBy;
        delete o.paymentConfirmedBy;
        delete o.checkedInBy;
        return o;
      }),
    });
  } catch (e) {
    handleErr(res, e);
  }
};

// PUT /api/tournaments/registrations/:regId/cancel
const cancelMyRegistration = async (req, res) => {
  try {
    if (!isId(req.params.regId)) return fail(res, 404, "Không tìm thấy đăng ký");
    const reg = await Registration.findOne({ _id: req.params.regId, user: req.user._id });
    if (!reg) return fail(res, 404, "Không tìm thấy đăng ký");
    if (!ACTIVE_REG.includes(reg.status)) return fail(res, 400, "Đăng ký này đã đóng");
    const t = await Tournament.findById(reg.tournament);
    if (!["open", "closed"].includes(t.status)) {
      return fail(res, 400, "Giải đã bắt đầu, không thể huỷ đăng ký");
    }
    if (await Match.exists({ $or: [{ entryA: reg._id }, { entryB: reg._id }] })) {
      return fail(res, 400, "Đã xếp lịch thi đấu cho bạn, vui lòng liên hệ ban tổ chức");
    }
    reg.status = "cancelled";
    await reg.save();
    res.json({
      success: true,
      message:
        reg.paymentStatus === "paid" && reg.fee > 0
          ? "Đã huỷ đăng ký. Liên hệ quầy để được hoàn lệ phí."
          : "Đã huỷ đăng ký",
      registration: reg,
    });
  } catch (e) {
    handleErr(res, e);
  }
};

// =====================================================================
// QUẢN LÝ — NHÂN VIÊN PHỤ TRÁCH + ADMIN
// =====================================================================
// GET /api/tournaments/manage/list — admin: mọi giải · nhân viên: giải được phân công
const getManageList = async (req, res) => {
  try {
    const filter = isAdmin(req) ? {} : { staff: req.user._id };
    const list = await Tournament.find(filter)
      .populate("eventType", "name playType")
      .populate("staff", "name email")
      .populate("sponsors", "name tier")
      .sort({ startDate: -1 });
    const counts = await regCounts(list.map((t) => t._id));
    const matchCounts = await Match.aggregate([
      { $match: { tournament: { $in: list.map((t) => t._id) }, isBye: false } },
      {
        $group: {
          _id: "$tournament",
          total: { $sum: 1 },
          done: { $sum: { $cond: [{ $in: ["$status", ["finished", "walkover"]] }, 1, 0] } },
        },
      },
    ]);
    const mmap = Object.fromEntries(matchCounts.map((m) => [String(m._id), m]));
    res.json({
      success: true,
      tournaments: list.map((t) => ({
        ...t.toObject(),
        counts: counts[String(t._id)] || emptyCounts,
        matchCount: mmap[String(t._id)]?.total || 0,
        matchDone: mmap[String(t._id)]?.done || 0,
      })),
    });
  } catch (e) {
    handleErr(res, e);
  }
};

// GET /api/tournaments/:id/registrations?status=
const getRegistrations = async (req, res) => {
  try {
    const t = await loadManaged(req, res, req.params.id);
    if (!t) return;
    const filter = { tournament: t._id };
    if (req.query.status && Registration.STATUSES.includes(req.query.status)) {
      filter.status = req.query.status;
    }
    const regs = await Registration.find(filter)
      .populate("user", "name email phone")
      .populate("reviewedBy paymentConfirmedBy checkedInBy", "name")
      .sort({ createdAt: 1 });
    res.json({ success: true, registrations: regs });
  } catch (e) {
    handleErr(res, e);
  }
};

// PUT /api/tournaments/registrations/:regId/review { action: confirm|reject, reason }
const reviewRegistration = async (req, res) => {
  try {
    const { reg, t } = await loadManagedReg(req, res, req.params.regId);
    if (!reg) return;
    const { action, reason } = req.body;
    if (["completed", "cancelled"].includes(t.status)) return fail(res, 400, "Giải đã kết thúc");

    if (action === "confirm") {
      if (!["pending", "rejected"].includes(reg.status)) {
        return fail(res, 400, "Chỉ xác nhận được đăng ký đang chờ hoặc đã từ chối");
      }
      if (reg.fee > 0 && reg.paymentStatus !== "paid") {
        return fail(res, 400, "Chưa xác nhận thanh toán lệ phí, không thể duyệt");
      }
      const confirmed = await Registration.countDocuments({ tournament: t._id, status: "confirmed" });
      if (confirmed >= t.maxParticipants) return fail(res, 400, "Giải đã đủ số suất");
      reg.status = "confirmed";
      reg.rejectReason = "";
    } else if (action === "reject") {
      if (!reason || !reason.trim()) return fail(res, 400, "Vui lòng ghi lý do từ chối");
      if (!ACTIVE_REG.includes(reg.status)) return fail(res, 400, "Đăng ký này đã đóng");
      if (await Match.exists({ $or: [{ entryA: reg._id }, { entryB: reg._id }] })) {
        return fail(res, 400, "Đăng ký đã có trong lịch thi đấu, hãy tạo lại lịch trước");
      }
      reg.status = "rejected";
      reg.rejectReason = reason.trim();
    } else {
      return fail(res, 400, "Thao tác không hợp lệ");
    }
    reg.reviewedBy = req.user._id;
    reg.reviewedAt = new Date();
    await reg.save();
    res.json({
      success: true,
      message: action === "confirm" ? `Đã xác nhận ${reg.code}` : `Đã từ chối ${reg.code}`,
      registration: reg,
    });
  } catch (e) {
    handleErr(res, e);
  }
};

// PUT /api/tournaments/registrations/:regId/payment { paid: bool, method }
const updatePayment = async (req, res) => {
  try {
    const { reg } = await loadManagedReg(req, res, req.params.regId);
    if (!reg) return;
    if (reg.status === "cancelled") return fail(res, 400, "Đăng ký đã huỷ");
    const { paid, method } = req.body;
    if (paid) {
      reg.paymentStatus = "paid";
      reg.paymentMethod = ["cash", "transfer"].includes(method) ? method : "cash";
      reg.paidAt = new Date();
      reg.paymentConfirmedBy = req.user._id;
    } else {
      if (reg.status === "confirmed" && reg.fee > 0) {
        return fail(res, 400, "Đăng ký đã được duyệt, không thể chuyển về chưa thanh toán");
      }
      reg.paymentStatus = "unpaid";
      reg.paymentMethod = "";
      reg.paidAt = undefined;
      reg.paymentConfirmedBy = undefined;
    }
    await reg.save();
    res.json({
      success: true,
      message: paid ? `Đã ghi nhận lệ phí ${reg.code}` : "Đã chuyển về chưa thanh toán",
      registration: reg,
    });
  } catch (e) {
    handleErr(res, e);
  }
};

// PUT /api/tournaments/registrations/:regId/checkin { checkedIn: bool }
const updateCheckIn = async (req, res) => {
  try {
    const { reg } = await loadManagedReg(req, res, req.params.regId);
    if (!reg) return;
    if (reg.status !== "confirmed") return fail(res, 400, "Chỉ điểm danh được đăng ký đã xác nhận");
    const on = req.body.checkedIn !== false;
    reg.checkedIn = on;
    reg.checkedInAt = on ? new Date() : undefined;
    reg.checkedInBy = on ? req.user._id : undefined;
    await reg.save();
    res.json({
      success: true,
      message: on ? `${reg.displayName} đã có mặt` : "Đã bỏ điểm danh",
      registration: reg,
    });
  } catch (e) {
    handleErr(res, e);
  }
};

// ---------------------------------------------------------------------
// Lịch thi đấu
// ---------------------------------------------------------------------
// POST /api/tournaments/:id/matches/generate
// { onlyCheckedIn, startAt, matchMinutes, courtIds[] } — bốc thăm ngẫu nhiên, sơ đồ loại trực tiếp
const generateBracket = async (req, res) => {
  try {
    const t = await loadManaged(req, res, req.params.id);
    if (!t) return;
    if (["completed", "cancelled", "draft"].includes(t.status)) {
      return fail(res, 400, "Chỉ xếp lịch cho giải đã mở đăng ký hoặc đang diễn ra");
    }
    const played = await Match.exists({
      tournament: t._id,
      isBye: false,
      status: { $in: ["playing", "finished", "walkover"] },
    });
    if (played) return fail(res, 400, "Đã có trận đấu diễn ra, không thể bốc thăm lại");

    const { onlyCheckedIn, startAt, matchMinutes = 30, courtIds = [] } = req.body;
    const filter = { tournament: t._id, status: "confirmed" };
    if (onlyCheckedIn) filter.checkedIn = true;
    const entries = await Registration.find(filter).select("_id");
    if (entries.length < 2) {
      return fail(res, 400, `Cần ít nhất 2 ${onlyCheckedIn ? "người đã điểm danh" : "đăng ký đã xác nhận"} để xếp lịch`);
    }

    // Bốc thăm
    const ids = entries.map((e) => e._id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }

    const size = 2 ** Math.ceil(Math.log2(ids.length));
    const rounds = Math.log2(size);
    const r1 = size / 2;
    const byes = size - ids.length;
    // rải suất miễn đấu: vị trí chẵn trước rồi lẻ, để hai bye không dồn một nhánh
    const order = [...Array(r1).keys()].sort((a, b) => (a % 2) - (b % 2) || a - b);
    const byePos = new Set(order.slice(0, byes));

    const grid = [];
    for (let r = 1; r <= rounds; r++) {
      const n = size / 2 ** r;
      grid[r] = [...Array(n).keys()].map((p) => ({
        tournament: t._id,
        round: r,
        position: p,
        roundName: roundName(n, r),
        entryA: null,
        entryB: null,
        status: "scheduled",
        winner: null,
        isBye: false,
        updatedBy: req.user._id,
      }));
    }
    let k = 0;
    for (let p = 0; p < r1; p++) {
      const m = grid[1][p];
      m.entryA = ids[k++];
      if (byePos.has(p)) {
        m.isBye = true;
        m.status = "walkover";
        m.winner = m.entryA;
        m.note = "Miễn đấu vòng 1";
        if (rounds > 1) grid[2][Math.floor(p / 2)][p % 2 === 0 ? "entryA" : "entryB"] = m.entryA;
      } else {
        m.entryB = ids[k++];
      }
    }

    // Xếp giờ + sân tuần tự theo vòng (nếu có giờ bắt đầu)
    const courts = courtIds.filter(isId);
    if (startAt && !Number.isNaN(new Date(startAt).getTime())) {
      const base = new Date(startAt).getTime();
      const perSlot = Math.max(10, Number(matchMinutes) || 30) * 60000;
      const lanes = Math.max(1, courts.length);
      let slot = 0;
      for (let r = 1; r <= rounds; r++) {
        // vòng mới bắt đầu ở lượt kế tiếp
        if (slot % lanes !== 0) slot += lanes - (slot % lanes);
        for (const m of grid[r]) {
          if (m.isBye) continue;
          m.scheduledAt = new Date(base + Math.floor(slot / lanes) * perSlot);
          m.court = courts.length ? courts[slot % lanes] : null;
          slot++;
        }
      }
    }

    await Match.deleteMany({ tournament: t._id });
    await Match.insertMany(grid.flat().filter(Boolean));
    if (t.status === "open") {
      t.status = "closed"; // đã bốc thăm thì đóng đăng ký
      await t.save();
    }
    res.json({
      success: true,
      message: `Đã bốc thăm ${ids.length} ${t.playType === "pair" ? "cặp" : "VĐV"}, ${rounds} vòng${byes ? `, ${byes} suất miễn đấu` : ""}`,
    });
  } catch (e) {
    handleErr(res, e);
  }
};

// POST /api/tournaments/:id/matches — thêm trận thủ công (giao hữu, tranh hạng 3...)
const createMatch = async (req, res) => {
  try {
    const t = await loadManaged(req, res, req.params.id);
    if (!t) return;
    const { entryA, entryB, roundName: name, court, scheduledAt } = req.body;
    if (!isId(entryA) || !isId(entryB) || String(entryA) === String(entryB)) {
      return fail(res, 400, "Chọn hai đối thủ khác nhau");
    }
    const ok = await Registration.countDocuments({
      _id: { $in: [entryA, entryB] },
      tournament: t._id,
      status: "confirmed",
    });
    if (ok !== 2) return fail(res, 400, "Đối thủ phải là đăng ký đã xác nhận của giải này");
    // Đặt ở "vòng" 100 để không lẫn với sơ đồ loại trực tiếp
    const last = await Match.findOne({ tournament: t._id, round: 100 }).sort({ position: -1 });
    const m = await Match.create({
      tournament: t._id,
      round: 100,
      position: last ? last.position + 1 : 0,
      roundName: name || "Trận phụ",
      entryA,
      entryB,
      court: isId(court) ? court : null,
      scheduledAt: scheduledAt || undefined,
      inBracket: false,
      updatedBy: req.user._id,
    });
    res.status(201).json({ success: true, message: "Đã thêm trận đấu", match: m });
  } catch (e) {
    handleErr(res, e);
  }
};

const nextOf = (m) =>
  m.inBracket
    ? Match.findOne({ tournament: m.tournament, round: m.round + 1, position: Math.floor(m.position / 2) })
    : null;

// PUT /api/tournaments/matches/:matchId
// { court, scheduledAt, note, status, sets:[{a,b}], winner }  — cập nhật lịch và tỷ số
const updateMatch = async (req, res) => {
  try {
    if (!isId(req.params.matchId)) return fail(res, 404, "Không tìm thấy trận đấu");
    const m = await Match.findById(req.params.matchId);
    if (!m) return fail(res, 404, "Không tìm thấy trận đấu");
    const t = await loadManaged(req, res, m.tournament);
    if (!t) return;
    if (t.resultsPublished) return fail(res, 400, "Kết quả đã công bố, hãy gỡ công bố trước khi sửa");
    if (m.isBye) return fail(res, 400, "Trận miễn đấu không cần cập nhật");

    const { court, scheduledAt, note, status, sets, winner } = req.body;
    if (court !== undefined) m.court = isId(court) ? court : null;
    if (scheduledAt !== undefined) m.scheduledAt = scheduledAt || undefined;
    if (note !== undefined) m.note = note;

    const prevWinner = m.winner ? String(m.winner) : null;

    if (status !== undefined) {
      if (!["scheduled", "playing", "finished", "walkover"].includes(status)) {
        return fail(res, 400, "Trạng thái trận không hợp lệ");
      }
      if (status !== "scheduled" && (!m.entryA || !m.entryB)) {
        return fail(res, 400, "Trận chưa đủ hai đối thủ");
      }
      if (status === "finished") {
        const clean = (Array.isArray(sets) ? sets : [])
          .map((s) => ({ a: Number(s.a), b: Number(s.b) }))
          .filter((s) => Number.isFinite(s.a) && Number.isFinite(s.b));
        if (!clean.length) return fail(res, 400, "Nhập tỷ số ít nhất một séc");
        if (clean.some((s) => s.a === s.b || s.a < 0 || s.b < 0)) {
          return fail(res, 400, "Tỷ số mỗi séc phải có bên thắng");
        }
        const wa = clean.filter((s) => s.a > s.b).length;
        const wb = clean.length - wa;
        if (wa === wb) return fail(res, 400, "Hai bên đang hoà số séc, chưa xác định người thắng");
        m.sets = clean;
        m.winner = wa > wb ? m.entryA : m.entryB;
      } else if (status === "walkover") {
        if (![String(m.entryA), String(m.entryB)].includes(String(winner))) {
          return fail(res, 400, "Chọn bên được xử thắng");
        }
        m.sets = [];
        m.winner = winner;
      } else {
        if (status === "playing" && Array.isArray(sets)) {
          m.sets = sets
            .map((s) => ({ a: Number(s.a) || 0, b: Number(s.b) || 0 }))
            .slice(0, 5);
        }
        if (status === "scheduled") m.sets = [];
        m.winner = null;
      }
      m.status = status;
    }

    // Đẩy người thắng sang vòng sau (sơ đồ loại trực tiếp)
    const newWinner = m.winner ? String(m.winner) : null;
    if (newWinner !== prevWinner) {
      const next = await nextOf(m);
      if (next) {
        if (["playing", "finished", "walkover"].includes(next.status)) {
          return fail(res, 400, "Trận vòng sau đã thi đấu, không thể đổi người thắng trận này");
        }
        next[m.position % 2 === 0 ? "entryA" : "entryB"] = m.winner || null;
        await next.save();
      }
    }

    m.updatedBy = req.user._id;
    await m.save();

    if (["open", "closed"].includes(t.status) && ["playing", "finished", "walkover"].includes(m.status)) {
      t.status = "ongoing";
      await t.save();
    }

    const populated = await Match.findById(m._id)
      .populate("entryA entryB winner", "displayName code checkedIn")
      .populate("court", "name");
    res.json({ success: true, message: "Đã cập nhật trận đấu", match: populated });
  } catch (e) {
    handleErr(res, e);
  }
};

// DELETE /api/tournaments/:id/matches — xoá toàn bộ lịch (admin)
const resetMatches = async (req, res) => {
  try {
    const t = await loadManaged(req, res, req.params.id);
    if (!t) return;
    if (t.resultsPublished) return fail(res, 400, "Kết quả đã công bố, không thể xoá lịch");
    const r = await Match.deleteMany({ tournament: t._id });
    res.json({ success: true, message: `Đã xoá ${r.deletedCount} trận` });
  } catch (e) {
    handleErr(res, e);
  }
};

// ---------------------------------------------------------------------
// Kết quả
// ---------------------------------------------------------------------
// Gợi ý thứ hạng từ sơ đồ: vô địch, á quân, đồng hạng 3 (thua bán kết)
const computeResults = async (t) => {
  const bracket = await Match.find({ tournament: t._id, inBracket: true }).sort({ round: -1 });
  if (!bracket.length) return { ready: false, message: "Chưa có lịch thi đấu", results: [] };
  const maxRound = bracket[0].round;
  const final = bracket.find((m) => m.round === maxRound);
  if (!final.winner) return { ready: false, message: "Trận chung kết chưa có kết quả", results: [] };
  const loser = (m) =>
    m.winner && m.entryA && m.entryB ? (String(m.winner) === String(m.entryA) ? m.entryB : m.entryA) : null;
  const results = [{ rank: 1, registration: final.winner }];
  if (loser(final)) results.push({ rank: 2, registration: loser(final) });
  for (const s of bracket.filter((m) => m.round === maxRound - 1)) {
    if (loser(s)) results.push({ rank: 3, registration: loser(s) });
  }
  return { ready: true, results };
};

// GET /api/tournaments/:id/results/suggest
const suggestResults = async (req, res) => {
  try {
    const t = await loadManaged(req, res, req.params.id);
    if (!t) return;
    const s = await computeResults(t);
    const regs = await Registration.find({ _id: { $in: s.results.map((r) => r.registration) } }).select(
      "displayName code"
    );
    const name = Object.fromEntries(regs.map((r) => [String(r._id), r.displayName]));
    res.json({
      success: true,
      ...s,
      results: s.results.map((r) => ({ ...r, displayName: name[String(r.registration)] || "" })),
    });
  } catch (e) {
    handleErr(res, e);
  }
};

// POST /api/tournaments/:id/results/publish { results?: [{rank, registration, prize}] }
const publishResults = async (req, res) => {
  try {
    const t = await loadManaged(req, res, req.params.id);
    if (!t) return;
    let results = req.body.results;
    if (!Array.isArray(results) || !results.length) {
      const s = await computeResults(t);
      if (!s.ready) return fail(res, 400, s.message);
      results = s.results;
    }
    const regIds = results.map((r) => r.registration).filter(isId);
    const regs = await Registration.find({ _id: { $in: regIds }, tournament: t._id, status: "confirmed" });
    if (regs.length !== new Set(regIds.map(String)).size || regIds.length !== results.length) {
      return fail(res, 400, "Kết quả có đăng ký không hợp lệ");
    }
    const name = Object.fromEntries(regs.map((r) => [String(r._id), r.displayName]));
    t.results = results
      .map((r) => ({
        rank: Number(r.rank),
        registration: r.registration,
        displayName: name[String(r.registration)],
        prize: r.prize || "",
      }))
      .sort((a, b) => a.rank - b.rank);
    t.resultsPublished = true;
    t.resultsPublishedAt = new Date();
    t.status = "completed";
    await t.save();
    res.json({ success: true, message: "Đã công bố kết quả giải đấu", tournament: t });
  } catch (e) {
    handleErr(res, e);
  }
};

// PUT /api/tournaments/:id/results/unpublish
const unpublishResults = async (req, res) => {
  try {
    const t = await loadManaged(req, res, req.params.id);
    if (!t) return;
    t.resultsPublished = false;
    if (t.status === "completed") t.status = "ongoing";
    await t.save();
    res.json({ success: true, message: "Đã gỡ công bố kết quả", tournament: t });
  } catch (e) {
    handleErr(res, e);
  }
};

// =====================================================================
// ADMIN — GIẢI ĐẤU
// =====================================================================
const T_FIELDS = [
  "name", "description", "rules", "prizes", "location", "startDate", "endDate",
  "registrationDeadline", "entryFee", "maxParticipants", "status", "sponsors",
];

const createTournament = async (req, res) => {
  try {
    const et = isId(req.body.eventType) ? await EventType.findById(req.body.eventType) : null;
    if (!et) return fail(res, 400, "Vui lòng chọn loại giải");
    const t = await Tournament.create({
      ...pick(req.body, T_FIELDS),
      eventType: et._id,
      playType: et.playType,
      staff: (req.body.staff || []).filter(isId),
      createdBy: req.user._id,
    });
    res.status(201).json({ success: true, message: "Đã tạo giải đấu", tournament: t });
  } catch (e) {
    handleErr(res, e);
  }
};

const updateTournament = async (req, res) => {
  try {
    const t = await Tournament.findById(req.params.id);
    if (!t) return fail(res, 404, "Không tìm thấy giải đấu");
    const data = pick(req.body, T_FIELDS);
    if (req.body.eventType && String(req.body.eventType) !== String(t.eventType)) {
      const et = await EventType.findById(req.body.eventType);
      if (!et) return fail(res, 400, "Loại giải không hợp lệ");
      if (et.playType !== t.playType && (await Registration.exists({ tournament: t._id }))) {
        return fail(res, 400, "Giải đã có người đăng ký, không đổi được hình thức đơn/đôi");
      }
      t.eventType = et._id;
      t.playType = et.playType;
    }
    if (data.maxParticipants !== undefined) {
      const used = await slotCount(t._id);
      if (Number(data.maxParticipants) < used) {
        return fail(res, 400, `Đã có ${used} đăng ký, số suất không thể nhỏ hơn`);
      }
    }
    if (data.status === "completed" && !t.resultsPublished) {
      return fail(res, 400, "Hãy công bố kết quả để kết thúc giải");
    }
    Object.assign(t, data);
    await t.save();
    res.json({ success: true, message: "Đã cập nhật giải đấu", tournament: t });
  } catch (e) {
    handleErr(res, e);
  }
};

const deleteTournament = async (req, res) => {
  try {
    const t = await Tournament.findById(req.params.id);
    if (!t) return fail(res, 404, "Không tìm thấy giải đấu");
    const paid = await Registration.countDocuments({
      tournament: t._id,
      paymentStatus: "paid",
      fee: { $gt: 0 },
      status: { $in: ACTIVE_REG },
    });
    if (paid && req.query.force !== "true") {
      return fail(res, 400, `Có ${paid} đăng ký đã nộp lệ phí. Hãy chuyển giải sang "Đã huỷ" và hoàn tiền thay vì xoá.`);
    }
    await Promise.all([
      Registration.deleteMany({ tournament: t._id }),
      Match.deleteMany({ tournament: t._id }),
      t.deleteOne(),
    ]);
    res.json({ success: true, message: "Đã xoá giải đấu" });
  } catch (e) {
    handleErr(res, e);
  }
};

// PUT /api/tournaments/:id/staff { staff: [userId] }
const assignStaff = async (req, res) => {
  try {
    const t = await Tournament.findById(req.params.id);
    if (!t) return fail(res, 404, "Không tìm thấy giải đấu");
    const ids = (req.body.staff || []).filter(isId);
    const users = await User.find({ _id: { $in: ids }, role: "pos_staff" }).select("_id name");
    if (users.length !== new Set(ids.map(String)).size) {
      return fail(res, 400, "Chỉ phân công được tài khoản nhân viên");
    }
    t.staff = users.map((u) => u._id);
    await t.save();
    res.json({
      success: true,
      message: users.length ? `Đã phân công ${users.map((u) => u.name).join(", ")}` : "Đã bỏ phân công",
      tournament: t,
    });
  } catch (e) {
    handleErr(res, e);
  }
};

// GET /api/tournaments/manage/staff — danh sách nhân viên để phân công
const getStaffOptions = async (req, res) => {
  try {
    const staff = await User.find({ role: "pos_staff" }).select("name email").sort({ name: 1 });
    res.json({ success: true, staff });
  } catch (e) {
    handleErr(res, e);
  }
};

// GET /api/tournaments/manage/stats — thống kê người tham gia và kết quả
const getStats = async (req, res) => {
  try {
    const list = await Tournament.find({ status: { $ne: "draft" } })
      .populate("eventType", "name")
      .sort({ startDate: -1 });
    const ids = list.map((t) => t._id);
    const counts = await regCounts(ids);
    const matchCounts = await Match.aggregate([
      { $match: { tournament: { $in: ids }, isBye: false } },
      {
        $group: {
          _id: "$tournament",
          total: { $sum: 1 },
          done: { $sum: { $cond: [{ $in: ["$status", ["finished", "walkover"]] }, 1, 0] } },
        },
      },
    ]);
    const mmap = Object.fromEntries(matchCounts.map((m) => [String(m._id), m]));

    const rows = list.map((t) => {
      const c = counts[String(t._id)] || emptyCounts;
      const per = t.playType === "pair" ? 2 : 1;
      return {
        _id: t._id,
        name: t.name,
        eventType: t.eventType?.name || "",
        status: t.status,
        startDate: t.startDate,
        maxParticipants: t.maxParticipants,
        registrations: c.pending + c.confirmed + c.rejected + c.cancelled,
        pending: c.pending,
        confirmed: c.confirmed,
        rejected: c.rejected,
        cancelled: c.cancelled,
        players: c.confirmed * per,
        checkedIn: c.checkedIn,
        revenue: c.revenue,
        matches: mmap[String(t._id)]?.total || 0,
        matchesDone: mmap[String(t._id)]?.done || 0,
        champion: t.resultsPublished ? t.results.find((r) => r.rank === 1)?.displayName || "" : "",
        resultsPublished: t.resultsPublished,
      };
    });

    const sum = (k) => rows.reduce((s, r) => s + r[k], 0);
    const byType = {};
    for (const r of rows) {
      byType[r.eventType] ??= { eventType: r.eventType, tournaments: 0, players: 0 };
      byType[r.eventType].tournaments++;
      byType[r.eventType].players += r.players;
    }

    res.json({
      success: true,
      totals: {
        tournaments: rows.length,
        ongoing: rows.filter((r) => ["open", "closed", "ongoing"].includes(r.status)).length,
        completed: rows.filter((r) => r.status === "completed").length,
        registrations: sum("registrations"),
        confirmed: sum("confirmed"),
        players: sum("players"),
        checkedIn: sum("checkedIn"),
        revenue: sum("revenue"),
        matches: sum("matches"),
        matchesDone: sum("matchesDone"),
      },
      byEventType: Object.values(byType),
      tournaments: rows,
    });
  } catch (e) {
    handleErr(res, e);
  }
};

module.exports = {
  getEventTypes, createEventType, updateEventType, deleteEventType,
  getSponsors, createSponsor, updateSponsor, deleteSponsor,
  getTournaments, getTournament, getMatches,
  registerTournament, getMyRegistrations, cancelMyRegistration,
  getManageList, getRegistrations, reviewRegistration, updatePayment, updateCheckIn,
  generateBracket, createMatch, updateMatch, resetMatches,
  suggestResults, publishResults, unpublishResults,
  createTournament, updateTournament, deleteTournament, assignStaff, getStaffOptions, getStats,
};
