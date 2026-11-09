import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

// N1.10 — Lịch bảo trì 7 ngày: màu phiếu theo loại + viền cam tạm ngưng + chấm quá hạn
const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const BAR_STYLE = {
  emergency: { background: "#b91c1c", color: "white" },
  scheduled: {
    // sọc đỏ gạch = sửa chữa
    background:
      "repeating-linear-gradient(45deg, #ef4444 0 6px, #b91c1c 6px 12px)",
    color: "white",
  },
  periodic: { background: "#0ea5e9", color: "white" },
  cancelled: { background: "#e2e8f0", color: "#64748b" },
};

export default function MaintenanceCalendar() {
  const navigate = useNavigate();
  const [weekOffset, setWeekOffset] = useState(0);
  const [maintenances, setMaintenances] = useState([]);
  const [courts, setCourts] = useState([]);
  const [suspendedCourts, setSuspendedCourts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/maintenance"),
      api.get("/courts"),
      api.get("/maintenance/active-courts"),
    ])
      .then(([mRes, cRes, aRes]) => {
        setMaintenances(
          (mRes.data.maintenances || []).filter(
            (m) => m.requiresClosure !== false,
          ),
        );
        setCourts(cRes.data.courts || []);
        setSuspendedCourts((aRes.data.suspendedCourts || []).map(String));
      })
      .catch(() => toast.error("Lỗi tải lịch bảo trì"))
      .finally(() => setLoading(false));
  }, []);

  const today = ymd(new Date());
  const base = new Date();
  base.setDate(base.getDate() + weekOffset * 7);
  base.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return ymd(d);
  });

  // Phiếu phủ ngày này (chưa hủy; completed vẫn hiện để xem lại lịch sử)
  const ticketsOn = (courtId, day) =>
    maintenances.filter(
      (m) =>
        String(m.court?._id) === String(courtId) &&
        m.status !== "cancelled" &&
        m.startDate <= day &&
        m.endDate >= day,
    );

  const headerCell = {
    fontSize: 11,
    fontWeight: 800,
    color: "#64748b",
    textAlign: "center",
    padding: "6px 2px",
  };

  return (
    <div className="admin-page-content">
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
          <h1 className="admin-page-title">Lịch bảo trì sân</h1>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="admin-action-btn"
            style={{
              background: "#f1f5f9",
              border: "none",
              cursor: "pointer",
              borderRadius: 8,
              padding: "8px 12px",
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className="admin-action-btn"
            style={{
              background: weekOffset === 0 ? "#FF8F00" : "#f1f5f9",
              color: weekOffset === 0 ? "white" : "#475569",
              border: "none",
              cursor: "pointer",
              borderRadius: 8,
              padding: "8px 14px",
              fontWeight: 800,
              fontSize: 12,
            }}
          >
            Tuần này
          </button>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            className="admin-action-btn"
            style={{
              background: "#f1f5f9",
              border: "none",
              cursor: "pointer",
              borderRadius: 8,
              padding: "8px 12px",
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Chú giải */}
      <div
        style={{
          display: "flex",
          gap: 14,
          flexWrap: "wrap",
          fontSize: 11,
          fontWeight: 700,
          color: "#475569",
          marginBottom: 12,
          alignItems: "center",
        }}
      >
        <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>
          <i
            style={{
              width: 22,
              height: 10,
              borderRadius: 3,
              display: "inline-block",
              background: BAR_STYLE.scheduled.background,
            }}
          />
          Sửa chữa
        </span>
        <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>
          <i
            style={{
              width: 22,
              height: 10,
              borderRadius: 3,
              background: BAR_STYLE.emergency.background,
              display: "inline-block",
            }}
          />
          Khẩn cấp
        </span>
        <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>
          <i
            style={{
              width: 22,
              height: 10,
              borderRadius: 3,
              background: BAR_STYLE.periodic.background,
              display: "inline-block",
            }}
          />
          Định kỳ
        </span>
        <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>
          <i
            style={{
              width: 14,
              height: 12,
              border: "2px solid #f97316",
              borderRadius: 3,
              display: "inline-block",
            }}
          />
          Sân tạm ngưng
        </span>
        <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>
          <AlertCircle size={12} color="#b42323" /> Quá hạn
        </span>
      </div>

      {loading ? (
        <div className="admin-loading">
          <div className="admin-loading-spinner"></div>
          <span>Đang tải...</span>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "130px repeat(7, 1fr)",
            gap: 1,
            background: "#e2e8f0",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div style={{ ...headerCell, background: "#f8fafc" }}>Sân</div>
          {days.map((d) => (
            <div
              key={d}
              style={{
                ...headerCell,
                background: d === today ? "#fff4dc" : "#f8fafc",
                color: d === today ? "#b45309" : "#64748b",
              }}
            >
              {d.slice(8)}/{d.slice(5, 7)}
            </div>
          ))}

          {courts.map((court) => (
            <CourtRow
              key={court._id}
              court={court}
              days={days}
              today={today}
              ticketsOn={ticketsOn}
              suspended={suspendedCourts.includes(String(court._id))}
              onTicket={(id) => navigate(`/admin/maintenance/${id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CourtRow({ court, days, today, ticketsOn, suspended, onTicket }) {
  return (
    <>
      <div
        style={{
          background: "white",
          padding: "8px 10px",
          fontSize: 12,
          fontWeight: 800,
          color: "#1e293b",
          display: "flex",
          alignItems: "center",
        }}
      >
        {court.name}
        {court.status === "maintenance" && (
          <i
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#ef4444",
              marginLeft: 6,
            }}
          />
        )}
      </div>
      {days.map((d) => {
        const list = ticketsOn(court._id, d);
        // Tạm ngưng (viền cam): chỉ tính từ ngày có báo cáo trở đi, hiện ở ô hôm nay
        const showSusp = suspended && d === today;
        return (
          <div
            key={d}
            style={{
              background: "white",
              minHeight: 52,
              padding: 3,
              display: "flex",
              flexDirection: "column",
              gap: 3,
              outline: showSusp ? "2px solid #f97316" : "none",
              outlineOffset: -2,
            }}
          >
            {list.map((m) => {
              const overdue =
                ["pending", "in_progress", "on_hold"].includes(m.status) &&
                m.endDate < today;
              const style = BAR_STYLE[m.maintenanceType] || BAR_STYLE.scheduled;
              return (
                <button
                  key={m._id}
                  onClick={() => onTicket(m._id)}
                  title={`${m.ticketCode} • ${m.title} (${m.startTime}-${m.endTime})`}
                  style={{
                    ...style,
                    border: "none",
                    borderRadius: 5,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "3px 6px",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 4,
                    opacity: m.status === "completed" ? 0.55 : 1,
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.ticketCode} · {m.startTime}
                  </span>
                  {overdue && <span style={{ color: "#ffe4e6" }}>⚠</span>}
                </button>
              );
            })}
          </div>
        );
      })}
    </>
  );
}
