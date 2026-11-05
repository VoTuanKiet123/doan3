import { Link } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import { Activity, Flame, Trophy, Star, Sparkles, Gift, Zap, Calendar, Award, Bell, ArrowRight } from 'lucide-react';

const BANNER_SLIDES = [
  {
    id: 1,
    bg: '#0b5e37',
    emoji: <Activity size={40} />,
    tag: <><Flame size={14} style={{ marginRight: 4 }} /> Ra mắt tính năng mới</>,
    title: 'Đặt sân cầu lông dễ dàng & nhanh chóng',
    desc: 'Tìm kiếm và đặt sân trong 30 giây. Hệ thống đặt sân thông minh, tự động xác nhận lịch ngay tức khắc.',
    cta: 'Đặt sân ngay',
    ctaLink: '/courts',
    accent: '#fff',
  },
  {
    id: 2,
    bg: '#14427a',
    emoji: <Trophy size={40} />,
    tag: <><Star size={14} style={{ marginRight: 4 }} /> Tiêu chuẩn BWF quốc tế</>,
    title: 'Sân đạt chuẩn quốc tế BWF',
    desc: 'Hệ thống sàn PVC chuyên dụng 5 lớp, đèn LED chống lóa chuẩn BWF. Trải nghiệm thi đấu đỉnh cao.',
    cta: 'Xem sân ngay',
    ctaLink: '/courts',
    accent: '#fff',
  },
  {
    id: 3,
    bg: '#8f3a0c',
    emoji: <Sparkles size={40} />,
    tag: <><Gift size={14} style={{ marginRight: 4 }} /> Ưu đãi thành viên</>,
    title: 'Đăng ký tài khoản, nhận ưu đãi ngay',
    desc: 'Thành viên mới được đặt sân ưu tiên, nhận thông báo sân trống và quản lý lịch tập tiện lợi.',
    cta: 'Đăng ký miễn phí',
    ctaLink: '/register',
    accent: '#fff',
  },
];

const FEATURES = [
  { icon: <Zap size={24} />, title: 'Đặt sân trong 30 giây', desc: 'Chọn sân, chọn giờ, xác nhận. Chỉ 3 bước đơn giản trên điện thoại.' },
  { icon: <Calendar size={24} />, title: 'Quản lý lịch linh hoạt', desc: 'Xem, hủy và theo dõi lịch đặt sân cực kỳ tiện lợi.' },
  { icon: <Award size={24} />, title: 'Chuẩn BWF quốc tế', desc: 'Sàn PVC 5 lớp, đèn LED chống lóa bảo vệ mắt tối ưu.' },
  { icon: <Bell size={24} />, title: 'Thông báo tức thì', desc: 'Nhận thông báo xác nhận lịch ngay sau khi đặt sân.' },
];

