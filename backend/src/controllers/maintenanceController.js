const Maintenance = require("../models/Maintenance");
const Booking = require("../models/Booking");
const Court = require("../models/Court");
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
    const filter = {};
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
      .populate("conflictResolution.affectedBookings")
      .populate("conflictResolution.relocatedTo", "name");

    if (!maintenance) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy phiếu bảo trì" });
    }
    res.json({ success: true, maintenance });
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

    if (affectedBookings.length > 0) {
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
const updateMaintenanceStatus = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { status, completionNote, cost, costNote } = req.body;
    const maintenance = await Maintenance.findById(req.params.id).session(
      session,
    );

    if (!maintenance) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy phiếu bảo trì" });
    }

    // Validate state transitions
    const validTransitions = {
      pending: ["in_progress", "cancelled"],
      in_progress: ["completed", "cancelled"],
      completed: [],
      cancelled: [],
    };

    if (!validTransitions[maintenance.status].includes(status)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Không thể chuyển từ "${maintenance.status}" sang "${status}"`,
      });
    }

    // Cập nhật phiếu
    const updateData = { status };
    if (status === "in_progress") {
      // Khi bắt đầu bảo trì → set sân về trạng thái maintenance
      await Court.findByIdAndUpdate(
        maintenance.court,
        { status: "maintenance" },
        { session },
      );
    }
    if (status === "completed") {
      updateData.completionNote = completionNote || "";
      updateData.completedAt = new Date();
      if (cost !== undefined) updateData.cost = cost;
      if (costNote) updateData.costNote = costNote;

      // Trả sân về trạng thái active
      await Court.findByIdAndUpdate(
        maintenance.court,
        { status: "active" },
        { session },
      );
    }
    if (status === "cancelled") {
      // Trả sân về active nếu hủy phiếu
      await Court.findByIdAndUpdate(
        maintenance.court,
        { status: "active" },
        { session },
      );
    }

    const updated = await Maintenance.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, session },
    )
      .populate("court", "name pricePerHour status")
      .populate("createdBy", "name email")
      .populate("conflictResolution.affectedBookings")
      .populate("conflictResolution.relocatedTo", "name");

    await session.commitTransaction();

    res.json({
      success: true,
      message: `Phiếu bảo trì đã chuyển sang "${status}"`,
      maintenance: updated,
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

// @desc    Cập nhật phiếu bảo trì
// @route   PUT /api/maintenance/:id
const updateMaintenance = async (req, res) => {
  try {
    const maintenance = await Maintenance.findById(req.params.id);
    if (!maintenance) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy phiếu bảo trì" });
    }

    if (maintenance.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Chỉ có thể sửa phiếu ở trạng thái chờ xử lý",
      });
    }

    const allowedFields = [
      "title",
      "description",
      "startDate",
      "endDate",
      "startTime",
      "endTime",
      "assignedTo",
      "cost",
      "costNote",
    ];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const updated = await Maintenance.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true },
    )
      .populate("court", "name pricePerHour status")
      .populate("createdBy", "name email");

    res.json({
      success: true,
      message: "Cập nhật phiếu thành công",
      maintenance: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Xóa phiếu bảo trì
// @route   DELETE /api/maintenance/:id
const deleteMaintenance = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const maintenance = await Maintenance.findById(req.params.id).session(
      session,
    );
    if (!maintenance) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy phiếu bảo trì" });
    }

    // Nếu phiếu đang in_progress, trả sân về active
    if (
      maintenance.status === "in_progress" ||
      maintenance.status === "pending"
    ) {
      await Court.findByIdAndUpdate(
        maintenance.court,
        { status: "active" },
        { session },
      );
    }

    await Maintenance.findByIdAndDelete(req.params.id, { session });

    await session.commitTransaction();
    res.json({ success: true, message: "Xóa phiếu bảo trì thành công" });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
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
const getActiveMaintenanceCourts = async (req, res) => {
  try {
    const activeMaintenances = await Maintenance.find({
      status: { $in: ["pending", "in_progress"] },
    })
      .select("court startDate endDate startTime endTime maintenanceType")
      .populate("court", "name");

    res.json({ success: true, activeMaintenances });
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
