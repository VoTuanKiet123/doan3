import { useEffect, useState, Fragment } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Volleyball, CheckCircle, XCircle, ChevronDown, ChevronUp, CalendarX } from 'lucide-react';

const STATUS_MAP = {
  pending: { text: 'Chờ xác nhận', cls: 'badge badge-pending' },
  confirmed: { text: 'Đã xác nhận', cls: 'badge badge-confirmed' },
  cancelled: { text: 'Đã huỷ', cls: 'badge badge-cancelled' },
};

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expandedRows, setExpandedRows] = useState({});

  const toggleRow = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

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
          <span className="admin-empty-icon"><CalendarX size={40} /></span>
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
                const isExpanded = expandedRows[b._id];
                return (
                  <Fragment key={b._id}>
                    <tr>
                      <td>
                        <div className="admin-user-cell">
                          <div className="admin-user-name">{b.user?.name}</div>
                          <div className="admin-text-muted">{b.user?.phone}</div>
                        </div>
                      </td>
                      <td className="admin-text-secondary" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Volleyball size={14} style={{ color: '#0D9D57' }} /> {b.court?.name}
                      </td>
                      <td className="admin-text-secondary">{b.date}</td>
                      <td className="admin-text-secondary">{b.startTime} - {b.endTime}</td>
                      <td>
                        <div className="admin-price-cell" style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className="admin-text-price" style={{ fontWeight: 'bold' }}>
                            {b.totalPrice?.toLocaleString('vi-VN')}đ
                          </span>
                          {b.priceBreakdown && b.priceBreakdown.length > 0 && (
                            <button
                              onClick={() => toggleRow(b._id)}
                              className="admin-detail-toggle-btn"
                              style={{
                                border: 'none',
                                background: 'none',
                                color: '#10b981',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                padding: '2px 0',
                                textDecoration: 'underline',
                                textAlign: 'left',
                                marginTop: '2px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                              }}
                            >
                              {isExpanded ? <><ChevronUp size={12} /> Ẩn chi tiết</> : <><ChevronDown size={12} /> Chi tiết giá</>}
                            </button>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={s?.cls}>{s?.text}</span>
                      </td>
                      <td>
                        <div className="admin-action-group">
                          {b.status === 'pending' && (
                            <button onClick={() => handleStatus(b._id, 'confirmed')}
                              className="admin-action-btn admin-action-btn--confirm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <CheckCircle size={13} /> Xác nhận
                            </button>
                          )}
                          {b.status !== 'cancelled' && (
                            <button onClick={() => handleStatus(b._id, 'cancelled')}
                              className="admin-action-btn admin-action-btn--danger"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <XCircle size={13} /> Huỷ
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && b.priceBreakdown && b.priceBreakdown.length > 0 && (
                      <tr className="admin-expanded-row" style={{ backgroundColor: '#f8fafc' }}>
                        <td colSpan="7" style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0' }}>
                          <div className="admin-breakdown-container">
                            <h4 style={{ margin: '0 0 10px 0', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              📊 Chi tiết phân bổ giá động từng khung giờ (30 phút)
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
                              {b.priceBreakdown.map((seg, idx) => {
                                const isNormal = seg.ruleType === 'normal';
                                const isPeak = seg.ruleType === 'peak';
                                const isWeekend = seg.ruleType === 'weekend';
                                const isHoliday = seg.ruleType === 'holiday';
                                const dotColor = isNormal ? '#10b981' : isPeak ? '#f59e0b' : isWeekend ? '#ef4444' : '#8b5cf6';
                                const tagBg = isNormal ? '#ecfdf5' : isPeak ? '#fffbeb' : isWeekend ? '#fef2f2' : '#f5f3ff';
                                const borderColor = isNormal ? '#a7f3d0' : isPeak ? '#fde68a' : isWeekend ? '#fca5a5' : '#ddd6fe';
                                return (
                                  <div key={idx} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '8px 12px', borderRadius: '10px', backgroundColor: tagBg,
                                    border: `1px solid ${borderColor}`, fontSize: '11px'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: dotColor }} />
                                      <span style={{ fontWeight: 'bold', color: '#1e293b' }}>{seg.timeSlot}</span>
                                      {seg.ruleName && <span style={{ color: '#64748b', fontSize: '10px', marginLeft: '4px' }}>({seg.ruleName})</span>}
                                    </div>
                                    <span style={{ fontWeight: 'bold', color: '#0f172a' }}>
                                      {seg.price?.toLocaleString('vi-VN')}đ
                                    </span>
                                  </div>
                                );
                              })}
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
    </div>
  );
}
