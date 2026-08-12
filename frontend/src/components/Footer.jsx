import { Link } from 'react-router-dom';
import { Activity, Music, MessageCircle, Home, Volleyball, Calendar, Sparkles, HelpCircle, Phone, Lock, FileText, MapPin, Mail, Clock } from 'lucide-react';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-grid">
        {/* Brand */}
        <div>
          <div className="footer-brand-logo">
            <div className="footer-brand-icon">
              <Activity size={20} className="text-white" />
            </div>
            <span className="footer-brand-name">
              Badminton<span>Hub</span>
            </span>
          </div>
          <p className="footer-brand-desc">
            Nền tảng đặt sân cầu lông trực tuyến hàng đầu. Trải nghiệm đặt sân nhanh chóng, tiện lợi và an toàn mọi lúc mọi nơi.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              {
                id: 'facebook',
                icon: (
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                )
              },
              { id: 'tiktok', icon: <Music size={18} /> },
              { id: 'zalo', icon: <MessageCircle size={18} /> }
            ].map(s => (
              <div key={s.id} style={{ width: 36, height: 36, borderRadius: 8, background: '#2a3040', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ba6bb' }}>
                {s.icon}
              </div>
            ))}
          </div>
        </div>

        {/* Links: Khám phá */}
        <div>
          <h4 className="footer-col-title">Khám Phá</h4>
          <div className="footer-links">
            <Link to="/" className="footer-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Home size={14} /> Trang chủ
            </Link>
            <Link to="/courts" className="footer-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Volleyball size={14} /> Danh sách sân
            </Link>
            <Link to="/my-bookings" className="footer-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={14} /> Lịch đặt của tôi
            </Link>
            <Link to="/register" className="footer-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={14} /> Đăng ký miễn phí
            </Link>
          </div>
        </div>

        {/* Hỗ trợ */}
        <div>
          <h4 className="footer-col-title">Hỗ Trợ</h4>
          <div className="footer-links">
            <a href="#" className="footer-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <HelpCircle size={14} /> Câu hỏi thường gặp
            </a>
            <a href="#" className="footer-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Phone size={14} /> Liên hệ hỗ trợ
            </a>
            <a href="#" className="footer-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Lock size={14} /> Chính sách bảo mật
            </a>
            <a href="#" className="footer-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <FileText size={14} /> Điều khoản sử dụng
            </a>
          </div>
        </div>

        {/* Liên hệ */}
        <div>
          <h4 className="footer-col-title">Liên Hệ</h4>
          <div className="footer-links">
            <span className="footer-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <MapPin size={14} /> TP. Hồ Chí Minh, Việt Nam
            </span>
            <span className="footer-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Phone size={14} /> 0901 234 567
            </span>
            <span className="footer-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Mail size={14} /> support@badmintonhub.vn
            </span>
            <span className="footer-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Clock size={14} /> 05:00 – 23:00 hàng ngày
            </span>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p className="footer-copyright">
          © {year} BadmintonHub. Thiết kế với ❤️ cho cộng đồng cầu lông Việt Nam.
        </p>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href="#" className="footer-link" style={{ fontSize: 11 }}>Chính sách bảo mật</a>
          <a href="#" className="footer-link" style={{ fontSize: 11 }}>Điều khoản</a>
          <a href="#" className="footer-link" style={{ fontSize: 11 }}>Sitemap</a>
        </div>
      </div>
    </footer>
  );
}
