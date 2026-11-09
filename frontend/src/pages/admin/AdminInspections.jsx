import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import toast from "react-hot-toast";
import {
  ClipboardList,
  AlertTriangle,
  Wrench,
  EyeOff,
  Plus,
  Check,
  X as XIcon,
  RefreshCw,
  ArrowRight,
} from "lucide-react";

const SEVERITY_MAP = {
  none: { text: "Bình thường", cls: "badge badge-confirmed" },
  minor: { text: "Nhẹ", cls: "badge badge-pending" },
  needs_repair: { text: "Cần sửa", cls: "badge badge-maintenance" },
  critical: { text: "NGHIÊM TRỌNG — sân tạm ngưng", cls: "badge badge-cancelled" },
};

const STATUS_TABS = [
  { key: "pending", label: "Chờ xử lý" },
  { key: "ticketed", label: "Đã tạo phiếu" },
  { key: "dismissed", label: "Đã bỏ qua" },
  { key: "all", label: "Tất cả" },
];

const RESULT_MARK = {
  ok: { icon: <Check size={12} />, color: "#087a43" },
  attention: { icon: <AlertTriangle size={12} />, color: "#b45309" },
  fail: { icon: <XIcon size={12} />, color: "#b42323" },
};

const cardStyle = {
  background: "white",
  borderRadius: 12,
  padding: 16,
  border: "1px solid #e8ecf1",
};

