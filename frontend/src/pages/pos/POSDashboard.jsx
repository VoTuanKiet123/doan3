import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import toast from "react-hot-toast";
import {
  Volleyball,
  Clock,
  Users,
  ShoppingCart,
  AlertTriangle,
  ClipboardCheck,
  UserPlus,
  TrendingUp,
  CalendarCheck,
} from "lucide-react";

const statusConfig = {
  available: {
    label: "Trống",
    bg: "linear-gradient(135deg, #ecfdf5, #d1fae5)",
    border: "#a7f3d0",
    textColor: "#065f46",
    badge: "bg-emerald-100 text-emerald-700",
    dot: "#10b981",
  },
  reserved: {
    label: "Đã đặt",
    bg: "linear-gradient(135deg, #eff6ff, #dbeafe)",
    border: "#bfdbfe",
    textColor: "#1d4ed8",
    badge: "bg-blue-100 text-blue-700",
    dot: "#3b82f6",
  },
  in_use: {
    label: "Đang mở phiên",
    bg: "linear-gradient(135deg, #fffbeb, #fef3c7)",
    border: "#fde68a",
    textColor: "#b45309",
    badge: "bg-amber-100 text-amber-700",
    dot: "#f59e0b",
  },
  maintenance: {
    label: "Bảo trì",
    bg: "linear-gradient(135deg, #fef2f2, #fee2e2)",
    border: "#fecaca",
    textColor: "#b91c1c",
    badge: "bg-red-100 text-red-700",
    dot: "#ef4444",
  },
};

