import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  ClipboardCheck,
  UserPlus,
  ShoppingCart,
  Clock,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  Activity,
  Globe,
  BadgeCheck,
} from "lucide-react";
import { useState, useEffect } from "react";

const posLinks = [
  {
    to: "/pos",
    icon: <LayoutDashboard size={18} />,
    label: "Tổng quan",
    end: true,
  },
  {
    to: "/pos/checkin",
    icon: <ClipboardCheck size={18} />,
    label: "Check-in / Check-out",
  },
  {
    to: "/pos/walkin",
    icon: <UserPlus size={18} />,
    label: "Khách vãng lai",
  },
  {
    to: "/pos/orders",
    icon: <ShoppingCart size={18} />,
    label: "Bán dịch vụ",
  },
  {
    to: "/pos/shift",
    icon: <Clock size={18} />,
    label: "Ca làm việc",
  },
];

const pageTitles = {
  "/pos": "Tổng quan · Nhân viên quầy",
  "/pos/checkin": "Check-in / Check-out",
  "/pos/walkin": "Khách vãng lai",
  "/pos/orders": "Bán dịch vụ tại quầy",
  "/pos/shift": "Ca làm việc",
};

export default function POSLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  // Update clock every minute
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }) +
          " · " +
          now.toLocaleDateString("vi-VN", {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
          })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Current page title
  const pageTitle = pageTitles[location.pathname] || "Nhân viên quầy";

  return (
    <div className="pos-layout">
      {/* Overlay for mobile */}
      <div
        className={`pos-sidebar-overlay ${menuOpen ? "pos-sidebar--open" : ""}`}
        onClick={() => setMenuOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`pos-sidebar ${menuOpen ? "pos-sidebar--open" : ""}`}>
        {/* Header */}
        <div className="pos-sidebar-header">
          <div className="pos-sidebar-logo">
            <Activity size={22} color="white" />
          </div>
          <div className="pos-sidebar-brand">
            <span className="pos-sidebar-title">BadmintonHub</span>
            <span className="pos-sidebar-badge">Nhân viên</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="pos-sidebar-nav">
          <div className="pos-sidebar-section-label">Menu chính</div>
          {posLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `pos-sidebar-link ${isActive ? "pos-sidebar-link--active" : ""}`
              }
            >
              <span className="pos-sidebar-link-icon">{link.icon}</span>
              <span>{link.label}</span>
            </NavLink>
          ))}

          <div className="pos-sidebar-section-label" style={{ marginTop: 12 }}>
            Hệ thống
          </div>
          <NavLink
            to="/"
            className="pos-sidebar-link"
            onClick={() => setMenuOpen(false)}
          >
            <span className="pos-sidebar-link-icon">
              <Globe size={18} />
            </span>
            <span>Về trang chính</span>
          </NavLink>
        </nav>

        {/* Footer */}
        <div className="pos-sidebar-footer">
          {/* Nhân viên info */}
          <div className="pos-sidebar-user">
            <div className="pos-sidebar-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || "N"}
            </div>
            <div className="pos-sidebar-user-info">
              <div className="pos-sidebar-user-name">{user?.name}</div>
              <div className="pos-sidebar-user-role">Nhân viên quầy</div>
            </div>
            <button
              onClick={handleLogout}
              className="pos-sidebar-logout"
              title="Đăng xuất"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="pos-main">
        {/* Top bar */}
        <div className="pos-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              className="pos-menu-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              title="Menu"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <span className="pos-topbar-title">{pageTitle}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="pos-topbar-time">{currentTime}</span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: 99,
                padding: "4px 12px",
                fontSize: 12,
                fontWeight: 600,
                color: "#065f46",
              }}
            >
              <BadgeCheck size={14} color="#10b981" />
              {user?.name}
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="pos-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
