import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Menu,
  X,
  Home,
  Volleyball,
  CalendarDays,
  Settings,
  LogOut,
  Activity,
  Star,
  Wrench,
  Trophy,
} from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const { user, logout, isAdmin, isPosStaff } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
    setMenuOpen(false);
  };

  const closeMenu = () => setMenuOpen(false);
  const isActive = (path) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname === path || location.pathname.startsWith(`${path}/`);

  const navLinks = [
    { path: "/", label: "Trang chủ", icon: <Home size={16} /> },
    { path: "/courts", label: "Sân cầu lông", icon: <Volleyball size={16} /> },
    { path: "/events", label: "Giải đấu", icon: <Trophy size={16} /> },
    ...(user
      ? [
          {
            path: "/my-bookings",
            label: "Lịch của tôi",
            icon: <CalendarDays size={16} />,
          },
          {
            path: "/my-registrations",
            label: "Giải của tôi",
            icon: <Trophy size={16} />,
          },
          { path: "/reviews", label: "Đánh giá", icon: <Star size={16} /> },
        ]
      : []),
    ...(!isAdmin && !isPosStaff
      ? [{ path: "/racket-service", label: "Sửa vợt", icon: <Wrench size={16} /> }]
      : []),
    ...(isAdmin
      ? [{ path: "/admin", label: "Quản trị", icon: <Settings size={16} /> }]
      : []),
    ...(isPosStaff
      ? [{ path: "/pos", label: "POS Bán hàng", icon: <Activity size={16} /> }]
      : []),
  ];

  return (
    <nav className={`alob-header ${user ? "alob-header--auth" : ""}`}>
      <div
        className="alob-header-top"
        style={{ maxWidth: "1400px", width: "100%", gap: "16px" }}
      >
        {/* Logo */}
        <Link
          to="/"
          className="alob-header-logo"
          onClick={closeMenu}
          style={{ flexShrink: 0 }}
        >
          <div className="alob-header-logo-icon">
            <Activity size={20} />
          </div>
          <div className="alob-header-logo-text">
            <span className="alob-header-logo-title">BadmintonHub</span>
            <span className="alob-header-logo-sub">Đặt sân online</span>
          </div>
        </Link>

        {/* Links (desktop) */}
        <div
          className="alob-nav-links"
          style={{ flex: 1, justifyContent: "center", gap: "4px", overflow: "visible" }}
        >
          {navLinks.map(({ path, label, icon }) => (
            <Link
              key={path}
              to={path}
              className={`alob-nav-link ${isActive(path) ? "alob-nav-link--active" : ""}`}
              aria-current={isActive(path) ? "page" : undefined}
              style={{ whiteSpace: "nowrap", flexShrink: 0 }}
            >
              {icon}
              {label}
            </Link>
          ))}
        </div>

        {/* Auth */}
        <div className="alob-header-actions" style={{ flexShrink: 0 }}>
          {user ? (
            <div className="alob-header-user">
              <div className="alob-header-avatar" aria-hidden="true">
                {user.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <span className="alob-header-username">{user.name}</span>
              <button
                onClick={handleLogout}
                className="alob-header-logout"
                aria-label="Đăng xuất"
              >
                <LogOut size={15} />
                <span className="alob-header-logout-label">Đăng xuất</span>
              </button>
            </div>
          ) : (
            <div className="alob-header-guest">
              <Link
                to="/login"
                className="alob-header-btn alob-header-btn-login"
                onClick={closeMenu}
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="alob-header-btn alob-header-btn-register"
                onClick={closeMenu}
              >
                Đăng ký
              </Link>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            className="alob-menu-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="alob-mobile-menu">
          {navLinks.map(({ path, label, icon }) => (
            <Link
              key={path}
              to={path}
              className={`alob-mobile-link ${isActive(path) ? "alob-mobile-link--active" : ""}`}
              onClick={closeMenu}
            >
              {icon}
              {label}
            </Link>
          ))}
          {!user && (
            <div className="alob-mobile-auth">
              <Link to="/login" onClick={closeMenu} className="btn btn-outline">
                Đăng nhập
              </Link>
              <Link
                to="/register"
                onClick={closeMenu}
                className="btn btn-primary"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}