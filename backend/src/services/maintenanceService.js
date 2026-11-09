const mongoose = require("mongoose");
const Maintenance = require("../models/Maintenance");
const Court = require("../models/Court");
const Inspection = require("../models/Inspection");
const MaintenanceLog = require("../models/MaintenanceLog");

// ============ STATE MACHINE TRẠNG THÁI PHIẾU BẢO TRÌ ============
// Mọi lần đổi trạng thái (Admin lẫn POS) PHẢI đi qua changeTicketStatus —
// không controller nào được tự gán field status.
const STATUS_TRANSITIONS = {
  pending: ["in_progress", "cancelled"],
  // completed trực tiếp từ in_progress: shortcut — giữ cho UI cũ/emergency chưa có luồng
  // nghiệm thu; Phase 6 (N1.8) sẽ cân nhắc bỏ cung này khi màn POS "Hoàn tất" đã chạy
  in_progress: ["pending_acceptance", "on_hold", "cancelled", "completed"],
  on_hold: ["in_progress", "cancelled"],
  // Trả về làm lại (in_progress) hoặc Admin duyệt (completed)
  pending_acceptance: ["completed", "in_progress"],
  completed: [],
  cancelled: [],
};

// Trạng thái "phiếu còn hiệu lực chặn sân" (chưa tới đích, chưa bị hủy)
const ACTIVE_STATUSES = [
  "pending",
  "in_progress",
  "on_hold",
  "pending_acceptance",
];

// Chỉ các trạng thái này thực sự ĐÓNG sân (đã set court = maintenance)
const CLOSED_STATUSES = ["in_progress", "on_hold", "pending_acceptance"];

// Báo cáo routine severity critical chưa có phiếu + chưa bỏ qua ⇒ sân tạm ngưng
const hasPendingCriticalReport = async (courtId, session) => {
  const reports = await Inspection.find({
    court: courtId,
    type: "routine",
    severity: "critical",
    dismissal: null,
  })
    .select("_id")
    .session(session)
    .lean();
  for (const r of reports) {
    // Phiếu ĐÃ XÓA MỀM không được tính là "đã xử lý" báo cáo
    const ticketLinked = await Maintenance.exists(
      { inspection: r._id, isDeleted: { $ne: true } },
      { session },
    );
    if (!ticketLinked) return true;
  }
  return false;
};

// Còn lý do gì khiến sân phải ở trạng thái maintenance không?
// (loại trừ phiếu đang xét — vì nó vừa được chuyển sang completed/cancelled)
const hasOtherClosureReason = async (courtId, excludeTicketId, session) => {
  const blockingTicket = await Maintenance.exists(
    {
      court: courtId,
      _id: { $ne: excludeTicketId },
      status: { $in: CLOSED_STATUSES },
      requiresClosure: true,
      isDeleted: { $ne: true },
    },
    { session },
  );
  if (blockingTicket) return true;
  return hasPendingCriticalReport(courtId, session);
};

// ============ CHẶN ĐẶT SÂN (N1.7) — MỘT NGUỒN SỰ THẬT ============
// Mọi điểm kiểm tra "slot này có nhận đặt không" đều phải đi qua đây,
// không tự viết query Maintenance/Inspection rải rác nữa.

// Chuỗi "YYYY-MM-DD"/"HH:mm" so sánh đúng thứ tự — khỏi cần Date
const slotHitsWindow = (w, date, startTime, endTime) =>
  date >= w.startDate &&
  date <= w.endDate &&
  startTime < w.endTime &&
  endTime > w.startTime;

// Thông tin chặn của một sân: cửa sổ phiếu đóng sân + trạng thái tạm ngưng
const getBlockingInfo = async (courtId, session) => {
  const windows = await Maintenance.find({
    court: courtId,
    status: { $in: ACTIVE_STATUSES },
    requiresClosure: true,
    isDeleted: { $ne: true },
  })
    .select("startDate endDate startTime endTime ticketCode")
    .session(session)
    .lean();
  return {
    suspended: await hasPendingCriticalReport(courtId, session),
    windows,
  };
};

// Khung giờ [date, startTime-endTime] có bị chặn đặt không?
// (b) tạm ngưng thắng trước — chặn mọi slot; (a) phiếu closure theo cửa sổ
const isSlotBlocked = async (courtId, date, startTime, endTime, session) => {
  const { suspended, windows } = await getBlockingInfo(courtId, session);
  if (suspended) return { blocked: true, reason: "suspended", window: null };
  const hit =
    windows.find((w) => slotHitsWindow(w, date, startTime, endTime)) || null;
  return hit
    ? { blocked: true, reason: "maintenance", window: hit }
    : { blocked: false, reason: null, window: null };
};

// Bulk: mọi sân đang TẠM NGƯNG (2 query — cho active-courts, board, cây sân)
const getSuspendedCourtIds = async () => {
  const reports = await Inspection.find({
    type: "routine",
    severity: "critical",
    dismissal: null,
  })
    .select("_id court")
    .lean();
  if (!reports.length) return [];
  const linked = await Maintenance.find({
    inspection: { $in: reports.map((r) => r._id) },
    isDeleted: { $ne: true },
  })
    .select("inspection")
    .lean();
  const handled = new Set(linked.map((l) => String(l.inspection)));
  return [
    ...new Set(
      reports
        .filter((r) => !handled.has(String(r._id)))
        .map((r) => String(r.court)),
    ),
  ];
};

/**
 * Chuyển trạng thái phiếu bảo trì — CỬA DUY NHẤT.
 * Ghi statusHistory, đồng bộ actualStart/actualEnd/downtimeMinutes/costTotal,
 * đóng/mở sân theo requiresClosure.
 *
 * @param {ObjectId} ticketId
 * @param {String}   toStatus
 * @param {Object}   opts  { by: userId, note: String, session?: Session }
 * @returns {Promise<Maintenance>} phiếu sau cập nhật
 * @throws  {Error}  err.status = 404 (không tìm thấy) | 400 (chuyển invalid)
 */
