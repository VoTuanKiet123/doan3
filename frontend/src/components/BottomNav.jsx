import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, Volleyball, CalendarCheck, User, Activity } from 'lucide-react';

export default function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path) => location.pathname === path;

  return (
    <div className="bottom-nav">
      {/* Trang chủ */}
      <Link to="/" className={`bottom-nav-item ${isActive('/') ? 'bottom-nav-item--active' : ''}`}>
        <span className="bottom-nav-icon"><Home size={22} strokeWidth={isActive('/') ? 2.5 : 1.8} /></span>
        <span className="bottom-nav-label" style={{ color: isActive('/') ? '#0D9D57' : undefined }}>Trang chủ</span>
      </Link>

      {/* Sân */}
      <Link to="/courts" className={`bottom-nav-item ${isActive('/courts') ? 'bottom-nav-item--active' : ''}`}>
        <span className="bottom-nav-icon"><Volleyball size={22} strokeWidth={isActive('/courts') ? 2.5 : 1.8} /></span>
        <span className="bottom-nav-label" style={{ color: isActive('/courts') ? '#0D9D57' : undefined }}>Sân</span>
      </Link>

      {/* Center: Đặt Ngay */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
        <Link to="/courts" className="bottom-nav-center-btn" aria-label="Đặt sân ngay">
          <Activity size={22} className="text-white" />
        </Link>
        <span className="bottom-nav-label" style={{ marginTop: 2 }}>Đặt ngay</span>
      </div>

      {/* Lịch đặt */}
      {user ? (
        <Link to="/my-bookings" className={`bottom-nav-item ${isActive('/my-bookings') ? 'bottom-nav-item--active' : ''}`}>
          <span className="bottom-nav-icon"><CalendarCheck size={22} strokeWidth={isActive('/my-bookings') ? 2.5 : 1.8} /></span>
          <span className="bottom-nav-label" style={{ color: isActive('/my-bookings') ? '#0D9D57' : undefined }}>Lịch đặt</span>
        </Link>
      ) : (
        <Link to="/login" className="bottom-nav-item">
          <span className="bottom-nav-icon"><CalendarCheck size={22} strokeWidth={1.8} /></span>
          <span className="bottom-nav-label">Lịch đặt</span>
        </Link>
      )}

      {/* Tài khoản */}
      {user ? (
        <Link to="/my-bookings" className="bottom-nav-item">
          <span className="bottom-nav-icon"><User size={22} strokeWidth={1.8} /></span>
          <span className="bottom-nav-label">Tài khoản</span>
        </Link>
      ) : (
        <Link to="/login" className={`bottom-nav-item ${isActive('/login') ? 'bottom-nav-item--active' : ''}`}>
          <span className="bottom-nav-icon"><User size={22} strokeWidth={isActive('/login') ? 2.5 : 1.8} /></span>
          <span className="bottom-nav-label" style={{ color: isActive('/login') ? '#0D9D57' : undefined }}>Tài khoản</span>
        </Link>
      )}
    </div>
  );
}