export default function POSDashboard() {
  const navigate = useNavigate();
  const [courts, setCourts] = useState([]);
  const [currentShift, setCurrentShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState("");
  const [todayStats, setTodayStats] = useState({
    bookings: 0,
    walkins: 0,
    revenue: 0,
  });

  const fetchData = useCallback(async () => {
    try {
      const [courtsRes, shiftRes] = await Promise.all([
        api.get("/pos/courts-status"),
        api.get("/pos/shifts/current"),
      ]);
      setCourts(courtsRes.data.courts);
      setCurrentTime(courtsRes.data.currentTime);
      setCurrentShift(shiftRes.data.shift);

      const stats = courtsRes.data.courts.reduce(
        (acc, c) => ({
          bookings: acc.bookings + c.totalBookingsToday,
          walkins: acc.walkins + (c.currentStatus === "in_use" ? 1 : 0),
          revenue: acc.revenue,
        }),
        { bookings: 0, walkins: 0, revenue: 0 }
      );

      if (shiftRes.data.shift) {
        stats.revenue =
          shiftRes.data.shift.totalCashIn + shiftRes.data.shift.totalTransferIn;
      }
      setTodayStats(stats);
    } catch (err) {
      toast.error("Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 240,
          gap: 12,
          color: "#047857",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            border: "3px solid #a7f3d0",
            borderTopColor: "#10b981",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <span style={{ fontWeight: 600, fontSize: 14 }}>Đang tải dữ liệu...</span>
      </div>
    );
  }

  const statCards = [
    {
      icon: <Volleyball size={22} color="#065f46" />,
      iconBg: "linear-gradient(135deg, #d1fae5, #a7f3d0)",
      value: courts.length,
      label: "Tổng số sân",
      sub: `${courts.filter((c) => c.currentStatus === "available").length} sân đang trống`,
    },
    {
      icon: <CalendarCheck size={22} color="#1d4ed8" />,
      iconBg: "linear-gradient(135deg, #dbeafe, #bfdbfe)",
      value: todayStats.bookings,
      label: "Đặt sân hôm nay",
      sub: "lượt booking",
    },
    {
      icon: <Users size={22} color="#b45309" />,
      iconBg: "linear-gradient(135deg, #fef3c7, #fde68a)",
      value: courts.filter((c) => c.currentStatus === "in_use").length,
      label: "Đang mở phiên",
      sub: "sân đang có khách",
    },
    {
      icon: <TrendingUp size={22} color="#7c3aed" />,
      iconBg: "linear-gradient(135deg, #ede9fe, #ddd6fe)",
      value: todayStats.revenue.toLocaleString() + "đ",
      label: "Doanh thu ca",
      sub: currentShift ? "Ca đang mở" : "Chưa mở ca",
    },
  ];

  const quickActions = [
    {
      icon: <ClipboardCheck size={28} />,
      label: "Check-in",
      sub: "Khách đã đặt sân",
      bg: "linear-gradient(135deg, #059669, #10b981)",
      shadow: "rgba(16,185,129,0.4)",
      action: () => navigate("/pos/checkin"),
    },
    {
      icon: <UserPlus size={28} />,
      label: "Khách vãng lai",
      sub: "Đặt + Check-in ngay",
      bg: "linear-gradient(135deg, #2563eb, #3b82f6)",
      shadow: "rgba(59,130,246,0.4)",
      action: () => navigate("/pos/walkin"),
    },
    {
      icon: <ShoppingCart size={28} />,
      label: "Bán dịch vụ",
      sub: "Nước, đồ ăn, vật tư",
      bg: "linear-gradient(135deg, #7c3aed, #8b5cf6)",
      shadow: "rgba(139,92,246,0.4)",
      action: () => navigate("/pos/orders"),
    },
    {
      icon: <Clock size={28} />,
      label: currentShift ? "Đóng ca" : "Mở ca",
      sub: currentShift
        ? `${(currentShift.expectedCash || 0).toLocaleString()}đ dự kiến`
        : "Bắt đầu ca mới",
      bg: currentShift
        ? "linear-gradient(135deg, #d97706, #f59e0b)"
        : "linear-gradient(135deg, #4b5563, #6b7280)",
      shadow: currentShift ? "rgba(245,158,11,0.4)" : "rgba(107,114,128,0.35)",
      action: () => navigate("/pos/shift"),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
        }}
      >
        {statCards.map((card, i) => (
          <div key={i} className="pos-stat-card">
            <div
              className="pos-stat-card-icon"
              style={{ background: card.iconBg }}
            >
              {card.icon}
            </div>
            <div className="pos-stat-card-value">{card.value}</div>
            <div className="pos-stat-card-label">{card.label}</div>
            <div className="pos-stat-card-sub">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: "#064e3b",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          ⚡ Thao tác nhanh
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 14,
          }}
        >
          {quickActions.map((action, i) => (
            <button
              key={i}
              onClick={action.action}
              className="pos-quick-btn"
              style={{
                background: action.bg,
                boxShadow: `0 6px 20px ${action.shadow}`,
                color: "white",
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {action.icon}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{action.label}</div>
                <div
                  style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}
                >
                  {action.sub}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Court Status Grid */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <h2
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: "#064e3b",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            🏸 Sơ đồ sân
          </h2>
          <span
            style={{
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              color: "#047857",
              padding: "4px 12px",
              borderRadius: 99,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            ⏰ {currentTime}
          </span>
        </div>

        {/* Legend */}
        <div
          style={{
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          {Object.entries(statusConfig).map(([key, s]) => (
            <div
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: "#374151",
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: s.dot,
                }}
              />
              {s.label}
            </div>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: 12,
          }}
        >
          {courts.map((court) => {
            const status = statusConfig[court.currentStatus] || statusConfig.available;
            return (
              <div
                key={court._id}
                style={{
                  background: status.bg,
                  border: `2px solid ${status.border}`,
                  borderRadius: 14,
                  padding: "14px",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: 16,
                      color: status.textColor,
                    }}
                  >
                    {court.name}
                  </span>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: status.dot,
                      boxShadow: `0 0 0 3px ${status.dot}30`,
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: status.textColor,
                    opacity: 0.85,
                  }}
                >
                  {status.label}
                </div>
                {court.currentBooking && (
                  <div
                    style={{
                      fontSize: 11,
                      marginTop: 6,
                      color: status.textColor,
                      opacity: 0.7,
                      lineHeight: 1.4,
                    }}
                  >
                    {court.currentBooking.user?.name || "Khách"}
                    <br />
                    {court.currentBooking.startTime} – {court.currentBooking.endTime}
                  </div>
                )}
                {court.upcomingCount > 0 && court.currentStatus === "available" && (
                  <div
                    style={{
                      fontSize: 11,
                      marginTop: 4,
                      color: "#1d4ed8",
                      fontWeight: 600,
                    }}
                  >
                    Sắp tới: {court.upcomingCount} lượt
                  </div>
                )}
                {court.maintenanceCount > 0 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      marginTop: 4,
                      color: "#b91c1c",
                    }}
                  >
                    <AlertTriangle size={10} />
                    Đang bảo trì
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
