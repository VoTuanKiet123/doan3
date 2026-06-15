import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function CourtsPage() {
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const { user } = useAuth();

  useEffect(() => {
    api.get('/courts')
      .then(res => {
        setCourts(res.data.courts);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = courts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
                          (c.description && c.description.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const activeCount = courts.filter(c => c.status === 'active').length;
  const maintenanceCount = courts.filter(c => c.status === 'maintenance').length;

  return (
    <div className="animate-fadeIn has-bottom-nav">
      {/* Page Header */}
      <div style={{ background: 'linear-gradient(135deg, #0D9D57 0%, #1aaf64 60%, #0a7a42 100%)', padding: '28px 16px 56px', position: 'relative' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 999, padding: '4px 14px', fontSize: 12, fontWeight: 700, color: 'white', marginBottom: 12 }}>
            🏸 Danh sách sân cầu lông
          </div>
          <h1 style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 900, color: 'white', marginBottom: 8 }}>
            Tìm Sân Cầu Lông Gần Bạn
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
            {courts.length} sân khả dụng · {activeCount} đang hoạt động · {maintenanceCount} bảo trì
          </p>
        </div>
      </div>

      {/* Search & Filter Panel */}
      <div style={{ maxWidth: 1200, margin: '-28px auto 0', padding: '0 16px', position: 'relative', zIndex: 10 }}>
        <div className="search-panel">
          {/* Search */}
          <div className="search-panel__input-wrap">
            <span className="search-panel__icon">🔍</span>
            <input
              type="text"
              placeholder="Tìm tên sân, địa chỉ, loại sân..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="search-panel__input"
              id="courts-search"
            />
          </div>

          {/* Filter chips */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginRight: 2 }}>Lọc:</span>
            {[
              { id: 'all', label: `Tất cả (${courts.length})` },
              { id: 'active', label: `✅ Trống (${activeCount})` },
              { id: 'maintenance', label: `🛠 Bảo trì (${maintenanceCount})` },
            ].map(tag => (
              <button
                key={tag.id}
                onClick={() => setFilterStatus(tag.id)}
                className={`filter-chip ${filterStatus === tag.id ? 'filter-chip--active' : ''}`}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Court List */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 16px 48px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="skeleton" style={{ height: 120, borderRadius: 14 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 20px', background: 'white', borderRadius: 16, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🏸</div>
            <h3 style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-primary)', marginBottom: 8 }}>Không tìm thấy sân phù hợp</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 300, margin: '0 auto 24px' }}>
              Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc để xem tất cả sân.
            </p>
            <button
              onClick={() => { setSearch(''); setFilterStatus('all'); }}
              className="btn btn-primary"
              style={{ borderRadius: 999 }}
            >
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 12 }}>
              Hiển thị {filtered.length}/{courts.length} sân
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map((court, idx) => {
                const isAvailable = court.status === 'active';
                return (
                  <div
                    key={court._id}
                    className="court-card-h"
                    style={{ animation: `fadeInUp 0.4s ease ${idx * 0.04}s both` }}
                  >
                    {/* Thumbnail */}
                    <div className="court-card-h__thumb" style={{ width: 130, minWidth: 130 }}>
                      <span style={{ position: 'relative', zIndex: 1, fontSize: 52 }}>🏸</span>
                      {!isAvailable && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ background: '#FF8F00', color: 'white', padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 800, textTransform: 'uppercase' }}>
                            🛠 Bảo trì
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Body */}
                    <div className="court-card-h__body" style={{ padding: '14px 16px' }}>
                      {/* Top: name + badge */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                            <h2 style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {court.name}
                            </h2>
                            {idx === 0 && <span className="badge badge-hot">🔥 Nổi bật</span>}
                          </div>
                          <p style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.5 }}>
                            📍 {court.description || 'Sân cầu lông tiêu chuẩn quốc tế, trang bị hiện đại'}
                          </p>
                        </div>
                        <span className={`badge ${isAvailable ? 'badge-active' : 'badge-maintenance'}`} style={{ flexShrink: 0 }}>
                          {isAvailable ? '● Trống' : '🛠 Bảo trì'}
                        </span>
                      </div>

                      {/* Meta info */}
                      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                        <span className="booking-meta-chip">⏰ 05:00 - 23:00</span>
                        <span className="booking-meta-chip">🏆 Tiêu chuẩn BWF</span>
                      </div>

                      {/* Bottom: price + CTA */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                        <div>
                          <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--primary)' }}>
                            {court.pricePerHour?.toLocaleString('vi-VN')}đ
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>/giờ</span>
                        </div>

                        {isAvailable ? (
                          user ? (
                            <Link
                              to={`/book/${court._id}`}
                              style={{ background: 'linear-gradient(135deg, #0D9D57, #1aaf64)', color: 'white', padding: '9px 22px', borderRadius: 999, fontSize: 13, fontWeight: 800, textDecoration: 'none', boxShadow: '0 4px 12px rgba(13,157,87,0.3)', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}
                            >
                              ĐẶT LỊCH
                            </Link>
                          ) : (
                            <Link
                              to="/login"
                              style={{ background: 'white', color: '#0D9D57', border: '2px solid #0D9D57', padding: '8px 20px', borderRadius: 999, fontSize: 13, fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap' }}
                            >
                              Đăng nhập đặt
                            </Link>
                          )
                        ) : (
                          <span style={{ background: '#f0f3f8', color: '#9ba6bb', padding: '8px 18px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'not-allowed' }}>
                            Tạm đóng cửa
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
