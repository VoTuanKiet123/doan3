import { useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  Volleyball,
  ClipboardList,
  DollarSign,
  Users,
  Globe,
  LogOut,
  Activity,
  Wrench,
  ShoppingCart,
  Package,
  RotateCcw,
  BarChart3,
  ShieldAlert,
  Settings,
  Menu,
  X,
} from "lucide-react";

const sidebarLinks = [
  {
    to: "/admin",
    icon: <LayoutDashboard size={18} />,
    label: "Dashboard",
    end: true,
  },
  { to: "/admin/courts", icon: <Volleyball size={18} />, label: "Quản lý sân" },
  {
    to: "/admin/bookings",
    icon: <ClipboardList size={18} />,
    label: "Đặt sân",
  },
  {
    to: "/admin/pricing",
    icon: <DollarSign size={18} />,
    label: "Quản lý giá",
  },
  {
    to: "/admin/maintenance",
    icon: <Wrench size={18} />,
    label: "Bảo trì sân",
  },
  {
    to: "/admin/analytics",
    icon: <BarChart3 size={18} />,
    label: "Thống kê",
  },
  {
    to: "/admin/pos",
    icon: <ShoppingCart size={18} />,
    label: "Bán hàng (POS)",
  },
  {
    to: "/admin/products",
    icon: <Package size={18} />,
    label: "Sản phẩm & Kho",
  },
  {
    to: "/admin/rentals",
    icon: <RotateCcw size={18} />,
    label: "Thuê thiết bị",
  },
  {
    to: "/admin/users",
    icon: <Users size={18} />,
    label: "Người dùng",
  },
  {
    to: "/admin/cancellation-policy",
    icon: <ShieldAlert size={18} />,
    label: "Chính sách huỷ",
  },
  {
    to: "/admin/settings",
    icon: <Settings size={18} />,
    label: "Cấu hình hệ thống",
  },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  const currentLabel =
    sidebarLinks.find((l) =>
      l.end ? location.pathname === l.to : location.pathname.startsWith(l.to),
    )?.label || "Quản trị";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="admin-layout">
      {/* Overlay for mobile */}
      <div
        className={`admin-sidebar-overlay ${menuOpen ? "admin-sidebar--open" : ""}`}
        onClick={closeMenu}
      />

      {/* Sidebar */}
      <aside className={`admin-sidebar ${menuOpen ? "admin-sidebar--open" : ""}`}>
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-logo">
            <Activity size={18} />
          </div>
          <div className="admin-sidebar-brand">
            <span className="admin-sidebar-title">BadmintonHub</span>
            <span className="admin-sidebar-badge">Quản trị</span>
          </div>
        </div>

        <nav className="admin-sidebar-nav">
          <div className="admin-sidebar-section-label">Menu chính</div>
          {sidebarLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={closeMenu}
              className={({ isActive }) =>
                `admin-sidebar-link ${isActive ? "admin-sidebar-link--active" : ""}`
              }
            >
              <span className="admin-sidebar-link-icon">{link.icon}</span>
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <NavLink
            to="/"
            className="admin-sidebar-link admin-sidebar-link--back"
            onClick={closeMenu}
          >
            <span className="admin-sidebar-link-icon">
              <Globe size={18} />
            </span>
            <span>Về trang chính</span>
          </NavLink>
          <div className="admin-sidebar-user">
            <div className="admin-sidebar-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || "A"}
            </div>
            <div className="admin-sidebar-user-info">
              <div className="admin-sidebar-user-name">{user?.name}</div>
              <div className="admin-sidebar-user-role">Quản trị viên</div>
            </div>
            <button
              onClick={handleLogout}
              className="admin-sidebar-logout"
              title="Đăng xuất"
              aria-label="Đăng xuất"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="admin-main">
        {/* Top bar (mobile/tablet only) */}
        <div className="admin-mobile-bar">
          <button
            className="admin-menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className="admin-mobile-bar-title">{currentLabel}</span>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
