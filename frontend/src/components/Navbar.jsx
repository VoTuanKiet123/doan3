import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HiMenu, HiX } from 'react-icons/hi';
import { useState } from 'react';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  const navLink = (path, label) => (
    <Link
      to={path}
      onClick={() => setMenuOpen(false)}
      className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition duration-200 cursor-pointer ${
        isActive(path)
          ? 'bg-green-600 text-white shadow-sm shadow-green-600/10'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="bg-white/95 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50 shadow-sm shadow-slate-100/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group cursor-pointer">
            <span className="text-3xl group-hover:rotate-12 transition duration-300">🏸</span>
            <span className="text-xl font-black tracking-tight text-slate-800">
              Badminton<span className="text-green-600">Hub</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLink('/', 'Trang chủ')}
            {navLink('/courts', 'Sân cầu lông')}
            {user && navLink('/my-bookings', 'Lịch đặt của tôi')}
            {isAdmin && navLink('/admin', 'Quản trị')}
          </div>

          {/* Desktop Right Side: User Status / Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-4 bg-slate-50 p-2.5 pl-4 rounded-2xl border border-slate-100">
                <span className="text-xs font-bold text-slate-500">
                  Chào, <strong className="text-slate-700">{user.name}</strong>
                </span>
                <button
                  onClick={handleLogout}
                  className="btn btn-danger px-4 py-2 text-xs font-extrabold cursor-pointer rounded-xl"
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" className="btn btn-outline border-slate-200 text-slate-700 hover:bg-slate-50 px-5 py-2.5 text-xs font-extrabold rounded-xl">
                  Đăng nhập
                </Link>
                <Link to="/register" className="btn btn-primary px-5 py-2.5 text-xs font-extrabold rounded-xl">
                  Đăng ký
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button 
            className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-50 transition cursor-pointer" 
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <HiX size={24} /> : <HiMenu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden pb-6 pt-2 flex flex-col gap-2 animate-fadeIn border-t border-slate-50">
            {navLink('/', 'Trang chủ')}
            {navLink('/courts', 'Sân cầu lông')}
            {user && navLink('/my-bookings', 'Lịch đặt của tôi')}
            {isAdmin && navLink('/admin', 'Quản trị')}
            
            <div className="h-[1px] bg-slate-100 my-2"></div>
            
            {user ? (
              <div className="flex flex-col gap-3">
                <div className="px-4 py-2 text-xs font-bold text-slate-500">
                  Đang đăng nhập: <span className="text-slate-800">{user.name}</span>
                </div>
                <button 
                  onClick={handleLogout} 
                  className="btn btn-danger w-full py-3 text-xs font-extrabold cursor-pointer rounded-xl"
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Link 
                  to="/login" 
                  onClick={() => setMenuOpen(false)} 
                  className="btn btn-outline border-slate-200 text-slate-700 text-xs font-extrabold py-3 text-center rounded-xl"
                >
                  Đăng nhập
                </Link>
                <Link 
                  to="/register" 
                  onClick={() => setMenuOpen(false)} 
                  className="btn btn-primary text-xs font-extrabold py-3 text-center rounded-xl"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
