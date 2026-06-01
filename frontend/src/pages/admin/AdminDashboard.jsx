import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ courts: 0, bookings: 0, users: 0, revenue: 0 });
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/courts'),
      api.get('/bookings'),
      api.get('/users'),
    ]).then(([courtsRes, bookingsRes, usersRes]) => {
      const bookings = bookingsRes.data.bookings;
      const revenue = bookings
        .filter(b => b.status === 'confirmed')
        .reduce((sum, b) => sum + b.totalPrice, 0);
      setStats({
        courts: courtsRes.data.count,
        bookings: bookingsRes.data.count,
        users: usersRes.data.count,
        revenue,
      });
      setRecentBookings(bookings.slice(0, 5));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const statusMap = {
    pending: { text: 'Chờ xác nhận', cls: 'badge badge-pending' },
    confirmed: { text: 'Đã xác nhận', cls: 'badge badge-confirmed' },
    cancelled: { text: 'Đã huỷ', cls: 'badge badge-cancelled' },
  };

  const statCards = [
    { label: 'Tổng sân', value: stats.courts, icon: '🏸', color: 'admin-stat-card--green', link: '/admin/courts' },
    { label: 'Tổng booking', value: stats.bookings, icon: '📅', color: 'admin-stat-card--blue', link: '/admin/bookings' },
    { label: 'Người dùng', value: stats.users, icon: '👥', color: 'admin-stat-card--purple', link: '/admin/users' },
    { label: 'Doanh thu', value: stats.revenue.toLocaleString('vi-VN') + 'đ', icon: '💰', color: 'admin-stat-card--yellow', link: '#' },
  ];

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Dashboard</h1>
          <p className="admin-page-subtitle">Tổng quan hệ thống đặt sân cầu lông</p>
        </div>
      </div>

      {/* Banner */}
      <div className="admin-create-court-banner">
        <div className="admin-banner-text" style={{ position: 'relative', zIndex: 1 }}>
          <h2>🏸 Tạo sân mới ngay</h2>
          <p>Thêm sân cầu lông để khách hàng có thể đặt lịch thi đấu</p>
        </div>
        <Link
          to="/admin/courts"
          id="btn-goto-manage-courts"
          className="admin-banner-btn"
          style={{ position: 'relative', zIndex: 1 }}
        >
          + Quản lý &amp; Tạo sân
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="admin-stat-cards">
        {statCards.map((card) => (
          <Link key={card.label} to={card.link} className={`admin-stat-card ${card.color}`}>
            <div className="admin-stat-card-icon">{card.icon}</div>
            <div className="admin-stat-card-value">{loading ? '...' : card.value}</div>
            <div className="admin-stat-card-label">{card.label}</div>
          </Link>
        ))}
      </div>

      {/* Quick Links */}
      <div className="admin-quick-links">
        <Link to="/admin/courts" className="admin-quick-link admin-quick-link--green">
          <span className="admin-quick-link-icon">🏸</span>
          <div>
            <div className="admin-quick-link-title">Quản lý sân</div>
            <div className="admin-quick-link-desc">Thêm, sửa, xóa sân cầu lông</div>
          </div>
        </Link>
        <Link to="/admin/bookings" className="admin-quick-link admin-quick-link--blue">
          <span className="admin-quick-link-icon">📋</span>
          <div>
            <div className="admin-quick-link-title">Quản lý đặt sân</div>
            <div className="admin-quick-link-desc">Xem và xác nhận các booking</div>
          </div>
        </Link>
      </div>

      {/* Recent Bookings */}
      <div className="admin-table-wrap">
        <div className="admin-table-header">
          <h2>Booking gần đây</h2>
          <Link to="/admin/bookings" className="admin-table-view-all">Xem tất cả →</Link>
        </div>
        {loading ? (
          <div className="admin-loading">
            <div className="admin-loading-spinner"></div>
            <span>Đang tải...</span>
          </div>
        ) : recentBookings.length === 0 ? (
          <div className="admin-empty">
            <span className="admin-empty-icon">📅</span>
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
                    <td className="admin-text-secondary">🏸 {b.court?.name}</td>
                    <td className="admin-text-secondary">{b.date}</td>
                    <td className="admin-text-secondary">{b.startTime} - {b.endTime}</td>
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
