import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import api from '../services/api';

const BANNER_SLIDES = [
  {
    id: 1,
    bg: 'linear-gradient(135deg, #0D9D57 0%, #1aaf64 40%, #0a7a42 100%)',
    emoji: '🏸',
    tag: '🔥 Ra mắt tính năng mới',
    title: 'Đặt Sân Cầu Lông\nDễ Dàng & Nhanh Chóng',
    desc: 'Tìm kiếm và đặt sân trong 30 giây. Hệ thống đặt sân thông minh, tự động xác nhận lịch ngay tức khắc.',
    cta: 'Đặt Sân Ngay',
    ctaLink: '/courts',
    accent: '#fff',
  },
  {
    id: 2,
    bg: 'linear-gradient(135deg, #1565C0 0%, #1976D2 50%, #0D47A1 100%)',
    emoji: '🏆',
    tag: '⭐ Tiêu chuẩn BWF quốc tế',
    title: 'Sân Đạt Chuẩn Quốc Tế\nChất Lượng Tuyệt Vời',
    desc: 'Hệ thống sàn PVC chuyên dụng 5 lớp, đèn LED chống lóa chuẩn BWF. Trải nghiệm thi đấu đỉnh cao.',
    cta: 'Xem Sân Ngay',
    ctaLink: '/courts',
    accent: '#fff',
  },
  {
    id: 3,
    bg: 'linear-gradient(135deg, #E65100 0%, #FF6D00 50%, #F57C00 100%)',
    emoji: '💎',
    tag: '🎁 Ưu đãi thành viên',
    title: 'Đăng Ký Tài Khoản\nNhận Ưu Đãi Ngay',
    desc: 'Thành viên mới được đặt sân ưu tiên, nhận thông báo sân trống và quản lý lịch tập tiện lợi.',
    cta: 'Đăng Ký Miễn Phí',
    ctaLink: '/register',
    accent: '#fff',
  },
];

const FEATURES = [
  { icon: '⚡', title: 'Đặt Sân 30 Giây', desc: 'Chọn sân, chọn giờ, xác nhận. Chỉ 3 bước đơn giản trên điện thoại.' },
  { icon: '📅', title: 'Quản Lý Lịch Linh Hoạt', desc: 'Xem, hủy và theo dõi lịch đặt sân cực kỳ tiện lợi.' },
  { icon: '💎', title: 'Chuẩn BWF Quốc Tế', desc: 'Sàn PVC 5 lớp, đèn LED chống lóa bảo vệ mắt tối ưu.' },
  { icon: '🔔', title: 'Thông Báo Tức Thì', desc: 'Nhận thông báo xác nhận lịch ngay sau khi đặt sân.' },
];

