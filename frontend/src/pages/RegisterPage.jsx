import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error('Mật khẩu phải chứa ít nhất 6 ký tự');
      return;
    }
    setLoading(true);
    try {
      const user = await register(form);
      toast.success('Đăng ký thành công! Chào mừng bạn 🎉');
      // Sau đăng ký, khách hàng luôn được điều hướng về trang đặt sân
      navigate('/courts');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = () => {
    const p = form.password;
    if (!p) return null;
    if (p.length < 6) return { level: 'weak', label: 'Yếu', color: '#ef4444' };
    if (p.length < 10) return { level: 'medium', label: 'Trung bình', color: '#f59e0b' };
    return { level: 'strong', label: 'Mạnh', color: '#10b981' };
  };

  const strength = passwordStrength();

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
          <h1 className="auth-title">Tạo Tài Khoản Mới</h1>
          <p className="auth-subtitle">Trở thành thành viên và bắt đầu đặt sân ngay hôm nay.</p>
        </div>

        {/* Member benefit */}
        <div className="register-benefit-bar">
          <div className="register-benefit-item">
            <span>⚡</span> Đặt sân nhanh chóng
          </div>
          <div className="register-benefit-item">
            <span>📅</span> Theo dõi lịch đặt
          </div>
          <div className="register-benefit-item">
            <span>🎯</span> Ưu tiên chọn giờ
          </div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">
              <span className="form-label-icon">👤</span> Họ và tên
            </label>
            <input
              id="register-name"
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="form-input"
              placeholder="Nguyễn Văn A"
              autoComplete="name"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <span className="form-label-icon">✉️</span> Địa chỉ Email
            </label>
            <input
              id="register-email"
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
              <span className="form-label-icon">📞</span> Số điện thoại
            </label>
            <input
              id="register-phone"
              type="tel"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="form-input"
              placeholder="0912 345 678"
              autoComplete="tel"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <span className="form-label-icon">🔒</span> Mật khẩu
            </label>
            <div className="input-password-wrap">
              <input
                id="register-password"
                type={showPass ? 'text' : 'password'}
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="form-input"
                placeholder="Tối thiểu 6 ký tự"
                autoComplete="new-password"
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
            {strength && (
              <div className="password-strength">
                <div className="password-strength-bar">
                  <div
                    className="password-strength-fill"
                    style={{
                      width: strength.level === 'weak' ? '33%' : strength.level === 'medium' ? '66%' : '100%',
                      background: strength.color,
                    }}
                  />
                </div>
                <span className="password-strength-label" style={{ color: strength.color }}>
                  {strength.label}
                </span>
              </div>
            )}
          </div>

          <button
            id="btn-register-submit"
            type="submit"
            disabled={loading}
            className="auth-submit-btn"
          >
            {loading ? (
              <span className="auth-btn-loading">
                <span className="auth-spinner" />
                Đang đăng ký...
              </span>
            ) : (
              'Tạo Tài Khoản'
            )}
          </button>
        </form>

        <p className="auth-footer-text">
          Đã có tài khoản?{' '}
          <Link to="/login" className="auth-link">
            Đăng nhập ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
