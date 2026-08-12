import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import {
  Volleyball,
  CalendarDays,
  Users,
  Wallet,
  TrendingUp,
  PlusCircle,
  ChevronRight,
  CalendarCheck,
  Wrench,
} from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    courts: 0,
    bookings: 0,
    users: 0,
    maintenance: 0,
  });
  const [analytics, setAnalytics] = useState({
    todayRevenue: 0,
    monthRevenue: 0,
    activeMaintenanceCount: 0,
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/courts"),
      api.get("/bookings"),
      api.get("/users"),
      api.get("/maintenance"),
      api.get("/analytics/dashboard"),
    ])
      .then(
        ([courtsRes, bookingsRes, usersRes, maintenanceRes, analyticsRes]) => {
          const bookings = bookingsRes.data.bookings;
          const maintenances = maintenanceRes.data.maintenances || [];
          setStats({
            courts: courtsRes.data.count,
            bookings: bookingsRes.data.count,
            users: usersRes.data.count,
            maintenance: maintenances.filter(
              (m) => m.status === "in_progress" || m.status === "pending",
            ).length,
          });
          if (analyticsRes.data.success) {
            setAnalytics(analyticsRes.data.data);
          }
          setRecentBookings(bookings.slice(0, 5));
          setLoading(false);
        },
      )
      .catch(() => setLoading(false));
  }, []);

  const statusMap = {
    pending: { text: "Chờ xác nhận", cls: "badge badge-pending" },
    confirmed: { text: "Đã xác nhận", cls: "badge badge-confirmed" },
    cancelled: { text: "Đã huỷ", cls: "badge badge-cancelled" },
  };

  const statCards = [
    {
      label: "Tổng sân",
      value: stats.courts,
      icon: <Volleyball size={22} />,
      color: "admin-stat-card--green",
      link: "/admin/courts",
    },
    {
      label: "Tổng booking",
      value: stats.bookings,
      icon: <CalendarDays size={22} />,
      color: "admin-stat-card--blue",
      link: "/admin/bookings",
    },
    {
      label: "Người dùng",
      value: stats.users,
      icon: <Users size={22} />,
      color: "admin-stat-card--purple",
      link: "/admin/users",
    },
    {
      label: "Doanh thu hôm nay",
      value: analytics.todayRevenue.toLocaleString("vi-VN") + "đ",
      icon: <Wallet size={22} />,
      color: "admin-stat-card--green",
      link: "/admin/analytics",
    },
    {
      label: "Doanh thu tháng",
      value: analytics.monthRevenue.toLocaleString("vi-VN") + "đ",
      icon: <TrendingUp size={22} />,
      color: "admin-stat-card--blue",
      link: "/admin/analytics",
    },
    {
      label: "Bảo trì đang xử lý",
      value: analytics.activeMaintenanceCount,
      icon: <Wrench size={22} />,
      color: "admin-stat-card--yellow",
      link: "/admin/maintenance",
    },
  ];

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Dashboard</h1>
          <p className="admin-page-subtitle">
            Tổng quan hệ thống đặt sân cầu lông
          </p>
        </div>
      </div>

      {/* Banner */}
      <div className="admin-create-court-banner">
        <div
          className="admin-banner-text"
          style={{ position: "relative", zIndex: 1 }}
        >
          <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Volleyball size={20} /> Tạo sân mới ngay
          </h2>
          <p>Thêm sân cầu lông để khách hàng có thể đặt lịch thi đấu</p>
        </div>
        <Link
          to="/admin/courts"
          id="btn-goto-manage-courts"
          className="admin-banner-btn"
          style={{
            position: "relative",
            zIndex: 1,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <PlusCircle size={16} /> Quản lý &amp; Tạo sân
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="admin-stat-cards">
        {statCards.map((card) => (
          <Link
            key={card.label}
            to={card.link}
            className={`admin-stat-card ${card.color}`}
          >
            <div className="admin-stat-card-icon">{card.icon}</div>
            <div className="admin-stat-card-value">
              {loading ? "..." : card.value}
            </div>
            <div className="admin-stat-card-label">{card.label}</div>
          </Link>
        ))}
      </div>

      {/* Quick Links */}
      <div className="admin-quick-links">
        <Link
          to="/admin/courts"
          className="admin-quick-link admin-quick-link--green"
        >
          <span className="admin-quick-link-icon">
            <Volleyball size={22} />
          </span>
          <div>
            <div className="admin-quick-link-title">Quản lý sân</div>
            <div className="admin-quick-link-desc">
              Thêm, sửa, xóa sân cầu lông
            </div>
          </div>
        </Link>
        <Link
          to="/admin/bookings"
          className="admin-quick-link admin-quick-link--blue"
        >
          <span className="admin-quick-link-icon">
            <CalendarCheck size={22} />
          </span>
          <div>
            <div className="admin-quick-link-title">Quản lý đặt sân</div>
            <div className="admin-quick-link-desc">
              Xem và xác nhận các booking
            </div>
          </div>
        </Link>
        <Link
          to="/admin/maintenance"
          className="admin-quick-link admin-quick-link--yellow"
        >
          <span className="admin-quick-link-icon">
            <Wrench size={22} />
          </span>
          <div>
            <div className="admin-quick-link-title">Bảo trì sân</div>
            <div className="admin-quick-link-desc">
              Quản lý lịch bảo trì & sửa chữa
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Bookings */}
      <div className="admin-table-wrap">
        <div className="admin-table-header">
          <h2>Booking gần đây</h2>
          <Link
            to="/admin/bookings"
            className="admin-table-view-all"
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            Xem tất cả <ChevronRight size={14} />
          </Link>
        </div>
        {loading ? (
          <div className="admin-loading">
            <div className="admin-loading-spinner"></div>
            <span>Đang tải...</span>
          </div>
        ) : recentBookings.length === 0 ? (
          <div className="admin-empty">
            <span className="admin-empty-icon">
              <CalendarDays size={40} />
            </span>
            <p>Chưa có booking nào</p>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>Sân</th>
                <th>Ngày</th>
                <th>Giờ</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.map((b) => {
                const s = statusMap[b.status];
                return (
                  <tr key={b._id}>
                    <td className="admin-user-name">{b.user?.name}</td>
                    <td
                      className="admin-text-secondary"
                      style={{ display: "flex", alignItems: "center", gap: 5 }}
                    >
                      <Volleyball size={14} /> {b.court?.name}
                    </td>
                    <td className="admin-text-secondary">{b.date}</td>
                    <td className="admin-text-secondary">
                      {b.startTime} - {b.endTime}
                    </td>
                    <td>
                      <span className={s?.cls}>{s?.text}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