export default function HomePage() {
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slide, setSlide] = useState(0);
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
        className="hero-banner home-hero"
        style={{ background: current.bg }}
        key={current.id}
      >
        <div className="home-hero-inner">
          {/* Content */}
          <div className="home-hero-text">
            <h1 className="home-hero-title">{current.title}</h1>
            <p className="home-hero-desc">{current.desc}</p>
            <div className="home-hero-actions">
              <Link to={current.ctaLink} className="btn btn-white home-btn-lg">
                {current.cta} <ArrowRight size={16} />
              </Link>
              <Link to="/courts" className="btn home-btn-ghost home-btn-lg">
                Xem tất cả sân
              </Link>
            </div>
            <p className="home-hero-tag">{current.tag}</p>
          </div>

          {/* Court diagram */}
          <div className="home-hero-art" aria-hidden="true">
            <CourtDiagram />
            <span className="home-hero-art-icon">{current.emoji}</span>
          </div>
        </div>

        {/* Dots */}
        <div className="banner-dots home-dots">
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
      <div className="home-container">
        <div className="stats-row home-stats">
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
      <section className="home-container home-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Sân đang khả dụng</h2>
            <p className="section-sub">Chọn sân và đặt lịch tập ngay hôm nay</p>
          </div>
          <Link to="/courts" className="section-link">Xem tất cả <ArrowRight size={14} /></Link>
        </div>

        {loading ? (
          <div className="home-court-list">
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 112, borderRadius: 12 }} />)}
          </div>
        ) : courts.length === 0 ? (
          <div className="home-empty">
            <Activity size={40} className="text-slate-300" />
            <p>Chưa có sân nào. Vui lòng đăng nhập Admin để thêm sân.</p>
          </div>
        ) : (
          <div className="home-court-list">
            {courts.map((court) => {
              const isAvail = court.status === 'active';
              const cType = court.type || (court.pricePerHour >= 70000 ? 'A' : (court.pricePerHour >= 50000 ? 'B' : 'C'));
              return (
                <div key={court._id} className="court-card-h">
                  {/* Thumbnail */}
                  <div className="court-card-h__thumb">
                    <CourtDiagram small />
                    <span className="home-court-letter">{cType}</span>
                  </div>

                  {/* Body */}
                  <div className="court-card-h__body">
                    <div className="home-court-head">
                      <div style={{ minWidth: 0 }}>
                        <div className="home-court-name-row">
                          <h3 className="home-court-name">{court.name}</h3>
                          <span className={`badge ${cType === 'A' ? 'badge-hot' : cType === 'B' ? 'badge-active' : 'badge-inactive'}`}>
                            Sân {cType} ({cType === 'A' ? 'VIP 70k' : cType === 'B' ? 'Standard 50k' : 'Eco 30k'})
                          </span>
                        </div>
                        <p className="home-court-desc">
                          {court.description || 'Sân cầu lông tiêu chuẩn, trang thiết bị hiện đại'}
                        </p>
                      </div>
                      {isAvail ? (
                        <span className="badge badge-active" style={{ flexShrink: 0 }}>● Khả dụng</span>
                      ) : (
                        <span className="badge badge-inactive" style={{ flexShrink: 0 }}>Tạm đóng</span>
                      )}
                    </div>

                    <div className="home-court-foot">
                      <div className="home-court-price">
                        <strong>{court.pricePerHour?.toLocaleString('vi-VN')}đ</strong>
                        <span>/giờ</span>
                      </div>

                      {isAvail ? (
                        <Link to={`/book/${court._id}`} className="btn btn-primary">
                          Đặt lịch
                        </Link>
                      ) : (
                        <span className="btn home-btn-disabled" aria-disabled="true">
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

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Link to="/courts" className="btn btn-outline home-btn-lg">
            Xem tất cả sân cầu lông <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── WHY CHOOSE US ── */}
      <section className="home-why">
        <div className="home-container home-why-inner">
          <div className="home-why-head">
            <h2 className="home-why-title">Tại sao chọn BadmintonHub?</h2>
            <p className="home-why-sub">Trải nghiệm đặt sân chuyên nghiệp và tiện lợi nhất.</p>
          </div>
          <ul className="home-why-list">
            {FEATURES.map(f => (
              <li key={f.title} className="home-why-item">
                <span className="home-why-icon">{f.icon}</span>
                <div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="home-container home-section">
        <div className="home-cta">
          <div>
            <h2 className="home-cta-title">Đăng ký tài khoản miễn phí</h2>
            <p className="home-cta-desc">
              Tham gia ngay để đặt sân ưu tiên, nhận thông báo sân trống và quản lý lịch tập cực kỳ tiện lợi.
            </p>
          </div>
          <div className="home-hero-actions">
            <Link to="/register" className="btn btn-white home-btn-lg">
              Đăng ký ngay <Sparkles size={15} />
            </Link>
            <Link to="/courts" className="btn home-btn-ghost home-btn-lg">
              Xem sân ngay
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/* Sơ đồ sân cầu lông (13,4m x 6,1m), vẽ bằng SVG */
function CourtDiagram({ small = false }) {
  return (
    <svg
      className={small ? 'court-diagram court-diagram--small' : 'court-diagram'}
      viewBox="0 0 134 61"
      fill="none"
      stroke="currentColor"
      strokeWidth={small ? 1.6 : 0.7}
    >
      <rect x="1" y="1" width="132" height="59" />
      <line x1="1" y1="5.6" x2="133" y2="5.6" />
      <line x1="1" y1="55.4" x2="133" y2="55.4" />
      <line x1="8.6" y1="1" x2="8.6" y2="60" />
      <line x1="125.4" y1="1" x2="125.4" y2="60" />
      <line x1="47.2" y1="1" x2="47.2" y2="60" />
      <line x1="86.8" y1="1" x2="86.8" y2="60" />
      <line x1="1" y1="30.5" x2="47.2" y2="30.5" />
      <line x1="86.8" y1="30.5" x2="133" y2="30.5" />
      <line x1="67" y1="-2" x2="67" y2="63" strokeWidth={small ? 2.4 : 1.4} />
    </svg>
  );
}