export default function HomePage() {
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slide, setSlide] = useState(0);
  const navigate = useNavigate();
  const timerRef = useRef(null);

  useEffect(() => {
    api.get('/courts')
      .then(res => {
        setCourts(res.data.courts.slice(0, 6));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Auto-advance carousel
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSlide(s => (s + 1) % BANNER_SLIDES.length);
    }, 4000);
    return () => clearInterval(timerRef.current);
  }, []);

  const goSlide = (idx) => {
    setSlide(idx);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSlide(s => (s + 1) % BANNER_SLIDES.length);
    }, 4000);
  };

  const current = BANNER_SLIDES[slide];

  return (
    <div className="animate-fadeIn has-bottom-nav">

      {/* ── BANNER CAROUSEL ── */}
      <section
        className="hero-banner"
        style={{ background: current.bg, transition: 'background 0.6s ease', minHeight: 240 }}
        key={current.id}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px 32px', display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
          {/* Content */}
          <div style={{ flex: 1, minWidth: 260, animation: 'fadeInUp 0.5s ease' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 999, padding: '4px 14px', fontSize: 12, fontWeight: 700, color: 'white', marginBottom: 14 }}>
              {current.tag}
            </span>
            <h1 style={{ fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 900, color: 'white', lineHeight: 1.25, marginBottom: 12, whiteSpace: 'pre-line' }}>
              {current.title}
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, marginBottom: 24, maxWidth: 440 }}>
              {current.desc}
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link
                to={current.ctaLink}
                style={{ background: 'white', color: '#0D9D57', padding: '12px 28px', borderRadius: 999, fontWeight: 800, fontSize: 14, textDecoration: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {current.cta} →
              </Link>
              <Link
                to="/courts"
                style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1.5px solid rgba(255,255,255,0.4)', padding: '12px 24px', borderRadius: 999, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}
              >
                Xem tất cả sân
              </Link>
            </div>
          </div>

          {/* Emoji illustration */}
          <div style={{ fontSize: 120, lineHeight: 1, animation: 'float 3s ease-in-out infinite', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 140 }}>
            {current.emoji}
          </div>
        </div>

        {/* Dots */}
        <div className="banner-dots">
          {BANNER_SLIDES.map((_, i) => (
            <button
              key={i}
              className={`banner-dot ${i === slide ? 'banner-dot--active' : ''}`}
              onClick={() => goSlide(i)}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </section>

      {/* ── QUICK STATS ── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px' }}>
        <div className="stats-row" style={{ marginTop: -1, borderRadius: '0 0 16px 16px' }}>
          {[
            { n: courts.length || '10+', label: 'Sân hoạt động' },
            { n: '1,200+', label: 'Lượt đặt sân' },
            { n: '4.9★', label: 'Đánh giá trung bình' },
          ].map(s => (
            <div key={s.label} className="stat-item">
              <div className="stat-number">{s.n}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURED COURTS ── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 16px 8px' }}>
        <div className="section-header">
          <h2 className="section-title">🏸 Sân Đang Khả Dụng</h2>
          <Link to="/courts" className="section-link">Xem tất cả →</Link>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 16, marginTop: -4 }}>
          Chọn sân và đặt lịch tập ngay hôm nay
        </p>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 110, borderRadius: 14 }} />)}
          </div>
        ) : courts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', background: 'white', borderRadius: 16, border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏸</div>
            <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Chưa có sân nào. Vui lòng đăng nhập Admin để thêm sân.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {courts.map((court, idx) => {
              const isAvail = court.status === 'active';
              return (
                <div key={court._id} className="court-card-h" style={{ animationDelay: `${idx * 0.05}s` }}>
                  {/* Thumbnail */}
                  <div className="court-card-h__thumb">
                    <span style={{ position: 'relative', zIndex: 1, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>🏸</span>
                    {!isAvail && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ background: '#FF8F00', color: 'white', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>BẢO TRÌ</span>
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="court-card-h__body">
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                      <div>
                        <h3 style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)', marginBottom: 2 }}>
                          {court.name}
                        </h3>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, WebkitLineClamp: 2, overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical' }}>
                          {court.description || '📍 Sân cầu lông tiêu chuẩn, trang thiết bị hiện đại'}
                        </p>
                      </div>
                      <span className={`badge ${isAvail ? 'badge-active' : 'badge-maintenance'}`} style={{ flexShrink: 0 }}>
                        {isAvail ? '● Trống' : '🛠 Bảo trì'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--primary)', fontFamily: 'Nunito, sans-serif' }}>
                          {court.pricePerHour?.toLocaleString('vi-VN')}đ
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>/giờ</span>
                      </div>

                      {isAvail ? (
                        <Link
                          to={`/book/${court._id}`}
                          style={{ background: 'linear-gradient(135deg, #0D9D57, #1aaf64)', color: 'white', padding: '8px 20px', borderRadius: 999, fontSize: 13, fontWeight: 800, textDecoration: 'none', boxShadow: '0 4px 12px rgba(13,157,87,0.3)', transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          ĐẶT LỊCH
                        </Link>
                      ) : (
                        <span style={{ background: '#f0f3f8', color: '#9ba6bb', padding: '8px 16px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'not-allowed' }}>
                          Tạm đóng
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link to="/courts" className="btn btn-outline" style={{ padding: '12px 32px', borderRadius: 999, fontSize: 14 }}>
            Xem tất cả sân cầu lông →
          </Link>
        </div>
      </section>

      {/* ── WHY CHOOSE US ── */}
      <section style={{ background: 'white', marginTop: 32, padding: '40px 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h2 className="section-title" style={{ fontSize: 22, marginBottom: 6 }}>🌟 Tại Sao Chọn BadmintonHub?</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
              Trải nghiệm đặt sân chuyên nghiệp và tiện lợi nhất
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {FEATURES.map(f => (
              <div key={f.title} className="feature-card">
                <div className="feature-icon">{f.icon}</div>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 16px 48px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #0D9D57 0%, #1aaf64 50%, #0a7a42 100%)',
          borderRadius: 20,
          padding: '36px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
          flexWrap: 'wrap',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, background: 'rgba(255,255,255,0.06)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', bottom: -30, left: 100, width: 120, height: 120, background: 'rgba(255,255,255,0.04)', borderRadius: '50%' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              🎾 Bắt Đầu Ngay Hôm Nay
            </div>
            <h2 style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 900, color: 'white', marginBottom: 8 }}>
              Đăng Ký Tài Khoản Miễn Phí
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', maxWidth: 420, lineHeight: 1.6 }}>
              Tham gia ngay để đặt sân ưu tiên, nhận thông báo sân trống và quản lý lịch tập cực kỳ tiện lợi.
            </p>
          </div>
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link to="/register" className="btn btn-white" style={{ padding: '12px 28px', borderRadius: 999, fontSize: 14, fontWeight: 800 }}>
              Đăng Ký Ngay ✨
            </Link>
            <Link to="/courts" style={{ padding: '12px 24px', border: '2px solid rgba(255,255,255,0.5)', color: 'white', borderRadius: 999, fontSize: 14, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              Xem sân ngay
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
