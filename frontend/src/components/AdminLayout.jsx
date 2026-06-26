import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Volleyball, ClipboardList, DollarSign, Users, Globe, LogOut, Activity } from 'lucide-react';

const sidebarLinks = [
  { to: '/admin', icon: <LayoutDashboard size={18} />, label: 'Dashboard', end: true },
  { to: '/admin/courts', icon: <Volleyball size={18} />, label: 'Quản lý sân' },
  { to: '/admin/bookings', icon: <ClipboardList size={18} />, label: 'Đặt sân' },
  { to: '/admin/pricing', icon: <DollarSign size={18} />, label: 'Quản lý giá' },
  { to: '/admin/users', icon: <Users size={18} />, label: 'Người dùng' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-logo">
            <Activity size={24} className="text-white animate-pulse" />
          </div>
          <div className="admin-sidebar-brand">
            <span className="admin-sidebar-title">BadmintonHub</span>
            <span className="admin-sidebar-badge">Admin</span>
          </div>
        </div>

        <nav className="admin-sidebar-nav">
          <div className="admin-sidebar-section-label">MENU CHÍNH</div>
          {sidebarLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `admin-sidebar-link ${isActive ? 'admin-sidebar-link--active' : ''}`
              }
            >
              <span className="admin-sidebar-link-icon">{link.icon}</span>
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <NavLink to="/" className="admin-sidebar-link admin-sidebar-link--back">
            <span className="admin-sidebar-link-icon"><Globe size={18} /></span>
            <span>Về trang chính</span>
          </NavLink>
          <div className="admin-sidebar-user">
            <div className="admin-sidebar-avatar">
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="admin-sidebar-user-info">
              <div className="admin-sidebar-user-name">{user?.name}</div>
              <div className="admin-sidebar-user-role">Quản trị viên</div>
            </div>
            <button
              onClick={handleLogout}
              className="admin-sidebar-logout"
              title="Đăng xuất"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
