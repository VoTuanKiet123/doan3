import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Chào mừng trở lại, ${user.name}!`);
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/courts');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Background decoration */}
      <div className="auth-bg-deco" aria-hidden="true">
        <div className="auth-deco-circle auth-deco-circle-1" />
        <div className="auth-deco-circle auth-deco-circle-2" />
        <div className="auth-deco-circle auth-deco-circle-3" />
      </div>

      <div className="auth-container animate-fadeInUp">
        {/* Header */}
        <div className="auth-header">
          <div className="auth-logo animate-float">🏸</div>
          <h1 className="auth-title">Chào Mừng Trở Lại</h1>
          <p className="auth-subtitle">Đăng nhập để đặt sân hoặc quản lý hệ thống.</p>
        </div>

        {/* Role hint */}
        <div className="role-hint-bar">
          <div className="role-hint-item role-hint-user">
            <span className="role-hint-icon">👤</span>
            <span>Khách hàng → Trang đặt sân</span>
          </div>
          <div className="role-hint-divider" />
          <div className="role-hint-item role-hint-admin">
            <span className="role-hint-icon">🛡️</span>
            <span>Admin → Trang quản trị</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">
              <span className="form-label-icon">✉️</span> Địa chỉ Email
            </label>
            <input
              id="login-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="form-input"
              placeholder="ten@email.com"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <span className="form-label-icon">🔒</span> Mật khẩu
            </label>
            <div className="input-password-wrap">
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="form-input"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="input-eye-btn"
                onClick={() => setShowPass(!showPass)}
                tabIndex={-1}
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button
            id="btn-login-submit"
            type="submit"
            disabled={loading}
            className="auth-submit-btn"
          >
            {loading ? (
              <span className="auth-btn-loading">
                <span className="auth-spinner" />
                Đang đăng nhập...
              </span>
            ) : (
              'Đăng Nhập'
            )}
          </button>
        </form>

        <p className="auth-footer-text">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="auth-link">
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