export default function AdminInspections() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("pending");
  const [inspections, setInspections] = useState([]);
  const [counts, setCounts] = useState({ pending: 0, ticketed: 0, dismissed: 0 });
  const [loading, setLoading] = useState(true);

  // Checklist template (N2.1)
  const [checklist, setChecklist] = useState([]);
  const [newItem, setNewItem] = useState({ item: "", category: "other" });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/inspections", {
        params: tab === "all" ? {} : { status: tab },
      });
      setInspections(res.data.inspections);
      setCounts(res.data.counts);
    } catch (err) {
      toast.error("Lỗi tải báo cáo kiểm tra");
    } finally {
      setLoading(false);
    }
  };

  const fetchChecklist = async () => {
    try {
      const res = await api.get("/inspections/checklist");
      setChecklist(res.data.items);
    } catch {
      /* im lặng — mục chọn có sẵn trong DB */
    }
  };

  useEffect(() => {
    fetchData();
  }, [tab]);

  useEffect(() => {
    fetchChecklist();
  }, []);

  // ===== Bỏ qua báo cáo (bắt buộc lý do) =====
  const handleDismiss = async (insp) => {
    const reason = prompt("Bỏ qua báo cáo — lý do (bắt buộc):");
    if (!reason || !reason.trim()) return;
    try {
      const res = await api.put(`/inspections/${insp._id}/dismiss`, { reason });
      toast.success(res.data.message);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi bỏ qua");
    }
  };

  // ===== Tạo phiếu bảo trì từ báo cáo → form AdminMaintenance điền sẵn =====
  const handleCreateTicket = (insp) => {
    navigate(`/admin/maintenance?inspection=${insp._id}`);
  };

  const handleAddChecklistItem = async () => {
    if (!newItem.item.trim()) return;
    try {
      await api.post("/inspections/checklist", newItem);
      setNewItem({ item: "", category: "other" });
      fetchChecklist();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi thêm mục");
    }
  };

  const handleToggleItem = async (tpl) => {
    try {
      await api.put(`/inspections/checklist/${tpl._id}`, {
        isActive: !tpl.isActive,
      });
      fetchChecklist();
    } catch (err) {
      toast.error("Lỗi cập nhật mục");
    }
  };

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Báo cáo kiểm tra sân</h1>
          <p className="admin-page-subtitle">
            Nhân viên trực sân báo cáo lỗi — Admin tạo phiếu bảo trì hoặc bỏ qua
          </p>
        </div>
      </div>

      {/* Tabs trạng thái (suy ra từ dữ liệu) */}
      <div className="admin-filter-tabs">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`admin-filter-tab ${tab === t.key ? "admin-filter-tab--active" : ""}`}
          >
            {t.label}
            <span className="admin-filter-tab-count">
              {t.key === "all" ? "—" : (counts[t.key] ?? 0)}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="admin-loading">
          <div className="admin-loading-spinner"></div>
          <span>Đang tải...</span>
        </div>
      ) : inspections.length === 0 ? (
        <div className="admin-empty">
          <span className="admin-empty-icon">
            <ClipboardList size={40} />
          </span>
          <p>Không có báo cáo nào ở nhóm này</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {inspections.map((insp) => {
            const sev = SEVERITY_MAP[insp.severity] || SEVERITY_MAP.none;
            const badItems = (insp.items || []).filter(
              (i) => i.result !== "ok",
            );
            return (
              <div key={insp._id} style={cardStyle}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 10,
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: 15,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      {insp.court?.name}
                      <span className={sev.cls}>{sev.text}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                      Ngày {insp.date} • Người kiểm tra: {insp.inspectedBy?.name || "—"}
                    </div>
                  </div>

                  {/* Hành động — chỉ báo cáo chờ xử lý */}
                  {insp.derivedStatus === "pending" && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        onClick={() => handleCreateTicket(insp)}
                        style={{
                          background: "linear-gradient(135deg, #0D9D57, #1aaf64)",
                          color: "white",
                          border: "none",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "8px 14px",
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        <Wrench size={13} /> Tạo phiếu bảo trì
                      </button>
                      <button
                        onClick={() => handleDismiss(insp)}
                        style={{
                          background: "#f1f5f9",
                          color: "#475569",
                          border: "none",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "8px 14px",
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        <EyeOff size={13} /> Bỏ qua
                      </button>
                    </div>
                  )}

                  {insp.ticket && (
                    <Link
                      to={`/admin/maintenance/${insp.ticket._id}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 12,
                        fontWeight: 800,
                        color: "#1f6fd1",
                      }}
                    >
                      Phiếu {insp.ticket.ticketCode} <ArrowRight size={13} />
                    </Link>
                  )}
                </div>

                {insp.note && (
                  <p
                    style={{
                      margin: "10px 0 0",
                      fontSize: 13,
                      color: "#334155",
                      lineHeight: 1.6,
                    }}
                  >
                    <strong>Mô tả:</strong> {insp.note}
                  </p>
                )}

                {badItems.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>
                      Mục lỗi
                    </div>
                    {badItems.map((i, idx) => {
                      const mark = RESULT_MARK[i.result] || RESULT_MARK.attention;
                      return (
                        <div key={idx} style={{ fontSize: 12, lineHeight: 1.9 }}>
                          <span style={{ color: mark.color, fontWeight: 800 }}>
                            {mark.icon} {i.item}
                          </span>
                          {i.note && (
                            <span style={{ color: "#64748b" }}> — {i.note}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {insp.dismissal && (
                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 12,
                      color: "#64748b",
                      background: "#f8fafc",
                      borderRadius: 8,
                      padding: "8px 10px",
                    }}
                  >
                    Đã bỏ qua: {insp.dismissal.reason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ===== Mục kiểm tra mẫu (N2.1) ===== */}
      <div style={{ ...cardStyle, marginTop: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: 10 }}>
          Mục kiểm tra mẫu (nhân viên nhìn theo danh sách này khi kiểm sân)
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {checklist.map((tpl) => (
            <div
              key={tpl._id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 13,
                padding: "6px 10px",
                borderRadius: 8,
                background: tpl.isActive ? "white" : "#f8fafc",
                border: "1px solid #eef2f7",
              }}
            >
              <span style={{ color: tpl.isActive ? "#1e293b" : "#94a3b8", textDecoration: tpl.isActive ? "none" : "line-through" }}>
                {tpl.item}
              </span>
              <button
                onClick={() => handleToggleItem(tpl)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 700,
                  color: tpl.isActive ? "#b42323" : "#087a43",
                }}
              >
                {tpl.isActive ? "Tắt" : "Bật lại"}
              </button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input
            value={newItem.item}
            onChange={(e) => setNewItem({ ...newItem, item: e.target.value })}
            placeholder="Thêm mục kiểm tra mới..."
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 13,
            }}
          />
          <button
            onClick={handleAddChecklistItem}
            style={{
              background: "#FF8F00",
              color: "white",
              border: "none",
              cursor: "pointer",
              borderRadius: 8,
              padding: "8px 14px",
              fontWeight: 800,
              fontSize: 12,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Plus size={13} /> Thêm
          </button>
        </div>
      </div>
    </div>
  );
}
