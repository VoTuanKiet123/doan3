import { NavLink, Outlet, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { useState } from "react";

const posLinks = [
  {
    to: "/pos",
    icon: <LayoutDashboard size={20} />,
    label: "Tổng quan",
    end: true,
  },
  {
    to: "/pos/checkin",
    icon: <ClipboardCheck size={20} />,
    label: "Check-in",
  },
  {
    to: "/pos/walkin",
    icon: <UserPlus size={20} />,
    label: "Khách vãng lai",
  },
  {
    to: "/pos/orders",
    icon: <ShoppingCart size={20} />,
    label: "Bán dịch vụ",
  },
  {
    to: "/pos/shift",
    icon: <Clock size={20} />,
    label: "Ca làm việc",
  },
];

export default function POSLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Bar */}
      <header className="bg-green-700 text-white sticky top-0 z-50 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-1 hover:bg-green-600 rounded"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <span className="font-bold text-lg">🏸 POS BadmintonHub</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm hidden sm:block">
              {user?.name} ·{" "}
              <span className="bg-green-600 px-2 py-0.5 rounded text-xs">
                Nhân viên
              </span>
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 bg-green-800 hover:bg-green-900 px-3 py-1.5 rounded text-sm transition"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Thoát</span>
            </button>
          </div>
        </div>

        {/* Nav Tabs */}
        <nav
          className={`${menuOpen ? "flex" : "hidden"} lg:flex flex-col lg:flex-row overflow-x-auto border-t border-green-600`}
        >
          {posLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition ${
                  isActive
                    ? "bg-white text-green-700"
                    : "text-green-100 hover:bg-green-600"
                }`
              }
            >
              {link.icon}
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-4">
        <Outlet />
      </main>
    </div>
  );
}
