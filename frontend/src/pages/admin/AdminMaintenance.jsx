import { useEffect, useState, Fragment } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../services/api";
import toast from "react-hot-toast";
import {
  Wrench,
  Plus,
  X,
  CheckCircle,
  Play,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  FileText,
  RefreshCw,
  Search,
  Activity,
  Pause,
} from "lucide-react";
import {
  STATUS_MAP,
  TYPE_MAP,
  PRIORITY_MAP,
  PRIORITY_WEIGHT,
  CATEGORY_MAP,
  CONFLICT_STRATEGY_MAP,
  isOverdue,
  displayPriority,
} from "./maintenanceMaps";

const TIME_SLOTS = [];
for (let h = 6; h <= 22; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`);
  if (h < 22) TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`);
}

export default function AdminMaintenance() {
  // ========== STATE ==========
  const [maintenances, setMaintenances] = useState([]);
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [expandedRows, setExpandedRows] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [conflictPreview, setConflictPreview] = useState(null);

  // ========== FORM STATE ==========
  const [form, setForm] = useState({
    court: "",
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    startTime: "06:00",
    endTime: "22:00",
    maintenanceType: "scheduled",
    conflictStrategy: "auto_relocate",
    assignedTo: "",
    category: "other",
    priority: "medium",
    requiresClosure: true,
    executorType: "in_house",
    contractorPhone: "",
    inspection: "",
  });

  const FORM_DEFAULTS = {
    court: "",
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    startTime: "06:00",
    endTime: "22:00",
    maintenanceType: "scheduled",
    conflictStrategy: "auto_relocate",
    assignedTo: "",
    category: "other",
    priority: "medium",
    requiresClosure: true,
    executorType: "in_house",
    contractorPhone: "",
    inspection: "",
  };

  // ========== FETCH ==========
  const fetchData = async () => {
    setLoading(true);
    try {
      const [mRes, cRes] = await Promise.all([
        api.get("/maintenance"),
        api.get("/courts"),
      ]);
      setMaintenances(mRes.data.maintenances);
      setCourts(cRes.data.courts);
    } catch (err) {
      toast.error("Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ===== N2.4 nối N1.2: mở form tạo phiếu điền sẵn từ báo cáo kiểm tra (?inspection=) =====
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const inspectionId = searchParams.get("inspection");
    if (!inspectionId) return;
    api
      .get(`/inspections/${inspectionId}`)
      .then((res) => {
        const insp = res.data.inspection;
        const badItems = (insp.items || []).filter((i) => i.result !== "ok");
        const firstBad = badItems[0];
        const category = firstBad?.category || "other";
        const descParts = [
          insp.note && `Mô tả: ${insp.note}`,
          ...badItems.map((i) => `[${i.result === "fail" ? "HỎNG" : "Lưu ý"}] ${i.item}${i.note ? ` — ${i.note}` : ""}`),
        ].filter(Boolean);
        setForm((prev) => ({
          ...prev,
          inspection: insp._id,
          court: insp.court?._id || "",
          title: `Bảo trì: ${CATEGORY_MAP[category]} — sân ${insp.court?.name || ""}`,
          description: descParts.join("\n"),
          category,
          // nghiêm trọng ⇒ urgent + đóng sân; cần sửa ⇒ đóng sân; nhẹ ⇒ việc nhỏ
          priority:
            insp.severity === "critical"
              ? "urgent"
              : insp.severity === "needs_repair"
                ? "high"
                : "low",
          requiresClosure: insp.severity !== "minor",
          maintenanceType: insp.severity === "critical" ? "emergency" : "scheduled",
        }));
        setShowCreate(true);
        setSearchParams({}, { replace: true });
      })
      .catch(() => toast.error("Không tải được báo cáo kiểm tra"));
  }, [searchParams]);

  // ========== HELPERS ==========
  const toggleRow = (id) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const resetForm = () => {
    setForm({ ...FORM_DEFAULTS });
    setConflictPreview(null);
  };

  // ========== PREVIEW CONFLICTS ==========
  const handlePreviewConflicts = async () => {
    if (!form.court || !form.startDate || !form.endDate) {
      toast.error("Vui lòng chọn sân, ngày bắt đầu và kết thúc");
      return;
    }
    setPreviewLoading(true);
    try {
      const res = await api.post("/maintenance/preview-conflicts", {
        court: form.court,
        startDate: form.startDate,
        endDate: form.endDate,
        startTime: form.startTime,
        endTime: form.endTime,
      });
      setConflictPreview(res.data);
      if (res.data.totalAffected === 0) {
        toast.success("Không có booking nào bị ảnh hưởng!");
      } else {
        toast(`Có ${res.data.totalAffected} booking bị ảnh hưởng`, {
          icon: "⚠️",
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi kiểm tra");
    } finally {
      setPreviewLoading(false);
    }
  };

  // ========== CREATE ==========
  const handleCreate = async () => {
    if (!form.court || !form.title || !form.startDate || !form.endDate) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }
    if (form.startDate > form.endDate) {
      toast.error("Ngày bắt đầu phải trước ngày kết thúc");
      return;
    }
    // Map người thực hiện nhà thầu vào sub-document contractor (backend giữ assignedTo làm tên)
    const payload = { ...form };
    if (form.executorType === "contractor") {
      payload.contractor = { name: form.assignedTo, phone: form.contractorPhone };
    }
    try {
      const res = await api.post("/maintenance", payload);
      toast.success(res.data.message || "Tạo phiếu bảo trì thành công!");
      setShowCreate(false);
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi tạo phiếu");
    }
  };

  // ========== UPDATE STATUS ==========
  const handleStatusUpdate = async (id, newStatus, extra = {}) => {
    try {
      const res = await api.put(`/maintenance/${id}/status`, {
        status: newStatus,
        ...extra,
      });
      toast.success(res.data.message);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi cập nhật");
    }
  };

  // ========== DELETE ==========
  const handleDelete = async (id) => {
    if (!confirm("Bạn có chắc muốn xóa phiếu bảo trì này?")) return;
    try {
      await api.delete(`/maintenance/${id}`);
      toast.success("Đã xóa phiếu bảo trì");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi xóa");
    }
  };

  // ========== Hủy / Tạm dừng / Trả về: bắt buộc lý do ==========
  const handleReasonAction = async (m, to, actionLabel) => {
    const reason = prompt(`${actionLabel} — lý do (bắt buộc):`);
    if (!reason || !reason.trim()) return;
    await handleStatusUpdate(m._id, to, { completionNote: reason.trim() });
  };

  // ========== FILTER + TÌM KIẾM + SẮP XẾP (N1.3) ==========
  const filtered = maintenances
    .filter((m) => filter === "all" || m.status === filter)
    .filter((m) => {
      const s = q.trim().toLowerCase();
      if (!s) return true;
      return (
        (m.ticketCode || "").toLowerCase().includes(s) ||
        (m.title || "").toLowerCase().includes(s) ||
        (m.court?.name || "").toLowerCase().includes(s)
      );
    })
    .sort(
      (a, b) =>
        (isOverdue(b) ? 1 : 0) - (isOverdue(a) ? 1 : 0) ||
        PRIORITY_WEIGHT[displayPriority(b)] - PRIORITY_WEIGHT[displayPriority(a)] ||
        new Date(b.createdAt) - new Date(a.createdAt),
    );

  // ========== COMPLETE MODAL STATE ==========
  const [completeModal, setCompleteModal] = useState({ open: false, id: null });
  const [completeForm, setCompleteForm] = useState({
    completionNote: "",
    cost: 0,
    costNote: "",
  });

  const openCompleteModal = (id) => {
    setCompleteModal({ open: true, id });
    setCompleteForm({ completionNote: "", cost: 0, costNote: "" });
  };

  // ========== RENDER ==========
  return (
    <div className="admin-page-content">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Quản lý bảo trì sân</h1>
          <p className="admin-page-subtitle">
            Lên lịch và theo dõi tình trạng bảo trì các sân cầu lông
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link
            to="/admin/maintenance/calendar"
            className="admin-action-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 800,
              borderRadius: 999,
              background: "#fff4dc",
              color: "#a85d00",
              border: "1px solid #fcd34d",
              textDecoration: "none",
            }}
          >
            <Calendar size={16} /> Lịch bảo trì
          </Link>
          <button
            onClick={() => {
              resetForm();
              setShowCreate(true);
            }}
          className="admin-action-btn admin-action-btn--confirm"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 800,
            borderRadius: 999,
            background: "linear-gradient(135deg, #0D9D57, #1aaf64)",
            color: "white",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(13,157,87,0.3)",
          }}
        >
          <Plus size={16} /> Tạo phiếu bảo trì
        </button>
        </div>
      </div>

      {/* Tìm kiếm + Filter Tabs */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ position: "relative", maxWidth: 360 }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#94a3b8",
            }}
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo mã phiếu (BT-...), tiêu đề, tên sân..."
            style={{
              width: "100%",
              padding: "9px 12px 9px 32px",
              borderRadius: 999,
              border: "1px solid #e2e8f0",
              fontSize: 13,
              fontWeight: 600,
            }}
          />
        </div>
      </div>

      <div className="admin-filter-tabs">
        {[
          { key: "all", label: "Tất cả" },
          { key: "pending", label: "Chờ xử lý" },
          { key: "in_progress", label: "Đang bảo trì" },
          { key: "on_hold", label: "Tạm dừng" },
          { key: "pending_acceptance", label: "Chờ nghiệm thu" },
          { key: "completed", label: "Hoàn thành" },
          { key: "cancelled", label: "Đã hủy" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`admin-filter-tab ${filter === tab.key ? "admin-filter-tab--active" : ""}`}
          >
            {tab.label}
            <span className="admin-filter-tab-count">
              {tab.key === "all"
                ? maintenances.length
                : maintenances.filter((m) => m.status === tab.key).length}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="admin-loading">
          <div className="admin-loading-spinner"></div>
          <span>Đang tải dữ liệu...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty">
          <span className="admin-empty-icon">
            <Wrench size={40} />
          </span>
          <p>Chưa có phiếu bảo trì nào</p>
          <button
            onClick={() => {
              resetForm();
              setShowCreate(true);
            }}
            className="btn btn-primary"
            style={{ marginTop: 16, borderRadius: 999 }}
          >
            <Plus size={16} /> Tạo phiếu đầu tiên
          </button>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã phiếu</th>
                <th>Sân</th>
                <th>Tiêu đề</th>
                <th>Thời gian</th>
                <th>Loại</th>
                <th>Ưu tiên</th>
                <th>Trạng thái</th>
                <th>Chi phí</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const s = STATUS_MAP[m.status];
                const t = TYPE_MAP[m.maintenanceType] || TYPE_MAP.scheduled;
                const isExpanded = expandedRows[m._id];
                return (
                  <Fragment key={m._id}>
                    <tr>
                      <td>
                        <Link
                          to={`/admin/maintenance/${m._id}`}
                          style={{
                            fontWeight: 800,
                            fontSize: 12,
                            color: "#1f6fd1",
                            textDecoration: "none",
                          }}
                        >
                          {m.ticketCode || "—"}
                        </Link>
                        {isOverdue(m) && (
                          <div style={{ marginTop: 4 }}>
                            <span className="badge badge-overdue">Quá hạn</span>
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="admin-user-cell">
                          <div
                            className="admin-user-name"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <Activity size={14} style={{ color: "#FF8F00" }} />
                            {m.court?.name}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="admin-user-cell">
                          <div className="admin-user-name">{m.title}</div>
                          {m.description && (
                            <div
                              className="admin-text-muted"
                              style={{
                                fontSize: 11,
                                maxWidth: 180,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {m.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td
                        className="admin-text-secondary"
                        style={{ fontSize: 12 }}
                      >
                        <div>
                          {m.startDate} → {m.endDate}
                        </div>
                        <div style={{ color: "#9ba6bb" }}>
                          {m.startTime} - {m.endTime}
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color:
                              m.maintenanceType === "emergency"
                                ? "#ef4444"
                                : "#64748b",
                          }}
                        >
                          {t.text}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: PRIORITY_MAP[displayPriority(m)]?.color,
                          }}
                        >
                          {PRIORITY_MAP[displayPriority(m)]?.text || "—"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={s?.cls}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {s?.icon} {s?.text}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 800, color: "#1e293b" }}>
                          {(m.costTotal || m.cost) > 0
                            ? `${(m.costTotal || m.cost).toLocaleString("vi-VN")}đ`
                            : "—"}
                        </span>
                      </td>
                      <td>
                        <div
                          className="admin-action-group"
                          style={{ flexWrap: "wrap" }}
                        >
                          {/* Expand details */}
                          <button
                            onClick={() => toggleRow(m._id)}
                            className="admin-action-btn"
                            style={{
                              background: "#f1f5f9",
                              border: "none",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                              padding: "5px 10px",
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700,
                              color: "#475569",
                            }}
                          >
                            {isExpanded ? (
                              <ChevronUp size={12} />
                            ) : (
                              <ChevronDown size={12} />
                            )}
                            {isExpanded ? "Ẩn" : "Chi tiết"}
                          </button>

                          {/* Status actions — theo state machine v2 */}
                          {m.status === "pending" && (
                            <>
                              <button
                                onClick={() =>
                                  handleStatusUpdate(m._id, "in_progress")
                                }
                                className="admin-action-btn"
                                style={{
                                  background: "#FF8F00",
                                  color: "white",
                                  border: "none",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 3,
                                  padding: "5px 10px",
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 700,
                                }}
                              >
                                <Play size={12} /> Bắt đầu
                              </button>
                              <button
                                onClick={() =>
                                  handleReasonAction(m, "cancelled", "Hủy phiếu")
                                }
                                className="admin-action-btn admin-action-btn--danger"
                              >
                                <X size={12} /> Hủy
                              </button>
                              <button
                                onClick={() => handleDelete(m._id)}
                                className="admin-action-btn"
                                style={{ fontSize: 11 }}
                              >
                                Xóa
                              </button>
                            </>
                          )}
                          {m.status === "in_progress" && (
                            <>
                              <button
                                onClick={() => openCompleteModal(m._id)}
                                className="admin-action-btn admin-action-btn--confirm"
                              >
                                <CheckCircle size={12} /> Hoàn thành
                              </button>
                              <button
                                onClick={() =>
                                  handleReasonAction(m, "on_hold", "Tạm dừng")
                                }
                                className="admin-action-btn"
                                style={{
                                  background: "#eef2ff",
                                  color: "#4338ca",
                                  border: "none",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 3,
                                  padding: "5px 10px",
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 700,
                                }}
                              >
                                <Pause size={12} /> Tạm dừng
                              </button>
                              <button
                                onClick={() =>
                                  handleReasonAction(m, "cancelled", "Hủy phiếu")
                                }
                                className="admin-action-btn admin-action-btn--danger"
                              >
                                <X size={12} /> Hủy
                              </button>
                            </>
                          )}
                          {m.status === "on_hold" && (
                            <>
                              <button
                                onClick={() =>
                                  handleStatusUpdate(m._id, "in_progress")
                                }
                                className="admin-action-btn"
                                style={{
                                  background: "#FF8F00",
                                  color: "white",
                                  border: "none",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 3,
                                  padding: "5px 10px",
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 700,
                                }}
                              >
                                <Play size={12} /> Tiếp tục
                              </button>
                              <button
                                onClick={() =>
                                  handleReasonAction(m, "cancelled", "Hủy phiếu")
                                }
                                className="admin-action-btn admin-action-btn--danger"
                              >
                                <X size={12} /> Hủy
                              </button>
                            </>
                          )}
                          {m.status === "pending_acceptance" && (
                            <>
                              <button
                                onClick={() => openCompleteModal(m._id)}
                                className="admin-action-btn admin-action-btn--confirm"
                              >
                                <CheckCircle size={12} /> Duyệt hoàn thành
                              </button>
                              <button
                                onClick={() =>
                                  handleReasonAction(
                                    m,
                                    "in_progress",
                                    "Trả về làm lại",
                                  )
                                }
                                className="admin-action-btn"
                                style={{
                                  background: "#fdecec",
                                  color: "#b42323",
                                  border: "none",
                                  cursor: "pointer",
                                  padding: "5px 10px",
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 700,
                                }}
                              >
                                Trả về làm lại
                              </button>
                            </>
                          )}
                          {m.status === "cancelled" && (
                            <button
                              onClick={() => handleDelete(m._id)}
                              className="admin-action-btn"
                              style={{ fontSize: 11 }}
                            >
                              Xóa
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded detail row */}
                    {isExpanded && (
                      <tr
                        className="admin-expanded-row"
                        style={{ backgroundColor: "#f8fafc" }}
                      >
                        <td
                          colSpan="9"
                          style={{
                            padding: "16px 24px",
                            borderBottom: "1px solid #e2e8f0",
                          }}
                        >
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(220px, 1fr))",
                              gap: 12,
                            }}
                          >
                            {/* Info */}
                            <div
                              style={{
                                background: "white",
                                borderRadius: 10,
                                padding: 12,
                                border: "1px solid #e8ecf1",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 800,
                                  color: "#64748b",
                                  textTransform: "uppercase",
                                  marginBottom: 8,
                                }}
                              >
                                <FileText
                                  size={12}
                                  style={{ display: "inline", marginRight: 4 }}
                                />{" "}
                                Thông tin
                              </div>
                              <div style={{ fontSize: 12, lineHeight: 1.8 }}>
                                <div>
                                  <strong>Người tạo:</strong>{" "}
                                  {m.createdBy?.name || "—"}
                                </div>
                                <div>
                                  <strong>Người phụ trách:</strong>{" "}
                                  {m.assignedTo || "—"}
                                  {m.executorType === "contractor"
                                    ? " (Nhà thầu)"
                                    : ""}
                                </div>
                                <div>
                                  <strong>Hạng mục:</strong>{" "}
                                  {CATEGORY_MAP[m.category] || "—"}
                                </div>
                                <div>
                                  <strong>Chặn lịch đặt:</strong>{" "}
                                  {m.requiresClosure === false
                                    ? "Không (việc nhỏ)"
                                    : "Có"}
                                </div>
                                {m.completedAt && (
                                  <div>
                                    <strong>Thời gian đóng sân:</strong>{" "}
                                    {m.downtimeMinutes != null
                                      ? `${Math.round(m.downtimeMinutes / 60 * 10) / 10} giờ`
                                      : "—"}
                                  </div>
                                )}
                                {m.completionNote && (
                                  <div>
                                    <strong>Ghi chú HT:</strong>{" "}
                                    {m.completionNote}
                                  </div>
                                )}
                                {m.costNote && (
                                  <div>
                                    <strong>Ghi chú CP:</strong> {m.costNote}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Conflict Resolution */}
                            {m.conflictResolution &&
                              m.conflictResolution.affectedBookings?.length >
                                0 && (
                                <div
                                  style={{
                                    background: "#fffbeb",
                                    borderRadius: 10,
                                    padding: 12,
                                    border: "1px solid #fde68a",
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 800,
                                      color: "#b45309",
                                      textTransform: "uppercase",
                                      marginBottom: 8,
                                    }}
                                  >
                                    <AlertTriangle
                                      size={12}
                                      style={{
                                        display: "inline",
                                        marginRight: 4,
                                      }}
                                    />{" "}
                                    Xử lý xung đột
                                  </div>
                                  <div
                                    style={{ fontSize: 12, lineHeight: 1.8 }}
                                  >
                                    <div>
                                      <strong>Chiến lược:</strong>{" "}
                                      {
                                        CONFLICT_STRATEGY_MAP[
                                          m.conflictResolution.strategy
                                        ]
                                      }
                                    </div>
                                    <div>
                                      <strong>Booking bị ảnh hưởng:</strong>{" "}
                                      {
                                        m.conflictResolution.affectedBookings
                                          .length
                                      }
                                    </div>
                                    {m.conflictResolution.relocatedTo && (
                                      <div>
                                        <strong>Chuyển đến sân:</strong>{" "}
                                        {m.conflictResolution.relocatedTo.name}
                                      </div>
                                    )}
                                    <div
                                      style={{
                                        color: "#92400e",
                                        marginTop: 4,
                                        fontStyle: "italic",
                                      }}
                                    >
                                      {m.conflictResolution.resolutionNote}
                                    </div>
                                  </div>
                                </div>
                              )}

                            {/* Timeline */}
                            <div
                              style={{
                                background: "white",
                                borderRadius: 10,
                                padding: 12,
                                border: "1px solid #e8ecf1",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 800,
                                  color: "#64748b",
                                  textTransform: "uppercase",
                                  marginBottom: 8,
                                }}
                              >
                                <Calendar
                                  size={12}
                                  style={{ display: "inline", marginRight: 4 }}
                                />{" "}
                                Timeline
                              </div>
                              <div style={{ fontSize: 12, lineHeight: 1.8 }}>
                                <div>
                                  <strong>Tạo lúc:</strong>{" "}
                                  {new Date(m.createdAt).toLocaleString(
                                    "vi-VN",
                                  )}
                                </div>
                                {m.completedAt && (
                                  <div>
                                    <strong>Hoàn thành:</strong>{" "}
                                    {new Date(m.completedAt).toLocaleString(
                                      "vi-VN",
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ============ CREATE MODAL ============ */}
      {showCreate && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCreate(false);
              resetForm();
            }
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 16,
              padding: "24px",
              width: "100%",
              maxWidth: 600,
              maxHeight: "90vh",
              overflow: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <h2
                style={{
                  fontWeight: 800,
                  fontSize: 18,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Wrench size={20} style={{ color: "#FF8F00" }} /> Tạo phiếu bảo
                trì
              </h2>
              <button
                onClick={() => {
                  setShowCreate(false);
                  resetForm();
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#9ba6bb",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Form fields */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Court select */}
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#475569",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Sân cần bảo trì *
                </label>
                <select
                  value={form.court}
                  onChange={(e) => setForm({ ...form, court: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    fontSize: 13,
                    fontWeight: 600,
                    background: "white",
                  }}
                >
                  <option value="">-- Chọn sân --</option>
                  {courts.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} (
                      {c.status === "maintenance" ? "Đang bảo trì" : "Sẵn sàng"}
                      )
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#475569",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Tiêu đề *
                </label>
                <input
                  type="text"
                  placeholder="VD: Thay lưới sân, sửa đèn..."
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                />
              </div>

              {/* Description */}
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#475569",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Mô tả chi tiết
                </label>
                <textarea
                  placeholder="Mô tả vấn đề cần bảo trì..."
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={2}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    fontSize: 13,
                    resize: "vertical",
                  }}
                />
              </div>

              {/* Date range */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#475569",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Ngày bắt đầu *
                  </label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) =>
                      setForm({ ...form, startDate: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#475569",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Ngày kết thúc *
                  </label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) =>
                      setForm({ ...form, endDate: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  />
                </div>
              </div>

              {/* Time range */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#475569",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Giờ bắt đầu
                  </label>
                  <select
                    value={form.startTime}
                    onChange={(e) =>
                      setForm({ ...form, startTime: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                      fontSize: 13,
                      fontWeight: 600,
                      background: "white",
                    }}
                  >
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#475569",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Giờ kết thúc
                  </label>
                  <select
                    value={form.endTime}
                    onChange={(e) =>
                      setForm({ ...form, endTime: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                      fontSize: 13,
                      fontWeight: 600,
                      background: "white",
                    }}
                  >
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Category + Priority (v2) */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#475569",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Hạng mục
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                      fontSize: 13,
                      fontWeight: 600,
                      background: "white",
                    }}
                  >
                    {Object.entries(CATEGORY_MAP).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#475569",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Mức ưu tiên
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) =>
                      setForm({ ...form, priority: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                      fontSize: 13,
                      fontWeight: 600,
                      background: "white",
                    }}
                  >
                    {Object.entries(PRIORITY_MAP).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.text}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Closure mode (v2): đóng sân / việc nhỏ */}
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#475569",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Ảnh hưởng đến lịch đặt
                </label>
                <div style={{ display: "flex", gap: 10 }}>
                  <label
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: `1px solid ${form.requiresClosure ? "#FF8F00" : "#e2e8f0"}`,
                      background: form.requiresClosure ? "#fff4dc" : "white",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="closure"
                      checked={form.requiresClosure}
                      onChange={() =>
                        setForm({ ...form, requiresClosure: true })
                      }
                    />
                    Đóng sân (chặn khách đặt trong khung giờ)
                  </label>
                  <label
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: `1px solid ${!form.requiresClosure ? "#0D9D57" : "#e2e8f0"}`,
                      background: !form.requiresClosure
                        ? "#e9f9f0"
                        : "white",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="closure"
                      checked={!form.requiresClosure}
                      onChange={() =>
                        setForm({ ...form, requiresClosure: false })
                      }
                    />
                    Việc nhỏ (KHÔNG chặn lịch)
                  </label>
                </div>
              </div>

              {/* Type + Strategy */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#475569",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Loại bảo trì
                  </label>
                  <select
                    value={form.maintenanceType}
                    onChange={(e) =>
                      setForm({ ...form, maintenanceType: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                      fontSize: 13,
                      fontWeight: 600,
                      background: "white",
                    }}
                  >
                    <option value="scheduled">Có kế hoạch</option>
                    <option value="emergency">Khẩn cấp</option>
                    <option value="periodic">Định kỳ</option>
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#475569",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Xử lý xung đột
                  </label>
                  <select
                    value={form.conflictStrategy}
                    onChange={(e) =>
                      setForm({ ...form, conflictStrategy: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                      fontSize: 13,
                      fontWeight: 600,
                      background: "white",
                    }}
                  >
                    <option value="auto_relocate">Tự động chuyển sân</option>
                    <option value="cancel_booking">Hủy booking</option>
                    <option value="force_override">
                      Ép bảo trì (khẩn cấp)
                    </option>
                  </select>
                </div>
              </div>

              {/* Assigned to + executor type (v2) */}
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#475569",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Người phụ trách
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
                  <input
                    type="text"
                    placeholder="Tên nhân viên / đội thi công..."
                    value={form.assignedTo}
                    onChange={(e) =>
                      setForm({ ...form, assignedTo: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  />
                  <select
                    value={form.executorType}
                    onChange={(e) =>
                      setForm({ ...form, executorType: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                      fontSize: 13,
                      fontWeight: 600,
                      background: "white",
                    }}
                  >
                    <option value="in_house">Nhân viên sân</option>
                    <option value="contractor">Nhà thầu</option>
                  </select>
                </div>
                {form.executorType === "contractor" && (
                  <input
                    type="text"
                    placeholder="SĐT nhà thầu (khi cần)"
                    value={form.contractorPhone}
                    onChange={(e) =>
                      setForm({ ...form, contractorPhone: e.target.value })
                    }
                    style={{
                      width: "100%",
                      marginTop: 8,
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  />
                )}
              </div>

              {/* Conflict Preview — chỉ hiện khi phiếu đóng sân */}
              {form.requiresClosure && (
              <div>
                <button
                  onClick={handlePreviewConflicts}
                  disabled={previewLoading}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 16px",
                    borderRadius: 8,
                    background: "#fef3c7",
                    border: "1px solid #fcd34d",
                    color: "#92400e",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {previewLoading ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Search size={14} />
                  )}
                  Kiểm tra xung đột lịch đặt
                </button>
                {conflictPreview && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: 10,
                      borderRadius: 8,
                      background:
                        conflictPreview.totalAffected > 0
                          ? "#fef2f2"
                          : "#f0fdf4",
                      border: `1px solid ${conflictPreview.totalAffected > 0 ? "#fecaca" : "#bbf7d0"}`,
                      fontSize: 12,
                    }}
                  >
                    {conflictPreview.totalAffected === 0 ? (
                      <span style={{ color: "#166534", fontWeight: 700 }}>
                        ✅ Không có booking nào bị ảnh hưởng
                      </span>
                    ) : (
                      <div>
                        <div
                          style={{
                            color: "#991b1b",
                            fontWeight: 700,
                            marginBottom: 6,
                          }}
                        >
                          ⚠️ Có {conflictPreview.totalAffected} booking bị ảnh
                          hưởng:
                        </div>
                        {conflictPreview.relocationOptions
                          ?.slice(0, 5)
                          .map((opt, i) => (
                            <div
                              key={i}
                              style={{
                                fontSize: 11,
                                marginBottom: 3,
                                color: "#7f1d1d",
                              }}
                            >
                              • {opt.booking.date} {opt.booking.startTime}-
                              {opt.booking.endTime}({opt.booking.user?.name}) —
                              {opt.canRelocate ? (
                                <span style={{ color: "#166534" }}>
                                  {" "}
                                  Có thể chuyển → {opt.alternativeCourt?.name}
                                </span>
                              ) : (
                                <span style={{ color: "#991b1b" }}>
                                  {" "}
                                  Không có sân thay thế
                                </span>
                              )}
                            </div>
                          ))}
                        {conflictPreview.relocationOptions?.length > 5 && (
                          <div style={{ fontSize: 11, color: "#9ba6bb" }}>
                            ...và {conflictPreview.relocationOptions.length - 5}{" "}
                            booking khác
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
              )}

              {/* Action buttons */}
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  justifyContent: "flex-end",
                  marginTop: 8,
                }}
              >
                <button
                  onClick={() => {
                    setShowCreate(false);
                    resetForm();
                  }}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 999,
                    background: "#f1f5f9",
                    border: "1px solid #e2e8f0",
                    color: "#475569",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Hủy
                </button>
                <button
                  onClick={handleCreate}
                  style={{
                    padding: "10px 24px",
                    borderRadius: 999,
                    background: "linear-gradient(135deg, #FF8F00, #f57c00)",
                    border: "none",
                    color: "white",
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(255,143,0,0.3)",
                  }}
                >
                  <Wrench
                    size={14}
                    style={{ display: "inline", marginRight: 4 }}
                  />
                  Tạo phiếu bảo trì
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ COMPLETE MODAL ============ */}
      {completeModal.open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget)
              setCompleteModal({ open: false, id: null });
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 16,
              padding: "24px",
              width: "100%",
              maxWidth: 420,
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <h2
              style={{
                fontWeight: 800,
                fontSize: 18,
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <CheckCircle size={20} style={{ color: "#0D9D57" }} /> Hoàn thành
              bảo trì
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#475569",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Chi phí bảo trì (VNĐ)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={completeForm.cost}
                  onChange={(e) =>
                    setCompleteForm({
                      ...completeForm,
                      cost: Number(e.target.value),
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#475569",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Ghi chú chi phí
                </label>
                <input
                  type="text"
                  placeholder="VD: Tiền vật tư, nhân công..."
                  value={completeForm.costNote}
                  onChange={(e) =>
                    setCompleteForm({
                      ...completeForm,
                      costNote: e.target.value,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#475569",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Ghi chú hoàn thành
                </label>
                <textarea
                  rows={2}
                  placeholder="Mô tả kết quả bảo trì..."
                  value={completeForm.completionNote}
                  onChange={(e) =>
                    setCompleteForm({
                      ...completeForm,
                      completionNote: e.target.value,
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    fontSize: 13,
                    resize: "vertical",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  justifyContent: "flex-end",
                  marginTop: 8,
                }}
              >
                <button
                  onClick={() => setCompleteModal({ open: false, id: null })}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 999,
                    background: "#f1f5f9",
                    border: "1px solid #e2e8f0",
                    color: "#475569",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    handleStatusUpdate(
                      completeModal.id,
                      "completed",
                      completeForm,
                    );
                    setCompleteModal({ open: false, id: null });
                  }}
                  style={{
                    padding: "10px 24px",
                    borderRadius: 999,
                    background: "linear-gradient(135deg, #0D9D57, #1aaf64)",
                    border: "none",
                    color: "white",
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Xác nhận hoàn thành
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
