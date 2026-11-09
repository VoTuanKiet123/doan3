const Maintenance = require("../models/Maintenance");
const Booking = require("../models/Booking");
const Court = require("../models/Court");
const MaintenanceLog = require("../models/MaintenanceLog");
const Inspection = require("../models/Inspection");
const {
  changeTicketStatus,
  ACTIVE_STATUSES,
  getSuspendedCourtIds,
} = require("../services/maintenanceService");
const mongoose = require("mongoose");

// ============ HELPERS ============

/**
 * Sinh mảng các ngày trong khoảng [startDate, endDate].
 */
const generateDateRange = (startDate, endDate) => {
  const parseDate = (dateStr) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  };
  const formatDate = (date) => {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const dates = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(formatDate(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
};

/**
 * Tìm tất cả booking bị ảnh hưởng bởi phiếu bảo trì.
 * Trả về mảng booking (đã populate court, user).
 */
const findAffectedBookings = async (
  courtId,
  startDate,
  endDate,
  startTime,
  endTime,
) => {
  const dates = generateDateRange(startDate, endDate);

  const orConditions = dates.map((date) => ({
    date,
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  }));

  return Booking.find({
    court: courtId,
    status: { $in: ["pending", "confirmed"] },
    $or: orConditions,
  })
    .populate("user", "name email phone")
    .populate("court", "name")
    .lean();
};

/**
 * Tìm sân trống cùng phân khúc giá (chênh lệch < 20%).
 */
const findAlternativeCourt = async (courtId, date, startTime, endTime) => {
  const originalCourt = await Court.findById(courtId).lean();
  if (!originalCourt) return null;

  const priceRange = [
    originalCourt.pricePerHour * 0.8,
    originalCourt.pricePerHour * 1.2,
  ];

  // Tìm các sân active khác cùng tầm giá
  const candidates = await Court.find({
    _id: { $ne: courtId },
    status: "active",
    pricePerHour: { $gte: priceRange[0], $lte: priceRange[1] },
  }).lean();

  for (const candidate of candidates) {
    // Kiểm tra sân này có trống không
    const conflict = await Booking.findOne({
      court: candidate._id,
      date,
      status: { $in: ["pending", "confirmed"] },
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    }).lean();

    if (!conflict) return candidate;
  }

  return null;
};

// ============ CONTROLLERS ============

// @desc    Lấy tất cả phiếu bảo trì (admin)
// @route   GET /api/maintenance
const getMaintenances = async (req, res) => {
  try {
    const { status, court, type } = req.query;
    const filter = { isDeleted: { $ne: true } };
    if (status) filter.status = status;
    if (court) filter.court = court;
    if (type) filter.maintenanceType = type;

    const maintenances = await Maintenance.find(filter)
      .populate("court", "name pricePerHour status")
      .populate("createdBy", "name email")
      .populate("conflictResolution.affectedBookings")
      .populate("conflictResolution.relocatedTo", "name")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: maintenances.length, maintenances });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Lấy chi tiết phiếu bảo trì
// @route   GET /api/maintenance/:id
const getMaintenanceById = async (req, res) => {
  try {
    const maintenance = await Maintenance.findById(req.params.id)
      .populate("court", "name pricePerHour status")
      .populate("createdBy", "name email")
      .populate("statusHistory.by", "name")
      .populate("conflictResolution.affectedBookings")
      .populate("conflictResolution.relocatedTo", "name");

    if (!maintenance || maintenance.isDeleted) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy phiếu bảo trì" });
    }

    // N1.4: chi tiết phiếu đọc kèm nhật ký thực hiện + báo cáo nghiệm thu (chỉ đọc)
    const [logs, inspections] = await Promise.all([
      MaintenanceLog.find({ ticket: maintenance._id })
        .sort({ startedAt: -1 })
        .populate("performedBy", "name")
        .lean(),
      Inspection.find({ ticket: maintenance._id })
        .sort({ createdAt: -1 })
        .populate("inspectedBy", "name")
        .lean(),
    ]);

    // N1.4: chi phí nhân công/vật tư xem theo nhật ký (trừ log voided) — chỉ khi đã có log
    if (logs.length > 0) {
      const sum = (key) =>
        logs
          .filter((l) => l.status !== "voided")
          .reduce((a, l) => a + (l[key] || 0), 0);
      maintenance.costLabor = sum("laborCost");
      maintenance.costMaterial = sum("materialCost");
    }

    res.json({ success: true, maintenance, logs, inspections });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Tạo phiếu bảo trì mới (admin) - CÓ KIỂM TRA XUNG ĐỘT
// @route   POST /api/maintenance
const createMaintenance = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      court: courtId,
      title,
      description,
      startDate,
      endDate,
      startTime = "06:00",
      endTime = "22:00",
      maintenanceType = "scheduled",
      conflictStrategy = "auto_relocate",
      assignedTo,
      // field v2 (có default trong schema nếu không gửi)
      category,
      priority,
      requiresClosure,
      executorType,
      contractor,
      photosBefore,
      inspection: inspectionId,
    } = req.body;

    // Validate cơ bản
    if (startDate > endDate) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc",
      });
    }

    // Kiểm tra sân tồn tại
    const court = await Court.findById(courtId).session(session);
    if (!court) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy sân" });
    }

    // ============ PHÁT HIỆN XUNG ĐỘT ============
    const affectedBookings = await findAffectedBookings(
      courtId,
      startDate,
      endDate,
      startTime,
      endTime,
    );

    let resolvedBookings = [];
    let relocatedTo = null;
    let resolutionNote = "";

    // Phiếu việc nhỏ (requiresClosure = false) không chặn lịch → không đụng booking
    if (affectedBookings.length > 0 && requiresClosure !== false) {
      if (conflictStrategy === "auto_relocate") {
        // Thử chuyển từng booking sang sân khác
        const dates = generateDateRange(startDate, endDate);
        const relocatedMap = new Map(); // bookingId -> courtId

        for (const booking of affectedBookings) {
          const altCourt = await findAlternativeCourt(
            courtId,
            booking.date,
            booking.startTime,
            booking.endTime,
          );
          if (altCourt) {
            relocatedMap.set(booking._id.toString(), altCourt._id);
          }
        }

        const relocatableCount = relocatedMap.size;
        const cannotRelocate = affectedBookings.filter(
          (b) => !relocatedMap.has(b._id.toString()),
        );

        if (cannotRelocate.length > 0) {
          resolutionNote = `Có ${relocatableCount}/${affectedBookings.length} booking được chuyển sân. ${cannotRelocate.length} booking không thể chuyển sẽ bị hủy.`;
        } else {
          resolutionNote = `Tất cả ${affectedBookings.length} booking được chuyển sang sân khác thành công.`;
        }

        // Thực hiện chuyển hoặc hủy
        for (const booking of affectedBookings) {
          const altCourtId = relocatedMap.get(booking._id.toString());
          if (altCourtId) {
            await Booking.findByIdAndUpdate(
              booking._id,
              {
                court: altCourtId,
                note:
                  (booking.note || "") + " | [Tự động chuyển sân do bảo trì]",
              },
              { session },
            );
            resolvedBookings.push(booking._id);
          } else {
            await Booking.findByIdAndUpdate(
              booking._id,
              {
                status: "cancelled",
                note: (booking.note || "") + " | [Hủy do lịch bảo trì sân]",
              },
              { session },
            );
            resolvedBookings.push(booking._id);
          }
        }
      } else if (conflictStrategy === "cancel_booking") {
        // Hủy tất cả booking bị ảnh hưởng
        for (const booking of affectedBookings) {
          await Booking.findByIdAndUpdate(
            booking._id,
            {
              status: "cancelled",
              note:
                (booking.note || "") +
                " | [Hủy do lịch bảo trì sân - hoàn tiền]",
            },
            { session },
          );
          resolvedBookings.push(booking._id);
        }
        resolutionNote = `Đã hủy ${affectedBookings.length} booking bị ảnh hưởng.`;
      } else if (conflictStrategy === "force_override") {
        // Ép bảo trì - chỉ hủy booking
        for (const booking of affectedBookings) {
          await Booking.findByIdAndUpdate(
            booking._id,
            {
              status: "cancelled",
              note:
                (booking.note || "") + " | [Hủy khẩn cấp do sự cố kỹ thuật]",
            },
            { session },
          );
          resolvedBookings.push(booking._id);
        }
        resolutionNote = `Bảo trì khẩn cấp! Đã hủy ${affectedBookings.length} booking.`;
      }
    }

    // ============ TẠO PHIẾU BẢO TRÌ ============
    const maintenance = await Maintenance.create(
      [
        {
          court: courtId,
          title,
          description,
          startDate,
          endDate,
          startTime,
          endTime,
          maintenanceType,
          status: "pending",
          ...(category && { category }),
          ...(priority && { priority }),
          ...(requiresClosure !== undefined && { requiresClosure }),
          ...(executorType && { executorType }),
          ...(contractor && { contractor }),
          ...(photosBefore && { photosBefore }),
          ...(inspectionId && { inspection: inspectionId }),
          conflictResolution: {
            strategy: conflictStrategy,
            affectedBookings: resolvedBookings,
            relocatedTo,
            resolutionNote,
          },
          createdBy: req.user._id,
          assignedTo,
        },
      ],
      { session },
    );

    // KHÔNG set court về "maintenance" khi tạo phiếu pending
    // Court chỉ chuyển "maintenance" khi phiếu chuyển sang "in_progress"
    // (Việc chặn đặt lịch trong thời gian bảo trì được xử lý bởi
    //  checkMaintenanceConflict trong bookingController + bulkCheckConflicts)

    await session.commitTransaction();

    // Populate để trả về
    const populated = await Maintenance.findById(maintenance[0]._id)
      .populate("court", "name pricePerHour status")
      .populate("createdBy", "name email")
      .populate("conflictResolution.affectedBookings");

    res.status(201).json({
      success: true,
      message: "Tạo phiếu bảo trì thành công",
      maintenance: populated,
      affectedCount: affectedBookings.length,
      conflictNote: resolutionNote,
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

// @desc    Cập nhật trạng thái phiếu bảo trì
// @route   PUT /api/maintenance/:id/status
// Mọi chuyển trạng thái đi qua changeTicketStatus (state machine + history + đồng bộ sân)
const updateMaintenanceStatus = async (req, res) => {
  try {
    const { status, completionNote, cost, costNote } = req.body;

    const updated = await changeTicketStatus(req.params.id, status, {
      by: req.user._id,
      note: completionNote,
    });

    // UI cũ nhập cost lúc hoàn thành → ghi tiếp vào field legacy + costContractor
    if (updated.status === "completed" && (cost !== undefined || costNote)) {
      const legacy = {};
      if (cost !== undefined) {
        legacy.cost = cost;
        legacy.costContractor = cost;
        // changeTicketStatus đã tính costTotal TRƯỚC khi costContractor được ghi → cộng lại đủ 3 vế
        legacy.costTotal = updated.costLabor + updated.costMaterial + cost;
      }
      if (costNote) legacy.costNote = costNote;
      await Maintenance.findByIdAndUpdate(updated._id, legacy);
    }

    const populated = await Maintenance.findById(updated._id)
      .populate("court", "name pricePerHour status")
      .populate("createdBy", "name email")
      .populate("statusHistory.by", "name")
      .populate("conflictResolution.affectedBookings")
      .populate("conflictResolution.relocatedTo", "name");

    res.json({
      success: true,
      message: `Phiếu bảo trì đã chuyển sang "${status}"`,
      maintenance: populated,
    });
  } catch (error) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// @desc    Cập nhật phiếu bảo trì theo trạng thái (N1.5)
// @route   PUT /api/maintenance/:id
// pending sửa mọi field; đang làm chỉ sửa 5 field; completed chỉ sửa chi phí+hóa đơn (kèm lý do); cancelled khóa
const EDITABLE_FIELDS_BY_STATUS = {
  pending: [
    "title",
    "description",
    "startDate",
    "endDate",
    "startTime",
    "endTime",
    "maintenanceType",
    "category",
    "priority",
    "requiresClosure",
    "assignedTo",
    "executorType",
    "contractor",
    "cost",
    "costNote",
    "photosBefore",
  ],
  in_progress: ["description", "assignedTo", "priority", "endDate", "endTime"],
  on_hold: ["description", "assignedTo", "priority", "endDate", "endTime"],
  pending_acceptance: [
    "description",
    "assignedTo",
    "priority",
    "endDate",
    "endTime",
  ],
  completed: ["costContractor", "contractor", "isUnderWarranty", "costNote", "attachments"],
  cancelled: [],
};

const updateMaintenance = async (req, res) => {
  try {
    const ticket = await Maintenance.findById(req.params.id);
    if (!ticket) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy phiếu bảo trì" });
    }

    const allowed = EDITABLE_FIELDS_BY_STATUS[ticket.status] || [];
    const changed = [];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) {
        ticket[field] = req.body[field];
        changed.push(field);
      }
    });

    if (ticket.status === "cancelled" || (!changed.length && !req.body.reason)) {
      return res.status(400).json({
        success: false,
        message:
          ticket.status === "cancelled"
            ? "Phiếu đã hủy — khóa, không sửa được"
            : "Không có field nào được phép sửa ở trạng thái này",
      });
    }
    // Phiếu đã hoàn thành: Admin chỉ sửa chi phí/hóa đơn, BẮT BUỘC lý do
    if (ticket.status === "completed" && !req.body.reason) {
      return res
        .status(400)
        .json({ success: false, message: "Sửa phiếu hoàn thành bắt buộc nhập lý do" });
    }

    // Ghi lịch sử chỉnh sửa (trạng thái giữ nguyên, note liệt kê field)
    ticket.statusHistory.push({
      status: ticket.status,
      by: req.user._id,
      at: new Date(),
      note: `Sửa: ${changed.join(", ") || "—"}${req.body.reason ? ` — ${req.body.reason}` : ""}`,
    });
    await ticket.save();

    const updated = await Maintenance.findById(ticket._id)
      .populate("court", "name pricePerHour status")
      .populate("createdBy", "name email")
      .populate("statusHistory.by", "name")
      .populate("conflictResolution.affectedBookings")
      .populate("conflictResolution.relocatedTo", "name");

    res.json({ success: true, message: "Cập nhật phiếu thành công", maintenance: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Xóa mềm phiếu bảo trì (N1.6)
// @route   DELETE /api/maintenance/:id
// Chỉ pending (chưa có nhật ký/nghiệm thu) hoặc cancelled; completed không xóa; đang làm phải Hủy
const deleteMaintenance = async (req, res) => {
  try {
    const ticket = await Maintenance.findById(req.params.id);
    if (!ticket || ticket.isDeleted) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy phiếu bảo trì" });
    }

    if (ticket.status === "completed") {
      return res
        .status(400)
        .json({ success: false, message: "Phiếu đã hoàn thành không được xóa" });
    }
    if (ticket.status !== "pending" && ticket.status !== "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Chỉ xóa được phiếu Chờ xử lý / Đã hủy — phiếu đang thực hiện phải Hủy kèm lý do",
      });
    }
    if (ticket.status === "pending") {
      const [hasLog, hasAcceptance] = await Promise.all([
        MaintenanceLog.exists({ ticket: ticket._id }),
        Inspection.exists({ ticket: ticket._id, type: "acceptance" }),
      ]);
      if (hasLog || hasAcceptance) {
        return res.status(400).json({
          success: false,
          message: "Phiếu đã có nhật ký/kiểm tra nghiệm thu — chỉ được Hủy, không xóa",
        });
      }
    }

    ticket.isDeleted = true;
    ticket.deletedAt = new Date();
    await ticket.save();

    res.json({ success: true, message: "Đã xóa (ẩn) phiếu bảo trì" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Kiểm tra xung đột trước khi tạo phiếu (preview)
// @route   POST /api/maintenance/preview-conflicts
const previewConflicts = async (req, res) => {
  try {
    const { court: courtId, startDate, endDate, startTime, endTime } = req.body;

    const affectedBookings = await findAffectedBookings(
      courtId,
      startDate,
      endDate,
      startTime || "06:00",
      endTime || "22:00",
    );

    // Thử tìm sân thay thế cho mỗi booking bị ảnh hưởng
    const relocationOptions = [];
    for (const booking of affectedBookings) {
      const alt = await findAlternativeCourt(
        courtId,
        booking.date,
        booking.startTime,
        booking.endTime,
      );
      relocationOptions.push({
        booking,
        canRelocate: !!alt,
        alternativeCourt: alt
          ? { _id: alt._id, name: alt.name, pricePerHour: alt.pricePerHour }
          : null,
      });
    }

    res.json({
      success: true,
      totalAffected: affectedBookings.length,
      relocationOptions,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Lấy danh sách sân đang bảo trì (public)
// @route   GET /api/maintenance/active-courts
// Chỉ phiếu ĐÓNG sân (requiresClosure) — việc nhỏ không hiện gì cho khách.
// Kèm suspendedCourts: sân tạm ngưng vì báo cáo critical chờ xử lý (chặn mọi slot)
const getActiveMaintenanceCourts = async (req, res) => {
  try {
    const [activeMaintenances, suspendedCourts] = await Promise.all([
      Maintenance.find({
        status: { $in: ACTIVE_STATUSES },
        requiresClosure: true,
        isDeleted: { $ne: true },
      })
        .select("court startDate endDate startTime endTime maintenanceType")
        .populate("court", "name"),
      getSuspendedCourtIds(),
    ]);

    res.json({ success: true, activeMaintenances, suspendedCourts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMaintenances,
  getMaintenanceById,
  createMaintenance,
  updateMaintenanceStatus,
  updateMaintenance,
  deleteMaintenance,
  previewConflicts,
  getActiveMaintenanceCourts,
};
