import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../services/api";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Wrench,
  Play,
  Pause,
  X,
  CheckCircle,
  Pencil,
  Clock,
} from "lucide-react";
import {
  STATUS_MAP,
  TYPE_MAP,
  PRIORITY_MAP,
  CATEGORY_MAP,
  isOverdue,
} from "./maintenanceMaps";

// Nhãn cho phần tử statusHistory khi "Sửa phiếu" được ghi (status giữ nguyên)
const fmt = (d) => (d ? new Date(d).toLocaleString("vi-VN") : "—");
const fmtMoney = (n) =>
  n > 0 ? `${Number(n).toLocaleString("vi-VN")}đ` : "—";

const cardStyle = {
  background: "white",
  borderRadius: 12,
  padding: 16,
  border: "1px solid #e8ecf1",
};
const cardTitle = {
  fontSize: 11,
  fontWeight: 800,
  color: "#64748b",
  textTransform: "uppercase",
  marginBottom: 10,
};
const infoRow = { fontSize: 13, lineHeight: 1.9 };
const btn = (bg, fg = "white") => ({
  background: bg,
  color: fg,
  border: "none",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "8px 14px",
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 700,
});

export default function MaintenanceTicketDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null); // { maintenance, logs, inspections }
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/maintenance/${id}`);
      setData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Không tải được phiếu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const m = data?.maintenance;

  const changeStatus = async (to, note) => {
    try {
      const res = await api.put(`/maintenance/${id}/status`, {
        status: to,
        completionNote: note || "",
      });
      toast.success(res.data.message);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi đổi trạng thái");
    }
  };

  const reasonAction = (to, label) => async () => {
    const reason = prompt(`${label} — lý do (bắt buộc):`);
    if (!reason || !reason.trim()) return;
    await changeStatus(to, reason.trim());
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-loading-spinner"></div>
        <span>Đang tải phiếu...</span>
      </div>
    );
  }
  if (!m) {
    return (
      <div className="admin-empty">
        <p>Không tìm thấy phiếu bảo trì</p>
        <Link to="/admin/maintenance" className="btn btn-primary" style={{ marginTop: 12, borderRadius: 999 }}>
          Về danh sách
        </Link>
      </div>
    );
  }

  const s = STATUS_MAP[m.status];
  const t = TYPE_MAP[m.maintenanceType] || TYPE_MAP.scheduled;
  const pr = PRIORITY_MAP[m.priority] || PRIORITY_MAP.medium;

  // Nút hành động theo trạng thái (đồng bộ state machine backend)
  const actions = [];
  if (m.status === "pending") {
    actions.push(
      <button key="start" style={btn("#FF8F00")} onClick={() => changeStatus("in_progress")}>
        <Play size={13} /> Bắt đầu
      </button>,
      <button key="cancel" style={btn("#fdecec", "#b42323")} onClick={reasonAction("cancelled", "Hủy phiếu")}>
        <X size={13} /> Hủy
      </button>,
    );
  }
  if (m.status === "in_progress") {
    actions.push(
      <button key="done" style={btn("#0D9D57")} onClick={reasonAction("completed", "Hoàn thành")}>
        <CheckCircle size={13} /> Hoàn thành
      </button>,
      <button key="hold" style={btn("#eef2ff", "#4338ca")} onClick={reasonAction("on_hold", "Tạm dừng")}>
        <Pause size={13} /> Tạm dừng
      </button>,
      <button key="cancel" style={btn("#fdecec", "#b42323")} onClick={reasonAction("cancelled", "Hủy phiếu")}>
        <X size={13} /> Hủy
      </button>,
    );
  }
  if (m.status === "on_hold") {
    actions.push(
      <button key="resume" style={btn("#FF8F00")} onClick={() => changeStatus("in_progress")}>
        <Play size={13} /> Tiếp tục
      </button>,
      <button key="cancel" style={btn("#fdecec", "#b42323")} onClick={reasonAction("cancelled", "Hủy phiếu")}>
        <X size={13} /> Hủy
      </button>,
    );
  }
  if (m.status === "pending_acceptance") {
    actions.push(
      <button key="approve" style={btn("#0D9D57")} onClick={reasonAction("completed", "Duyệt hoàn thành")}>
        <CheckCircle size={13} /> Duyệt hoàn thành
      </button>,
      <button key="rework" style={btn("#fdecec", "#b42323")} onClick={reasonAction("in_progress", "Trả về làm lại")}>
        Trả về làm lại
      </button>,
    );
  }

  return (
    <div className="admin-page-content">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <Link
            to="/admin/maintenance"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 12,
              fontWeight: 700,
              color: "#64748b",
              textDecoration: "none",
              marginBottom: 6,
            }}
          >
            <ArrowLeft size={13} /> Danh sách phiếu
          </Link>
          <h1 className="admin-page-title" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <Wrench size={22} style={{ color: "#FF8F00" }} />
            {m.title}
            <span className={s?.cls} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12 }}>
              {s?.icon} {s?.text}
            </span>
            {isOverdue(m) && <span className="badge badge-overdue">Quá hạn</span>}
          </h1>
          <p className="admin-page-subtitle">
            Mã {m.ticketCode} • Sân{" "}
            <Link to="/admin/courts" style={{ color: "#1f6fd1", fontWeight: 700 }}>
              {m.court?.name}
            </Link>{" "}
            ({m.court?.status === "maintenance" ? "đang đóng" : "hoạt động"})
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {m.status !== "completed" && m.status !== "cancelled" && (
            <button style={btn("#f1f5f9", "#475569")} onClick={() => setShowEdit(true)}>
              <Pencil size={13} /> Sửa phiếu
            </button>
          )}
          {actions}
        </div>
      </div>

      {/* 3 cột: thông tin / xung đột / chi phí + timeline */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        <div style={cardStyle}>
          <div style={cardTitle}>Thông tin phiếu</div>
          <div style={infoRow}>
            <div><strong>Hạng mục:</strong> {CATEGORY_MAP[m.category] || "—"}</div>
            <div><strong>Mức ưu tiên:</strong> <span style={{ color: pr.color, fontWeight: 800 }}>{pr.text}</span></div>
            <div><strong>Loại:</strong> {t.text}</div>
            <div>
              <strong>Khung giờ:</strong> {m.startDate} → {m.endDate}, {m.startTime}–{m.endTime}
            </div>
            <div>
              <strong>Chặn lịch đặt:</strong>{" "}
              {m.requiresClosure === false ? "Không (việc nhỏ)" : "Có"}
            </div>
            <div>
              <strong>Thực hiện:</strong> {m.assignedTo || "—"}{" "}
              {m.executorType === "contractor" ? "(Nhà thầu)" : "(Nhân viên sân)"}
            </div>
            {m.executorType === "contractor" && m.contractor?.name && (
              <div><strong>Nhà thầu:</strong> {m.contractor.name} {m.contractor.phone && `• ${m.contractor.phone}`}</div>
            )}
            {m.isUnderWarranty && <div style={{ color: "#087a43", fontWeight: 700 }}>Đang bảo hành nhà thầu — chi phí 0đ</div>}
            <div><strong>Tạo lúc:</strong> {fmt(m.createdAt)} ({m.createdBy?.name || "—"})</div>
            {m.actualStart && <div><strong>Bắt đầu thực:</strong> {fmt(m.actualStart)}</div>}
            {m.actualEnd && <div><strong>Kết thúc thực:</strong> {fmt(m.actualEnd)}</div>}
            {m.downtimeMinutes != null && (
              <div>
                <strong>Sân đóng:</strong> {Math.round((m.downtimeMinutes / 60) * 10) / 10} giờ
              </div>
            )}
          </div>
        </div>

        <div style={cardStyle}>
          <div style={cardTitle}>
            <Clock size={12} style={{ display: "inline", marginRight: 4 }} />
            Timeline trạng thái
          </div>
          {(m.statusHistory || []).length === 0 ? (
            <div style={{ ...infoRow, color: "#94a3b8" }}>
              Chưa có lịch sử (phiếu tạo trước bản v2)
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[...m.statusHistory]
                .reverse()
                .map((h, i) => {
                  const hs = STATUS_MAP[h.status];
                  const isEdit = h.status === m.status && i !== m.statusHistory.length;
                  return (
                    <div key={i} style={{ display: "flex", gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#FF8F00", marginTop: 5, flexShrink: 0 }} />
                      <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                        <div style={{ fontWeight: 800 }}>{hs?.text || h.status}</div>
                        <div style={{ color: "#64748b" }}>
                          {fmt(h.at)} {h.by?.name ? `• ${h.by.name}` : ""}
                        </div>
                        {h.note && (
                          <div style={{ color: "#475569", fontStyle: "italic" }}>{h.note}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={cardStyle}>
            <div style={cardTitle}>Chi phí</div>
            <div style={infoRow}>
              <div><strong>Nhân công (nhật ký):</strong> {fmtMoney(m.costLabor)}</div>
              <div><strong>Vật tư (nhật ký):</strong> {fmtMoney(m.costMaterial)}</div>
              <div><strong>Nhà thầu (Admin):</strong> {fmtMoney(m.costContractor || m.cost)}</div>
              {m.contractor?.invoiceNo && <div><strong>Hóa đơn:</strong> {m.contractor.invoiceNo}</div>}
              <div style={{ borderTop: "1px dashed #e2e8f0", marginTop: 6, paddingTop: 6, fontWeight: 800 }}>
                Tổng: {fmtMoney(m.costTotal || m.cost)}
              </div>
              {m.costNote && <div style={{ color: "#64748b", fontStyle: "italic" }}>{m.costNote}</div>}
            </div>
          </div>

          {m.conflictResolution?.affectedBookings?.length > 0 && (
            <div style={{ ...cardStyle, background: "#fffbeb", border: "1px solid #fde68a" }}>
              <div style={{ ...cardTitle, color: "#b45309" }}>
                <X size={12} style={{ display: "inline", marginRight: 4 }} />
                Xử lý xung đột lịch ({m.conflictResolution.affectedBookings.length} booking)
              </div>
              <div style={{ fontSize: 12, color: "#92400e", lineHeight: 1.7 }}>
                {m.conflictResolution.resolutionNote}
              </div>
            </div>
          )}

          {/* Nhật ký thực hiện (bảng của POS — Phase 5 mới có dữ liệu) */}
          <div style={cardStyle}>
            <div style={cardTitle}>Nhật ký thực hiện ({(data.logs || []).length})</div>
            {(data.logs || []).length === 0 ? (
              <div style={{ ...infoRow, color: "#94a3b8" }}>
                Chưa có nhật ký — nhân viên ghi từ màn POS (Phase 5)
              </div>
            ) : (
              data.logs.map((l) => (
                <div key={l._id} style={{ fontSize: 12, lineHeight: 1.7, marginBottom: 8 }}>
                  <div style={{ fontWeight: 800 }}>
                    {fmt(l.startedAt)} {l.endedAt ? `→ ${fmt(l.endedAt)}` : "→ đang làm"}{" "}
                    • {l.performedBy?.name || "—"}
                  </div>
                  {(l.workDone || l.steps?.length) && (
                    <div>{l.workDone || l.steps.map((s2) => s2.description).join("; ")}</div>
                  )}
                  {l.materialsUsed?.length > 0 && (
                    <div style={{ color: "#64748b" }}>
                      Vật tư: {l.materialsUsed.map((mt) => `${mt.name} x${mt.qty}`).join(", ")}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Báo cáo nghiệm thu (Inspection acceptance — Phase 6) */}
          <div style={cardStyle}>
            <div style={cardTitle}>Kiểm tra lại sau sửa ({(data.inspections || []).length})</div>
            {(data.inspections || []).length === 0 ? (
              <div style={{ ...infoRow, color: "#94a3b8" }}>
                Chưa có lần kiểm tra lại nào
              </div>
            ) : (
              data.inspections.map((insp) => (
                <div key={insp._id} style={{ fontSize: 12, lineHeight: 1.7, marginBottom: 6 }}>
                  <span
                    className={insp.result === "pass" ? "badge badge-confirmed" : "badge badge-cancelled"}
                    style={{ marginRight: 6 }}
                  >
                    {insp.result === "pass" ? "Đạt" : "Không đạt"}
                  </span>
                  {fmt(insp.createdAt)} • {insp.inspectedBy?.name || "—"}
                  {insp.result === "fail" && insp.failReason && (
                    <div style={{ color: "#b42323" }}>Lý do: {insp.failReason}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showEdit && <EditModal ticket={m} onClose={() => setShowEdit(false)} onSaved={fetchData} />}
    </div>
  );
}

// ============ MODAL SỬA PHIẾU — field hiện theo trạng thái (N1.5) ============
function EditModal({ ticket, onClose, onSaved }) {
  const isPending = ticket.status === "pending";
  const isActive = ["in_progress", "on_hold", "pending_acceptance"].includes(ticket.status);
  const isCompleted = ticket.status === "completed";

  const [f, setF] = useState({
    title: ticket.title || "",
    description: ticket.description || "",
    startDate: ticket.startDate || "",
    endDate: ticket.endDate || "",
    startTime: ticket.startTime || "06:00",
    endTime: ticket.endTime || "22:00",
    category: ticket.category || "other",
    priority: ticket.priority || "medium",
    requiresClosure: ticket.requiresClosure !== false,
    maintenanceType: ticket.maintenanceType || "scheduled",
    assignedTo: ticket.assignedTo || "",
    executorType: ticket.executorType || "in_house",
    costContractor: ticket.costContractor ?? ticket.cost ?? 0,
    invoiceNo: ticket.contractor?.invoiceNo || "",
    reason: "",
  });

  const set = (k) => (e) =>
    setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const save = async () => {
    const body = {};
    if (isPending) {
      Object.assign(body, {
        title: f.title,
        description: f.description,
        startDate: f.startDate,
        endDate: f.endDate,
        startTime: f.startTime,
        endTime: f.endTime,
        category: f.category,
        priority: f.priority,
        requiresClosure: f.requiresClosure,
        maintenanceType: f.maintenanceType,
        assignedTo: f.assignedTo,
        executorType: f.executorType,
      });
    } else if (isActive) {
      // whitelist backend: description, assignedTo, priority, endDate, endTime
      Object.assign(body, {
        description: f.description,
        assignedTo: f.assignedTo,
        priority: f.priority,
        endDate: f.endDate,
        endTime: f.endTime,
      });
    } else if (isCompleted) {
      if (!f.reason.trim()) {
        toast.error("Sửa phiếu hoàn thành bắt buộc nhập lý do");
        return;
      }
      Object.assign(body, {
        costContractor: Number(f.costContractor) || 0,
        contractor: { ...ticket.contractor, invoiceNo: f.invoiceNo },
        reason: f.reason,
      });
    }
    try {
      await api.put(`/maintenance/${ticket._id}`, body);
      toast.success("Đã cập nhật phiếu");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi cập nhật");
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    fontSize: 13,
    fontWeight: 600,
  };
  const label = {
    fontSize: 12,
    fontWeight: 700,
    color: "#475569",
    display: "block",
    marginBottom: 4,
  };

  return (
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
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "white", borderRadius: 16, padding: 24, width: "100%", maxWidth: 520, maxHeight: "90vh", overflow: "auto" }}>
        <h2 style={{ fontWeight: 800, fontSize: 17, marginBottom: 4 }}>Sửa phiếu {ticket.ticketCode}</h2>
        <p style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>
          {isPending && "Phiếu chờ xử lý — sửa được mọi thông tin."}
          {isActive && "Phiếu đang thực hiện — chỉ sửa mô tả, người phụ trách, ưu tiên, ngày/giờ kết thúc."}
          {isCompleted && "Phiếu đã hoàn thành — chỉ sửa chi phí/hóa đơn, bắt buộc lý do."}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {isPending && (
            <>
              <div>
                <label style={label}>Tiêu đề</label>
                <input style={inputStyle} value={f.title} onChange={set("title")} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={label}>Ngày bắt đầu</label>
                  <input type="date" style={inputStyle} value={f.startDate} onChange={set("startDate")} />
                </div>
                <div>
                  <label style={label}>Ngày kết thúc</label>
                  <input type="date" style={inputStyle} value={f.endDate} onChange={set("endDate")} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={label}>Giờ bắt đầu</label>
                  <input type="time" style={inputStyle} value={f.startTime} onChange={set("startTime")} />
                </div>
                <div>
                  <label style={label}>Giờ kết thúc</label>
                  <input type="time" style={inputStyle} value={f.endTime} onChange={set("endTime")} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={label}>Hạng mục</label>
                  <select style={inputStyle} value={f.category} onChange={set("category")}>
                    {Object.entries(CATEGORY_MAP).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={label}>Mức ưu tiên</label>
                  <select style={inputStyle} value={f.priority} onChange={set("priority")}>
                    {Object.entries(PRIORITY_MAP).map(([k, v]) => (
                      <option key={k} value={k}>{v.text}</option>
                    ))}
                  </select>
                </div>
              </div>
              <label style={{ display: "flex", gap: 8, fontSize: 13, fontWeight: 700 }}>
                <input type="checkbox" checked={f.requiresClosure} onChange={set("requiresClosure")} />
                Đóng sân (chặn lịch đặt)
              </label>
            </>
          )}

          <div>
            <label style={label}>Mô tả</label>
            <textarea rows={2} style={inputStyle} value={f.description} onChange={set("description")} />
          </div>

          {(isPending || isActive) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={label}>Người phụ trách</label>
                <input style={inputStyle} value={f.assignedTo} onChange={set("assignedTo")} />
              </div>
              <div>
                <label style={label}>Mức ưu tiên</label>
                <select style={inputStyle} value={f.priority} onChange={set("priority")}>
                  {Object.entries(PRIORITY_MAP).map(([k, v]) => (
                    <option key={k} value={k}>{v.text}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {isActive && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={label}>Ngày kết thúc</label>
                <input type="date" style={inputStyle} value={f.endDate} onChange={set("endDate")} />
              </div>
              <div>
                <label style={label}>Giờ kết thúc</label>
                <input type="time" style={inputStyle} value={f.endTime} onChange={set("endTime")} />
              </div>
            </div>
          )}

          {isCompleted && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={label}>Chi phí nhà thầu (VNĐ)</label>
                  <input type="number" min="0" style={inputStyle} value={f.costContractor} onChange={set("costContractor")} />
                </div>
                <div>
                  <label style={label}>Số hóa đơn</label>
                  <input style={inputStyle} value={f.invoiceNo} onChange={set("invoiceNo")} />
                </div>
              </div>
              <div>
                <label style={label}>Lý do sửa (bắt buộc)</label>
                <input style={inputStyle} value={f.reason} onChange={set("reason")} placeholder="VD: nhập thiếu hóa đơn..." />
              </div>
            </>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
            <button style={btn("#f1f5f9", "#475569")} onClick={onClose}>
              Đóng
            </button>
            <button style={btn("linear-gradient(135deg, #0D9D57, #1aaf64)")} onClick={save}>
              Lưu thay đổi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