const changeTicketStatus = async (
  ticketId,
  toStatus,
  { by, note, session } = {},
) => {
  if (!(toStatus in STATUS_TRANSITIONS)) {
    const err = new Error(`Trạng thái không hợp lệ: ${toStatus}`);
    err.status = 400;
    throw err;
  }

  const ownSession = !session;
  const sess = session || (await mongoose.startSession());

  const run = async () => {
    const ticket = await Maintenance.findById(ticketId).session(sess);
    if (!ticket || ticket.isDeleted) {
      const err = new Error("Không tìm thấy phiếu bảo trì");
      err.status = 404;
      throw err;
    }
    if (!STATUS_TRANSITIONS[ticket.status].includes(toStatus)) {
      const err = new Error(
        `Không thể chuyển từ "${ticket.status}" sang "${toStatus}"`,
      );
      err.status = 400;
      throw err;
    }
    // N1.6: Hủy từ in_progress/on_hold trở đi bắt buộc lý do (ghi vào statusHistory)
    if (toStatus === "cancelled" && ticket.status !== "pending" && !note) {
      const err = new Error("Hủy phiếu đang thực hiện phải có lý do");
      err.status = 400;
      throw err;
    }
    // N1.8: Admin chỉ được "Hoàn thành" từ pending_acceptance khi LẦN KIỂM TRA LẠI
    // GẦN NHẤT của nghiệm thu = đạt (đường tắt legacy in_progress→completed không gate)
    if (ticket.status === "pending_acceptance" && toStatus === "completed") {
      const last = await Inspection.findOne({
        ticket: ticket._id,
        type: "acceptance",
      })
        .sort({ createdAt: -1 })
        .session(sess)
        .lean();
      if (!last) {
        const err = new Error(
          "Chưa có lần kiểm tra lại nào — nhân viên phải kiểm tra lại (nghiệm thu) trước khi duyệt",
        );
        err.status = 400;
        throw err;
      }
      if (last.result !== "pass") {
        const err = new Error(
          "Lần kiểm tra lại gần nhất KHÔNG ĐẠT — trả về làm lại hoặc cho nhân viên kiểm lại",
        );
        err.status = 400;
        throw err;
      }
    }
    // Trả về làm lại bắt buộc kèm lý do (nằm trong note → statusHistory)
    if (ticket.status === "pending_acceptance" && toStatus === "in_progress" && !note) {
      const err = new Error("Trả về làm lại phải có lý do");
      err.status = 400;
      throw err;
    }

    const now = new Date();

    // ---- GHI NHẬN THỜI GIAN THỰC TẾ ----
    if (toStatus === "in_progress" && !ticket.actualStart) {
      ticket.actualStart = now;
    }
    if (toStatus === "completed") {
      ticket.actualEnd = now;
      ticket.completedAt = now;
      if (note) ticket.completionNote = note;
      // downtime = sân đóng từ lúc bắt đầu đến lúc duyệt xong (tính cả On Hold)
      if (ticket.requiresClosure && ticket.actualStart) {
        ticket.downtimeMinutes = Math.round((now - ticket.actualStart) / 60000);
      }
      // N1.9: chốt chi phí nhân công/vật tư từ nhật ký (trừ log voided) ngay lúc hoàn thành
      const [sums] = await MaintenanceLog.aggregate(
        [
          {
            $match: {
              ticket: ticket._id,
              status: { $ne: "voided" },
            },
          },
          {
            $group: {
              _id: null,
              labor: { $sum: "$laborCost" },
              material: { $sum: "$materialCost" },
            },
          },
        ],
        { session: sess },
      );
      ticket.costLabor = sums?.labor || 0;
      ticket.costMaterial = sums?.material || 0;
      ticket.costTotal =
        ticket.costLabor + ticket.costMaterial + ticket.costContractor;
    }

    // ---- ĐỒNG BỘ TRẠNG THÁI SÂN ----
    if (toStatus === "in_progress" && ticket.requiresClosure) {
      await Court.findByIdAndUpdate(
        ticket.court,
        { status: "maintenance" },
        { session: sess },
      );
    }
    if (
      (toStatus === "completed" || toStatus === "cancelled") &&
      ticket.requiresClosure
    ) {
      const stillBlocked = await hasOtherClosureReason(
        ticket.court,
        ticket._id,
        sess,
      );
      if (!stillBlocked) {
        await Court.findByIdAndUpdate(
          ticket.court,
          { status: "active" },
          { session: sess },
        );
      }
    }

    // ---- GHI LỊCH SỬ + LƯU ----
    ticket.status = toStatus;
    ticket.statusHistory.push({
      status: toStatus,
      by: by || null,
      at: now,
      note: note || "",
    });
    await ticket.save({ session: sess });
    return ticket;
  };

  try {
    if (ownSession) sess.startTransaction();
    const result = await run();
    if (ownSession) await sess.commitTransaction();
    return result;
  } catch (error) {
    if (ownSession) {
      try {
        await sess.abortTransaction();
      } catch {
        // transaction chưa kịp bắt đầu (lỗi validation trước startTransaction)
      }
    }
    throw error;
  } finally {
    if (ownSession) sess.endSession();
  }
};

module.exports = {
  changeTicketStatus,
  STATUS_TRANSITIONS,
  ACTIVE_STATUSES,
  CLOSED_STATUSES,
  hasPendingCriticalReport,
  getBlockingInfo,
  isSlotBlocked,
  getSuspendedCourtIds,
  slotHitsWindow,
};
