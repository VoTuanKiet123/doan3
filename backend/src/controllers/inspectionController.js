const Inspection = require("../models/Inspection");
const ChecklistTemplate = require("../models/ChecklistTemplate");
const Maintenance = require("../models/Maintenance");
const Court = require("../models/Court");

// ============ HELPERS ============

const todayVN = () => {
  const d = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }),
  );
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Trạng thái báo cáo SUY RA từ dữ liệu (không lưu field thừa — đã chốt trong spec):
// dismissed > ticketed > pending (severity != none) > ok (kiểm tra bình thường)
const deriveStatus = (insp, ticketMap) => {
  if (insp.dismissal) return "dismissed";
  if (ticketMap.has(String(insp._id))) return "ticketed";
  if (insp.severity && insp.severity !== "none") return "pending";
  return "ok";
};

// ============ CHECKLIST TEMPLATE (N2.1) ============

// @desc    Mục kiểm tra đang bật (POS hiển thị khi kiểm sân)
// @route   GET /api/inspections/checklist
const getChecklist = async (req, res) => {
  try {
    const items = await ChecklistTemplate.find({ isActive: true }).sort({
      createdAt: 1,
    });
    res.json({ success: true, items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Thêm mục kiểm tra (admin)
// @route   POST /api/inspections/checklist
const saveChecklistItem = async (req, res) => {
  try {
    const { item, category } = req.body;
    if (!item || !item.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Vui lòng nhập nội dung mục kiểm tra" });
    }
    const created = await ChecklistTemplate.create({ item, category });
    res.status(201).json({ success: true, item: created });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Sửa / tắt mục kiểm tra (admin) — không xóa cứng để giữ dữ liệu cũ
// @route   PUT /api/inspections/checklist/:id
const updateChecklistItem = async (req, res) => {
  try {
    const updates = {};
    ["item", "category", "isActive"].forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });
    const updated = await ChecklistTemplate.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true },
    );
    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy mục kiểm tra" });
    }
    res.json({ success: true, item: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ INSPECTIONS ============

// @desc    Nhân viên POS gửi báo cáo kiểm tra sân (N2.2)
// @route   POST /api/inspections
// severity = critical ⇒ sân TẠM NGƯNG ngay (derived — chặn đặt có hiệu lực tức thì, không cần ghi state)
const submitInspection = async (req, res) => {
  try {
    const {
      court: courtId,
      items = [],
      severity = "none",
      note,
      date,
    } = req.body;

    const court = await Court.findById(courtId);
    if (!court) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy sân" });
    }
    const validSeverity = ["none", "minor", "needs_repair", "critical"];
    if (!validSeverity.includes(severity)) {
      return res
        .status(400)
        .json({ success: false, message: "Mức độ không hợp lệ" });
    }

    const inspection = await Inspection.create({
      court: courtId,
      type: "routine",
      date: date || todayVN(),
      inspectedBy: req.user._id,
      items,
      severity,
      note,
    });

    res.status(201).json({
      success: true,
      message:
        severity === "critical"
          ? "Đã gửi báo cáo NGHIÊM TRỌNG — sân tạm ngưng nhận khách, chờ Admin xử lý"
          : "Đã gửi báo cáo kiểm tra sân",
      inspection,
      courtSuspended: severity === "critical",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Danh sách báo cáo kiểm tra (Admin xử lý / POS xem lịch sử theo sân)
// @route   GET /api/inspections?court=&status=&type=&date=
const getInspections = async (req, res) => {
  try {
    const { court, status, type = "routine", date } = req.query;
    const filter = { type };
    if (court) filter.court = court;
    if (date) filter.date = date;

    const inspections = await Inspection.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .populate("court", "name")
      .populate("inspectedBy", "name")
      .lean();

    // 1 query cho cả danh sách: phiếu (chưa xóa mềm) nào đang trỏ vào báo cáo
    const tickets = await Maintenance.find({
      inspection: { $in: inspections.map((i) => i._id) },
      isDeleted: { $ne: true },
    })
      .select("_id ticketCode status inspection")
      .lean();
    const ticketMap = new Map(tickets.map((t) => [String(t.inspection), t]));

    const all = inspections.map((i) => ({
      ...i,
      derivedStatus: deriveStatus(i, ticketMap),
      ticket: ticketMap.get(String(i._id)) || null,
    }));

    const counts = {
      pending: all.filter((i) => i.derivedStatus === "pending").length,
      ticketed: all.filter((i) => i.derivedStatus === "ticketed").length,
      dismissed: all.filter((i) => i.derivedStatus === "dismissed").length,
    };

    const list = status ? all.filter((i) => i.derivedStatus === status) : all;
    res.json({ success: true, count: list.length, counts, inspections: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Chi tiết 1 báo cáo (Admin prefill form tạo phiếu)
// @route   GET /api/inspections/:id
const getInspectionById = async (req, res) => {
  try {
    const inspection = await Inspection.findById(req.params.id)
      .populate("court", "name")
      .populate("inspectedBy", "name")
      .lean();
    if (!inspection) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy báo cáo" });
    }
    res.json({ success: true, inspection });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Số báo cáo CHỜ XỬ LÝ (badge menu Admin — N2.3)
// @route   GET /api/inspections/pending-count
const getPendingCount = async (req, res) => {
  try {
    const candidates = await Inspection.find({
      type: "routine",
      severity: { $ne: "none" },
      dismissal: null,
    })
      .select("_id")
      .lean();
    if (!candidates.length)
      return res.json({ success: true, count: 0 });

    const linked = await Maintenance.find({
      inspection: { $in: candidates.map((c) => c._id) },
      isDeleted: { $ne: true },
    })
      .select("inspection")
      .lean();
    const handled = new Set(linked.map((l) => String(l.inspection)));
    res.json({
      success: true,
      count: candidates.filter((c) => !handled.has(String(c._id))).length,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Admin Bỏ qua báo cáo (N2.4) — bắt buộc lý do; sân hết tạm ngưng (derived)
// @route   PUT /api/inspections/:id/dismiss
const dismissInspection = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Bỏ qua báo cáo bắt buộc nhập lý do" });
    }
    const inspection = await Inspection.findById(req.params.id);
    if (!inspection) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy báo cáo" });
    }
    if (inspection.type !== "routine") {
      return res
        .status(400)
        .json({ success: false, message: "Chỉ bỏ qua được báo cáo kiểm tra thường kỳ" });
    }
    // dismissal là nested object — mongoose hydrate {} khi chưa set, phải check subfield
    if (inspection.dismissal?.at || inspection.dismissal?.reason) {
      return res
        .status(400)
        .json({ success: false, message: "Báo cáo đã được xử lý trước đó" });
    }
    const linkedTicket = await Maintenance.exists({
      inspection: inspection._id,
      isDeleted: { $ne: true },
    });
    if (linkedTicket) {
      return res.status(400).json({
        success: false,
        message: "Báo cáo đã có phiếu bảo trì — xử lý trên phiếu, không bỏ qua được",
      });
    }

    inspection.dismissal = {
      by: req.user._id,
      at: new Date(),
      reason: reason.trim(),
    };
    await inspection.save();
    res.json({
      success: true,
      message: "Đã bỏ qua báo cáo — sân nhận đặt lại bình thường",
      inspection,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Nhân viên KIỂM TRA LẠI sau sửa — gửi nghiệm thu lên Admin (N2.10)
// @route   POST /api/inspections/acceptance { ticketId, items, result, failReason, note }
// Chỉ khi phiếu đang pending_acceptance; được kiểm nhiều lần — lần gần nhất được tính.
const submitAcceptance = async (req, res) => {
  try {
    const { ticketId, items = [], result, failReason, note } = req.body;

    const ticket = await Maintenance.findById(ticketId).lean();
    if (!ticket || ticket.isDeleted) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy phiếu bảo trì" });
    }
    if (ticket.status !== "pending_acceptance") {
      return res.status(400).json({
        success: false,
        message: "Chỉ kiểm tra lại được phiếu đang CHỜ NGHIỆM THU",
      });
    }
    if (!["pass", "fail"].includes(result)) {
      return res
        .status(400)
        .json({ success: false, message: "Kết quả phải là đạt / không đạt" });
    }
    if (result === "fail" && (!failReason || !failReason.trim())) {
      return res.status(400).json({
        success: false,
        message: "Không đạt thì bắt buộc ghi lý do",
      });
    }

    const inspection = await Inspection.create({
      court: ticket.court,
      ticket: ticketId,
      type: "acceptance",
      date: todayVN(),
      inspectedBy: req.user._id,
      items,
      result,
      failReason: result === "fail" ? failReason.trim() : undefined,
      note,
    });

    res.status(201).json({
      success: true,
      message:
        result === "pass"
          ? "Đã báo ĐẠT — chờ Admin duyệt hoàn thành để mở sân"
          : "Đã báo KHÔNG ĐẠT — Admin sẽ trả về làm lại",
      inspection,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getChecklist,
  saveChecklistItem,
  updateChecklistItem,
  submitInspection,
  submitAcceptance,
  getInspections,
  getInspectionById,
  getPendingCount,
  dismissInspection,
};
