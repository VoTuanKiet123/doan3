import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Search, Volleyball, Activity, Wrench, CheckCircle2, Sparkles, Zap, ShieldCheck, Trophy, MapPin } from 'lucide-react';

const COURT_TIERS = {
  A: {
    type: 'A',
    name: 'Sân A',
    subtitle: 'VIP Premium',
    price: 70000,
    priceFormatted: '70.000đ',
    badge: 'Cao Cấp Nhất',
    badgeBg: '#FEF3C7',
    badgeColor: '#B45309',
    headerBg: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    cardBorder: '#f59e0b',
    accentColor: '#f59e0b',
    tagColor: '#D97706',
    icon: <Sparkles size={22} style={{ color: '#f59e0b' }} />,
    services: [
      'Thảm Taraflex cao cấp thi đấu',
      'Đèn LED 800-1000 Lux chống lóa',
      'Điều hòa / Quạt mát công suất lớn',
      'Nước uống đóng chai miễn phí (2 chai)',
      'Wifi tốc độ cao miễn phí',
      'Dịch vụ lau thảm & Tủ đồ khóa từ'
    ]
  },
  B: {
    type: 'B',
    name: 'Sân B',
    subtitle: 'Tiêu Chuẩn BWF',
    price: 50000,
    priceFormatted: '50.000đ',
    badge: 'Phổ Biến Nhất',
    badgeBg: '#D1FAE5',
    badgeColor: '#047857',
    headerBg: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
    cardBorder: '#10b981',
    accentColor: '#10b981',
    tagColor: '#059669',
    icon: <Trophy size={22} style={{ color: '#10b981' }} />,
    services: [
      'Thảm cao su tiêu chuẩn BWF',
      'Đèn LED 600 Lux chống lóa',
      'Quạt mát công suất lớn & Ghế chờ',
      'Wifi miễn phí',
      'Nước giải khát bán kèm'
    ]
  },
  C: {
    type: 'C',
    name: 'Sân C',
    subtitle: 'Tiết Kiệm',
    price: 30000,
    priceFormatted: '30.000đ',
    badge: 'Tiết Kiệm Nhất',
    badgeBg: '#DBEAFE',
    badgeColor: '#1D4ED8',
    headerBg: 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)',
    cardBorder: '#3b82f6',
    accentColor: '#3b82f6',
    tagColor: '#2563EB',
    icon: <Zap size={22} style={{ color: '#3b82f6' }} />,
    services: [
      'Sàn acrylic / thảm cao su cơ bản',
      'Hệ thống đèn chiếu sáng tiêu chuẩn',
      'Quạt xoay & Ghế ngồi nghỉ',
      'Cây nước uống miễn phí tự phục vụ'
    ]
  }
};

