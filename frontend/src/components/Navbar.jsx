import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Menu,
  X,
  Home,
  Volleyball,
  CalendarDays,
  Settings,
  User,
  LogOut,
  Calendar,
  Activity,
} from "lucide-react";
import { useState, useEffect } from "react";

function getDayLabel() {
  const now = new Date();
  const days = [
    "Chủ Nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
  ];
  const d = days[now.getDay()];
  const date = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  return `${d}, ${date}/${month}/${year}`;
}

export default function Navbar() {
  const { user, logout, isAdmin, isPosStaff } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dateLabel, setDateLabel] = useState(getDayLabel());

  useEffect(() => {
    const timer = setInterval(() => setDateLabel(getDayLabel()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
    setMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { path: "/", label: "Trang chủ", icon: <Home size={15} /> },
    { path: "/courts", label: "Sân cầu lông", icon: <Volleyball size={15} /> },
    ...(user
      ? [
          {
            path: "/my-bookings",
            label: "Lịch của tôi",
            icon: <CalendarDays size={15} />,
          },
        ]
      : []),
    ...(isAdmin
      ? [{ path: "/admin", label: "Quản trị", icon: <Settings size={15} /> }]
      : []),
    ...(isPosStaff
      ? [{ path: "/pos", label: "POS Bán hàng", icon: <Activity size={15} /> }]
      : []),
  ];

  return (
    <nav className="alob-header">
      {/* Top row: Logo | Date | Auth buttons */}
      <div
        className="alob-header-top"
        style={{ maxWidth: 1200, margin: "0 auto" }}
      >
        {/* Logo */}
        <Link
          to="/"
          className="alob-header-logo"
          onClick={() => setMenuOpen(false)}
        >
          <div className="alob-header-logo-icon">
            <Activity size={24} className="text-white animate-pulse" />
          </div>
          <div className="alob-header-logo-text">
            <span className="alob-header-logo-title">BadmintonHub</span>
            <span className="alob-header-logo-sub">Đặt sân Online</span>
          </div>
        </Link>

        {/* Date (center, hidden on mobile) */}
        <span
          className="alob-header-date"
          style={{ display: "none" }}
          id="date-label-desktop"
        >
          {dateLabel}
        </span>

        {/* Auth area - Desktop */}
        <div className="alob-header-actions">
          {user ? (
            <div className="alob-header-user">
              <User size={18} strokeWidth={2} />
              <span className="alob-header-username">{user.name}</span>
              <button
                onClick={handleLogout}
                className="alob-header-logout"
                style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
              >
                <LogOut size={14} />
                Đăng xuất
              </button>
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="alob-header-btn alob-header-btn-login"
                onClick={() => setMenuOpen(false)}
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="alob-header-btn alob-header-btn-register"
                onClick={() => setMenuOpen(false)}
              >
                Đăng ký
              </Link>
            </>
          )}

          {/* Mobile hamburger */}
          <button
            className="md:hidden"
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 8,
              padding: "6px 8px",
              cursor: "pointer",
              color: "white",
              marginLeft: 4,
              display: "inline-flex",
              alignItems: "center",
            }}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Nav links row (visible on desktop) */}
      <div
        className="alob-nav-links hidden md:flex"
        style={{ maxWidth: 1200, margin: "0 auto" }}
      >
        {navLinks.map(({ path, label, icon }) => (
          <Link
            key={path}
            to={path}
            className={`alob-nav-link ${isActive(path) ? "alob-nav-link--active" : ""}`}
            onClick={() => setMenuOpen(false)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {icon}
            {label}
          </Link>
        ))}
        <span
          className="alob-header-date"
          style={{
            marginLeft: "auto",
            fontSize: 12,
            color: "rgba(255,255,255,0.8)",
            fontWeight: 600,
            alignSelf: "center",
            paddingRight: 8,
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <Calendar size={13} /> {dateLabel}
        </span>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="alob-mobile-menu">
          {navLinks.map(({ path, label, icon }) => (
            <Link
              key={path}
              to={path}
              className={`alob-mobile-link ${isActive(path) ? "alob-mobile-link--active" : ""}`}
              onClick={() => setMenuOpen(false)}
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              {icon}
              {label}
            </Link>
          ))}
          {!user && (
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "10px 0",
                  background: "#f0fdf4",
                  color: "#0D9D57",
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: "none",
                  border: "1.5px solid #b8e8ce",
                }}
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                onClick={() => setMenuOpen(false)}
                style={{
                  flex: 1,
                  textAlign: "center",
                  padding: "10px 0",
                  background: "#0D9D57",
                  color: "white",
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: "none",
                }}
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
