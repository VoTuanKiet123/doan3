const mongoose = require("mongoose");
const Maintenance = require("../models/Maintenance");
const MaintenanceLog = require("../models/MaintenanceLog");
const Inspection = require("../models/Inspection");
const { changeTicketStatus } = require("../services/maintenanceService");

// ============ HELPERS ============

const todayVN = () => {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }),
  );
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

// Log chỉ chủ ca (hoặc admin) được sửa/hủy; phiếu completed thì khóa hết
const assertCanEditLog = (log, ticket, user) => {
  if (log.status === "voided") {
    throw httpError(400, "Nhật ký đã hủy bỏ, không sửa được");
  }
  if (ticket.status === "completed") {
    throw httpError(403, "Phiếu đã hoàn thành — nhật ký bị khóa");
  }
  if (
    user.role !== "admin" &&
    String(log.performedBy) !== String(user._id)
  ) {
    throw httpError(403, "Chỉ người thực hiện ca này mới sửa được nhật ký");
  }
};

// ============ N2.5 — HÀNG ĐỢI CỦA POS ============

// @desc    Danh sách việc bảo trì nhân viên cần làm: phiếu pending/in_progress/on_hold
//          + sân có báo cáo chờ xử lý mà chưa có phiếu. Kèm quá hạn & ai đang làm.
// @route   GET /api/maintenance-logs/queue
const getQueue = async (req, res) => {
  try {
    const today = todayVN();
    const [tickets, openLogs, accTickets] = await Promise.all([
      Maintenance.find({
        status: { $in: ["pending", "in_progress", "on_hold"] },
        isDeleted: { $ne: true },
      })
        .populate("court", "name")
        .sort({ priority: -1, endDate: 1 })
        .lean(),
      MaintenanceLog.find({ status: "open" })
        .populate("performedBy", "name")
        .lean(),
      // N2.10: phiếu chờ nghiệm thu — nhân viên kiểm tra lại sau sửa
      Maintenance.find({
        status: "pending_acceptance",
        isDeleted: { $ne: true },
      })
        .populate("court", "name")
        .sort({ createdAt: -1 })
        .lean(),
    ]);
    const openByTicket = new Map(openLogs.map((l) => [String(l.ticket), l]));

    const ticketRows = tickets.map((t) => {
      const open = openByTicket.get(String(t._id));
      return {
        ...t,
        overdue: !!t.endDate && t.endDate < today,
        openBy: open ? open.performedBy?.name || "—" : null,
        openByMe: open ? String(open.performedBy?._id) === String(req.user._id) : false,
      };
    });

    // Báo cáo routine chưa có phiếu (thông tin cho nhân viên biết sân đang chờ Admin)
    const reports = await Inspection.find({
      type: "routine",
      severity: { $ne: "none" },
      dismissal: null,
    })
      .populate("court", "name")
      .lean();
    const linked = reports.length
      ? await Maintenance.find({
          inspection: { $in: reports.map((r) => r._id) },
          isDeleted: { $ne: true },
        })
          .select("inspection")
          .lean()
      : [];
    const handled = new Set(linked.map((l) => String(l.inspection)));
    const reportsWaitingTicket = reports.filter(
      (r) => !handled.has(String(r._id)),
    );

    // Sắp xếp: khẩn → quá hạn → còn lại (đúng N2.5)
    ticketRows.sort((a, b) => {
      const ua = a.priority === "urgent" ? 1 : 0;
      const ub = b.priority === "urgent" ? 1 : 0;
      return ub - ua || (b.overdue ? 1 : 0) - (a.overdue ? 1 : 0);
    });

    // Kết quả nghiệm thu GẦN NHẤT của từng phiếu chờ duyệt (1 query cho cả nhóm)
    const accInspections = accTickets.length
      ? await Inspection.find({
          ticket: { $in: accTickets.map((t) => t._id) },
          type: "acceptance",
        })
          .sort({ createdAt: -1 })
          .select("ticket result createdAt failReason")
          .lean()
      : [];
    const latestAcc = new Map();
    accInspections.forEach((a) => {
      const k = String(a.ticket);
      if (!latestAcc.has(k)) latestAcc.set(k, a);
    });
    const acceptanceTasks = accTickets.map((t) => {
      const last = latestAcc.get(String(t._id)) || null;
      return {
        ...t,
        lastAcceptance: last
          ? { result: last.result, at: last.createdAt, failReason: last.failReason }
          : null,
      };
    });

    res.json({
      success: true,
      tickets: ticketRows,
      reportsWaitingTicket,
      acceptanceTasks,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Nhật ký của một phiếu
// @route   GET /api/maintenance-logs?ticket=
const getLogsForTicket = async (req, res) => {
  try {
    const logs = await MaintenanceLog.find({ ticket: req.query.ticket })
      .sort({ startedAt: -1 })
      .populate("performedBy", "name")
      .lean();
    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ N2.6 — BẮT ĐẦU / TIẾP TỤC CA ============

// @desc    Nhân viên nhận việc: tạo log open (hoặc dùng lại ca dở của mình)
//          rồi chuyển phiếu → in_progress. Unique index chặn 2 người cùng làm.
// @route   POST /api/maintenance-logs/start { ticketId }
const startWork = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { ticketId } = req.body;
    const ticket = await Maintenance.findById(ticketId).session(session);
    if (!ticket || ticket.isDeleted) {
      throw httpError(404, "Không tìm thấy phiếu bảo trì");
    }
    if (!["pending", "in_progress", "on_hold"].includes(ticket.status)) {
      throw httpError(400, "Chỉ nhận làm phiếu đang chờ/xin tiếp tục");
    }

    let log = await MaintenanceLog.findOne({
      ticket: ticketId,
      performedBy: req.user._id,
      status: "open",
    }).session(session);

    if (!log) {
      const other = await MaintenanceLog.findOne({
        ticket: ticketId,
        status: "open",
      }).session(session);
      if (other) {
        throw httpError(409, "Đang có nhân viên khác thực hiện phiếu này");
      }
      [log] = await MaintenanceLog.create(
        [
          {
            ticket: ticketId,
            court: ticket.court,
            performedBy: req.user._id,
            startedAt: new Date(),
          },
        ],
        { session },
      );
    }

    if (ticket.status !== "in_progress") {
      await changeTicketStatus(ticketId, "in_progress", {
        by: req.user._id,
        note: "POS bắt đầu bảo trì",
        session,
      });
    }

    await session.commitTransaction();
    const populated = await MaintenanceLog.findById(log._id).populate(
      "performedBy",
      "name",
    );
    res.status(201).json({
      success: true,
      message: "Đã nhận việc — ghi nhật ký trong quá trình làm nhé",
      log: populated,
    });
  } catch (error) {
    await session.abortTransaction().catch(() => {});
    if (error.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: "Đang có nhân viên khác thực hiện phiếu này" });
    }
    res
      .status(error.status || 500)
      .json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

// ============ N2.7/N2.8 — GHI & SỬA NHẬT KÝ ============

const LOG_EDITABLE_FIELDS = [
  "workDone",
  "steps",
  "materialsUsed",
  "laborCost",
  "materialCost",
  "otherCost",
  "photos",
  "note",
];

// @desc    Cập nhật nội dung ca làm (khi log open, hoặc closed mà phiếu chưa completed)
// @route   PUT /api/maintenance-logs/:id
const updateLog = async (req, res) => {
  try {
    const log = await MaintenanceLog.findById(req.params.id);
    if (!log) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy nhật ký" });
    }
    const ticket = await Maintenance.findById(log.ticket);
    assertCanEditLog(log, ticket, req.user);

    LOG_EDITABLE_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) log[field] = req.body[field];
    });
    await log.save();

    res.json({ success: true, message: "Đã lưu nhật ký", log });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ success: false, message: error.message });
  }
};

