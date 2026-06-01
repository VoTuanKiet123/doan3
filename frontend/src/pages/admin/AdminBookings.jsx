import { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const STATUS_MAP = {
  pending: { text: 'Chờ xác nhận', cls: 'badge badge-pending' },
  confirmed: { text: 'Đã xác nhận', cls: 'badge badge-confirmed' },
  cancelled: { text: 'Đã huỷ', cls: 'badge badge-cancelled' },
};

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchBookings = () => {
    api.get('/bookings').then(res => { setBookings(res.data.bookings); setLoading(false); });
  };

  useEffect(() => { fetchBookings(); }, []);

  const handleStatus = async (id, status) => {
    try {
      await api.put(`/bookings/${id}/status`, { status });
      toast.success('Cập nhật trạng thái thành công');
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi cập nhật');
    }
  };

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Quản lý đặt sân</h1>
          <p className="admin-page-subtitle">Xem và xác nhận các lịch đặt sân</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="admin-filter-tabs">
        {[
          { key: 'all', label: 'Tất cả' },
          { key: 'pending', label: 'Chờ xác nhận' },
          { key: 'confirmed', label: 'Đã xác nhận' },
          { key: 'cancelled', label: 'Đã huỷ' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`admin-filter-tab ${filter === tab.key ? 'admin-filter-tab--active' : ''}`}
          >
            {tab.label}
            <span className="admin-filter-tab-count">
              {tab.key === 'all' ? bookings.length : bookings.filter(b => b.status === tab.key).length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="admin-loading">
          <div className="admin-loading-spinner"></div>
          <span>Đang tải dữ liệu...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty">
          <span className="admin-empty-icon">📋</span>
          <p>Không có booking nào</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>Sân</th>
                <th>Ngày</th>
                <th>Giờ</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => {
                const s = STATUS_MAP[b.status];
                return (
                  <tr key={b._id}>
                    <td>
                      <div className="admin-user-cell">
                        <div className="admin-user-name">{b.user?.name}</div>
                        <div className="admin-text-muted">{b.user?.phone}</div>
                      </div>
                    </td>
                    <td className="admin-text-secondary">🏸 {b.court?.name}</td>
                    <td className="admin-text-secondary">{b.date}</td>
                    <td className="admin-text-secondary">{b.startTime} - {b.endTime}</td>
                    <td className="admin-text-price">{b.totalPrice?.toLocaleString('vi-VN')}đ</td>
                    <td>
                      <span className={s?.cls}>{s?.text}</span>
                    </td>
                    <td>
                      <div className="admin-action-group">
                        {b.status === 'pending' && (
                          <button onClick={() => handleStatus(b._id, 'confirmed')}
                            className="admin-action-btn admin-action-btn--confirm">
                            Xác nhận
                          </button>
                        )}
                        {b.status !== 'cancelled' && (
                          <button onClick={() => handleStatus(b._id, 'cancelled')}
                            className="admin-action-btn admin-action-btn--danger">
                            Huỷ
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