export default function CourtsPage() {
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, A, B, C
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, maintenance
  const { user } = useAuth();

  useEffect(() => {
    api.get('/courts')
      .then(res => {
        setCourts(res.data.courts);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Helper function to get type for legacy courts
  const getCourtType = (court) => {
    const nameUpper = (court.name || '').toUpperCase();
    if (nameUpper.includes('A1') || nameUpper.includes('A2') || nameUpper.includes('SÂN A') || nameUpper.includes('SAN A')) return 'A';
    if (nameUpper.includes('B1') || nameUpper.includes('B2') || nameUpper.includes('SÂN B') || nameUpper.includes('SAN B')) return 'B';
    if (nameUpper.includes('C1') || nameUpper.includes('C2') || nameUpper.includes('SÂN C') || nameUpper.includes('SAN C')) return 'C';
    if (court.type && COURT_TIERS[court.type]) return court.type;
    if (court.pricePerHour >= 70000) return 'A';
    if (court.pricePerHour >= 50000) return 'B';
    return 'C';
  };

  const getCourtServices = (court) => {
    if (Array.isArray(court.services) && court.services.length > 0) {
      return court.services;
    }
    const cType = getCourtType(court);
    return COURT_TIERS[cType]?.services || [];
  };

  const filtered = courts.filter(c => {
    const cType = getCourtType(c);
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
                          (c.description && c.description.toLowerCase().includes(search.toLowerCase()));
    const matchesType = filterType === 'all' || cType === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="animate-fadeIn has-bottom-nav">
      {/* Page Header */}
      <div style={{ background: 'linear-gradient(135deg, #0D9D57 0%, #1aaf64 60%, #0a7a42 100%)', padding: '28px 16px 56px', position: 'relative' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 999, padding: '4px 14px', fontSize: 12, fontWeight: 700, color: 'white', marginBottom: 12 }}>
            <Volleyball size={14} /> Danh sách sân cầu lông
          </div>
          <h1 style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 900, color: 'white', marginBottom: 8 }}>
            Phân Loại Sân & Bảng Giá Dịch Vụ
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
            {courts.length} sân khả dụng · Sân A (70.000đ/h) · Sân B (50.000đ/h) · Sân C (30.000đ/h)
          </p>
        </div>
      </div>

      {/* ── 3-TIER COURT & SERVICE COMPARISON SECTION ── */}
      <div style={{ maxWidth: 1200, margin: '-32px auto 0', padding: '0 16px', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
          {Object.values(COURT_TIERS).map(tier => {
            const countInTier = courts.filter(c => getCourtType(c) === tier.type).length;
            const isSelected = filterType === tier.type;

            return (
              <div
                key={tier.type}
                onClick={() => setFilterType(isSelected ? 'all' : tier.type)}
                style={{
                  background: 'white',
                  borderRadius: 16,
                  border: isSelected ? `2.5px solid ${tier.cardBorder}` : '1px solid var(--border)',
                  boxShadow: isSelected ? `0 8px 24px ${tier.cardBorder}33` : '0 4px 16px rgba(0,0,0,0.05)',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Header tier card */}
                <div style={{ background: tier.headerBg, padding: '16px 20px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {tier.icon}
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '0.02em' }}>{tier.name}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{tier.subtitle}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: tier.cardBorder }}>{tier.priceFormatted}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>/ 1 Giờ</div>
                  </div>
                </div>

                {/* Sub-badge */}
                <div style={{ padding: '8px 20px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ background: tier.badgeBg, color: tier.badgeColor, padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 800 }}>
                    {tier.badge}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>
                    {countInTier} sân khả dụng
                  </span>
                </div>

                {/* Service list */}
                <div style={{ padding: '14px 20px 18px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                    {tier.services.map((srv, sIdx) => (
                      <div key={sIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, color: '#334155', fontWeight: 600, lineHeight: 1.4 }}>
                        <CheckCircle2 size={15} style={{ color: tier.tagColor, flexShrink: 0, marginTop: 1 }} />
                        <span>{srv}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    className="btn"
                    style={{
                      width: '100%',
                      padding: '8px 14px',
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 800,
                      background: isSelected ? tier.accentColor : '#f8fafc',
                      color: isSelected ? 'white' : '#475569',
                      border: isSelected ? 'none' : '1px solid #e2e8f0',
                      transition: 'all 0.2s',
                    }}
                  >
                    {isSelected ? '✓ Đang Lọc Loại Sân Này' : `Xem Danh Sách ${tier.name}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Search & Filter Panel */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px 16px', position: 'relative', zIndex: 10 }}>
        <div className="search-panel">
          {/* Search Input */}
          <div className="search-panel__input-wrap">
            <Search size={16} className="search-panel__icon" style={{ color: '#9ba6bb' }} />
            <input
              type="text"
              placeholder="Tìm tên sân, mô tả..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="search-panel__input"
              id="courts-search"
            />
          </div>

          {/* Filter chips by Court Type */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginRight: 2 }}>Loại sân:</span>
            {[
              { id: 'all', label: `Tất cả (${courts.length})` },
              { id: 'A', label: `Sân A (70k/h)` },
              { id: 'B', label: `Sân B (50k/h)` },
              { id: 'C', label: `Sân C (30k/h)` },
            ].map(tag => (
              <button
                key={tag.id}
                onClick={() => setFilterType(tag.id)}
                className={`filter-chip ${filterType === tag.id ? 'filter-chip--active' : ''}`}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Court List */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '8px 16px 48px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="skeleton" style={{ height: 140, borderRadius: 14 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 20px', background: 'white', borderRadius: 16, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><Activity size={56} className="text-slate-300" /></div>
            <h3 style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-primary)', marginBottom: 8 }}>Không tìm thấy sân phù hợp</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 320, margin: '0 auto 24px' }}>
              Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc để xem toàn bộ danh sách sân.
            </p>
            <button
              onClick={() => { setSearch(''); setFilterType('all'); }}
              className="btn btn-primary"
              style={{ borderRadius: 999 }}
            >
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 700 }}>
                Hiển thị {filtered.length}/{courts.length} sân cầu lông
              </p>
              {(filterType !== 'all' || search) && (
                <button
                  onClick={() => { setSearch(''); setFilterType('all'); }}
                  style={{ background: 'none', border: 'none', color: '#0D9D57', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  Xóa lọc ×
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {filtered.map((court, idx) => {
                const isAvailable = court.status !== 'inactive';
                const cType = getCourtType(court);
                const tierInfo = COURT_TIERS[cType] || COURT_TIERS.A;
                const courtServices = getCourtServices(court);

                return (
                  <div
                    key={court._id}
                    className="court-card-h"
                    style={{ animation: `fadeInUp 0.4s ease ${idx * 0.04}s both`, borderLeft: `5px solid ${tierInfo.cardBorder}` }}
                  >
                    {/* Thumbnail */}
                    <div className="court-card-h__thumb" style={{ width: 140, minWidth: 140, background: tierInfo.headerBg }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', textAlign: 'center' }}>
                        {tierInfo.icon}
                        <span style={{ fontSize: 16, fontWeight: 900, marginTop: 4 }}>{tierInfo.name}</span>
                        <span style={{ fontSize: 11, opacity: 0.85, fontWeight: 700 }}>{tierInfo.priceFormatted}/h</span>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="court-card-h__body" style={{ padding: '16px 18px' }}>
                      {/* Top: Name & Badges */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                            <h2 style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>
                              {court.name}
                            </h2>
                            <span style={{ background: tierInfo.badgeBg, color: tierInfo.badgeColor, padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 800 }}>
                              Loại {tierInfo.name} ({tierInfo.priceFormatted}/h)
                            </span>
                          </div>
                          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                            <MapPin size={12} style={{ display: 'inline', marginRight: 4, color: '#64748b' }} />
                            {court.description || 'Sân cầu lông chất lượng cao với đầy đủ trang thiết bị tiêu chuẩn'}
                          </p>
                        </div>
                        <span className="badge badge-active" style={{ flexShrink: 0 }}>
                          ● Khả dụng
                        </span>
                      </div>

                      {/* Services list tags */}
                      <div style={{ margin: '8px 0 12px' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <ShieldCheck size={12} style={{ color: tierInfo.tagColor }} /> Dịch vụ bao gồm trong giá thuê:
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {courtServices.map((srv, sKey) => (
                            <span
                              key={sKey}
                              style={{
                                background: '#f1f5f9',
                                color: '#334155',
                                border: '1px solid #e2e8f0',
                                padding: '3px 9px',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                            >
                              <CheckCircle2 size={11} style={{ color: tierInfo.tagColor }} /> {srv}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Bottom bar: Price + Action CTA */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                          <span style={{ fontSize: 22, fontWeight: 900, color: tierInfo.tagColor }}>
                            {(court.pricePerHour || tierInfo.price)?.toLocaleString('vi-VN')}đ
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>/ giờ</span>
                        </div>

                        {isAvailable ? (
                          user ? (
                            <Link
                              to={`/book/${court._id}`}
                              style={{ background: 'linear-gradient(135deg, #0D9D57, #1aaf64)', color: 'white', padding: '9px 24px', borderRadius: 999, fontSize: 13, fontWeight: 800, textDecoration: 'none', boxShadow: '0 4px 12px rgba(13,157,87,0.3)', display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
                            >
                              ĐẶT LỊCH NGAY →
                            </Link>
                          ) : (
                            <Link
                              to="/login"
                              style={{ background: 'white', color: '#0D9D57', border: '2px solid #0D9D57', padding: '8px 20px', borderRadius: 999, fontSize: 13, fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap' }}
                            >
                              Đăng nhập đặt sân
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
