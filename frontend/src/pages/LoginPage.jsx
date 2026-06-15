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
      {/* Left: Brand Panel */}
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="auth-left-logo">🏸</div>
          <h1 className="auth-left-title">
            Chào Mừng Đến<br/>BadmintonHub
          </h1>
          <p className="auth-left-sub">
            Hệ thống đặt sân cầu lông trực tuyến hàng đầu — nhanh chóng, tiện lợi và chuyên nghiệp.
          </p>
          <div className="auth-left-features">
            {[
              { icon: '⚡', text: 'Đặt sân chỉ trong 30 giây' },
              { icon: '📅', text: 'Quản lý lịch đặt dễ dàng' },
              { icon: '🏆', text: 'Sân đạt chuẩn BWF quốc tế' },
              { icon: '🔔', text: 'Thông báo xác nhận tức thì' },
            ].map(f => (
              <div key={f.text} className="auth-left-feature">
                <span style={{ fontSize: 20 }}>{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Login Form */}
      <div className="auth-right">
        <div className="auth-container animate-fadeInUp">
          {/* Header */}
          <div className="auth-header">
            <div className="auth-logo">🏸</div>
            <h1 className="auth-title">Đăng Nhập</h1>
            <p className="auth-subtitle">Đăng nhập để đặt sân hoặc quản lý hệ thống</p>
          </div>

          {/* Role hint */}
          <div className="role-hint-bar">
            <div className="role-hint-item role-hint-user">
              <span className="role-hint-icon">👤</span>
              <span>Khách hàng → Đặt sân</span>
            </div>
            <div className="role-hint-divider" />
            <div className="role-hint-item role-hint-admin">
              <span className="role-hint-icon">🛡️</span>
              <span>Admin → Quản trị</span>
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
                onChange={e => setForm({ ...form, email: e.target.value })}
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
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="form-input"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button type="button" className="input-eye-btn" onClick={() => setShowPass(!showPass)} tabIndex={-1}>
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
              ) : '🏸 Đăng Nhập'}
            </button>
          </form>

          <p className="auth-footer-text">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="auth-link">Đăng ký ngay ✨</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