// @desc    Hủy bỏ một nhật ký (không xóa — voided kèm lý do)
// @route   POST /api/maintenance-logs/:id/void { reason }
const voidLog = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Hủy nhật ký bắt buộc nhập lý do" });
    }
    const log = await MaintenanceLog.findById(req.params.id);
    if (!log) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy nhật ký" });
    }
    const ticket = await Maintenance.findById(log.ticket);
    assertCanEditLog(log, ticket, req.user);

    log.status = "voided";
    log.voidReason = reason.trim();
    if (!log.endedAt) log.endedAt = new Date();
    await log.save();

    res.json({ success: true, message: "Đã hủy bỏ nhật ký", log });
  } catch (error) {
    res
      .status(error.status || 500)
      .json({ success: false, message: error.message });
  }
};

// ============ N2.9 — TẠM DỪNG / HOÀN TẤT ============

// @desc    Tạm dừng (chờ vật tư/nhà thầu): đóng ca đang mở + phiếu → on_hold
// @route   POST /api/maintenance-logs/pause { ticketId, reason }
const pauseWork = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { ticketId, reason } = req.body;
    if (!reason || !reason.trim()) {
      throw httpError(400, "Tạm dừng phải có lý do");
    }
    const open = await MaintenanceLog.findOne({
      ticket: ticketId,
      status: "open",
    }).session(session);
    if (open) {
      if (
        req.user.role !== "admin" &&
        String(open.performedBy) !== String(req.user._id)
      ) {
        throw httpError(403, "Ca đang mở của nhân viên khác — bạn không tạm dừng được");
      }
      open.status = "closed";
      open.endedAt = new Date();
      await open.save({ session });
    }
    await changeTicketStatus(ticketId, "on_hold", {
      by: req.user._id,
      note: reason.trim(),
      session,
    });
    await session.commitTransaction();
    res.json({ success: true, message: "Đã tạm dừng — chờ vật tư/nhà thầu" });
  } catch (error) {
    await session.abortTransaction().catch(() => {});
    res
      .status(error.status || 500)
      .json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

// @desc    Hoàn tất công việc: đóng ca + phiếu → pending_acceptance (sân CHƯA mở)
// @route   POST /api/maintenance-logs/finish { ticketId }
const finishWork = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { ticketId } = req.body;
    const open = await MaintenanceLog.findOne({
      ticket: ticketId,
      status: "open",
    }).session(session);
    if (!open) {
      throw httpError(400, "Không có ca nào đang thực hiện trên phiếu này");
    }
    if (
      req.user.role !== "admin" &&
      String(open.performedBy) !== String(req.user._id)
    ) {
      throw httpError(403, "Ca đang mở của nhân viên khác — bạn hoàn tất không được");
    }
    open.status = "closed";
    open.endedAt = new Date();
    await open.save({ session });

    await changeTicketStatus(ticketId, "pending_acceptance", {
      by: req.user._id,
      note: "POS hoàn tất công việc, chờ nghiệm thu",
      session,
    });
    await session.commitTransaction();
    res.json({
      success: true,
      message: "Đã hoàn tất công việc — chờ Admin duyệt để mở sân",
    });
  } catch (error) {
    await session.abortTransaction().catch(() => {});
    res
      .status(error.status || 500)
      .json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

module.exports = {
  getQueue,
  getLogsForTicket,
  startWork,
  updateLog,
  voidLog,
  pauseWork,
  finishWork,
};
