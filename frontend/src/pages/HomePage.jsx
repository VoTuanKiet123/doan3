import { Link } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import {
  Activity,
  Flame,
  Trophy,
  Star,
  Sparkles,
  Gift,
  Zap,
  Calendar,
  Award,
  Bell,
  ArrowRight,
  Clock,
  MapPin,
  Users,
} from 'lucide-react';
import { STATE_BADGE, fmtDateTime, fmtDate } from '../utils/events';

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
    cta: 'Xem giải đấu',
    ctaLink: '/events',
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
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [slide, setSlide] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    api.get('/courts')
      .then(res => {
        setCourts((res.data.courts || []).slice(0, 6));
        setLoading(false);
      })
      .catch(() => setLoading(false));

    api.get('/events')
      .then(res => {
        const list = res.data.events || [];
        // Ưu tiên giải đang mở đăng ký lên đầu, hiển thị tối đa 3 giải nổi bật
        const sorted = [...list].sort((a, b) => {
          const score = (s) => (s === 'open' ? 0 : s === 'closed_full' || s === 'closed_deadline' ? 1 : 2);
          return score(a.state) - score(b.state);
        });
        setEvents(sorted.slice(0, 3));
        setEventsLoading(false);
      })
      .catch(() => setEventsLoading(false));
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
            { n: courts.length || '6', label: 'Sân hoạt động' },
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
                            Sân {cType} ({cType === 'A' ? 'VIP 70k' : cType === 'B' ? 'Tiêu chuẩn 50k' : 'Tiết kiệm 30k'})
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

      {/* ── UPCOMING EVENTS / TOURNAMENTS ── */}
      {(eventsLoading || events.length > 0) && (
        <section className="home-container home-section" style={{ paddingTop: 0 }}>
          <div className="section-header">
            <div>
              <h2 className="section-title">Giải đấu &amp; Sự kiện nổi bật</h2>
              <p className="section-sub">Tham gia thi đấu giao lưu và tranh tài cùng cộng đồng</p>
            </div>
            <Link to="/events" className="section-link">Xem tất cả <ArrowRight size={14} /></Link>
          </div>

          {eventsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton" style={{ height: 260, borderRadius: 12 }} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {events.map((ev) => (
                <Link
                  key={ev._id}
                  to={`/events/${ev._id}`}
                  className="flex flex-col h-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md hover:border-emerald-400 transition"
                >
                  {ev.posterUrl ? (
                    <div className="h-40 w-full bg-gray-100 overflow-hidden shrink-0">
                      <img
                        src={ev.posterUrl}
                        alt={ev.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-40 w-full bg-gradient-to-br from-emerald-50 via-green-50 to-amber-50 flex flex-col items-center justify-center gap-1.5 border-b border-gray-100 shrink-0">
                      <Trophy size={34} className="text-emerald-600/40" />
                      <span className="text-xs font-medium text-emerald-800/50">
                        BadmintonHub Tournament
                      </span>
                    </div>
                  )}

                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-gray-900 text-sm line-clamp-2">{ev.name}</h3>
                      <span className={`shrink-0 text-[11px] px-2 py-0.5 rounded-full font-medium ${STATE_BADGE[ev.state]}`}>
                        {ev.stateLabel}
                      </span>
                    </div>

                    {ev.type?.name && (
                      <span className="inline-block w-fit mt-1.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                        {ev.type.name}
                      </span>
                    )}

                    <div className="mt-3 space-y-1 text-xs text-gray-600 flex-1">
                      <p>
                        <Clock size={13} className="inline mr-1 text-gray-400" />
                        {fmtDateTime(ev.startDate)}
                        {ev.endDate ? ` → ${fmtDate(ev.endDate)}` : ''}
                      </p>
                      {ev.court?.name && (
                        <p>
                          <MapPin size={13} className="inline mr-1 text-gray-400" />
                          {ev.court.name}
                        </p>
                      )}
                      <p>
                        <Users size={13} className="inline mr-1 text-gray-400" />
                        {ev.registeredCount}/{ev.maxRegistrations || '∞'} người đã đăng ký
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

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