import { Link } from 'react-router-dom';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-grid">
        {/* Brand */}
        <div>
          <div className="footer-brand-logo">
            <div className="footer-brand-icon">🏸</div>
            <span className="footer-brand-name">
              Badminton<span>Hub</span>
            </span>
          </div>
          <p className="footer-brand-desc">
            Nền tảng đặt sân cầu lông trực tuyến hàng đầu. Trải nghiệm đặt sân nhanh chóng, tiện lợi và an toàn mọi lúc mọi nơi.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            {['facebook', 'tiktok', 'zalo'].map(s => (
              <div key={s} style={{ width: 36, height: 36, borderRadius: 8, background: '#2a3040', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                {s === 'facebook' ? '📘' : s === 'tiktok' ? '🎵' : '💬'}
              </div>
            ))}
          </div>
        </div>

        {/* Links: Khám phá */}
        <div>
          <h4 className="footer-col-title">Khám Phá</h4>
          <div className="footer-links">
            <Link to="/" className="footer-link">🏠 Trang chủ</Link>
            <Link to="/courts" className="footer-link">🏸 Danh sách sân</Link>
            <Link to="/my-bookings" className="footer-link">📅 Lịch đặt của tôi</Link>
            <Link to="/register" className="footer-link">✨ Đăng ký miễn phí</Link>
          </div>
        </div>

        {/* Hỗ trợ */}
        <div>
          <h4 className="footer-col-title">Hỗ Trợ</h4>
          <div className="footer-links">
            <a href="#" className="footer-link">❓ Câu hỏi thường gặp</a>
            <a href="#" className="footer-link">📞 Liên hệ hỗ trợ</a>
            <a href="#" className="footer-link">🔒 Chính sách bảo mật</a>
            <a href="#" className="footer-link">📋 Điều khoản sử dụng</a>
          </div>
        </div>

        {/* Liên hệ */}
        <div>
          <h4 className="footer-col-title">Liên Hệ</h4>
          <div className="footer-links">
            <span className="footer-link">📍 TP. Hồ Chí Minh, Việt Nam</span>
            <span className="footer-link">📞 0901 234 567</span>
            <span className="footer-link">✉️ support@badmintonhub.vn</span>
            <span className="footer-link">⏰ 05:00 – 23:00 hàng ngày</span>
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
