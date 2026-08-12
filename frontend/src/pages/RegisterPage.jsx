import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Activity, Zap, Target, Coins, Lock, Sparkles, User, Mail, Phone, EyeOff, Eye, UserPlus, ArrowRight } from 'lucide-react';

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
      await register(form);
      toast.success('Đăng ký thành công! Chào mừng bạn 🎉');
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
    return { level: 'strong', label: 'Mạnh', color: '#0D9D57' };
  };

  const strength = passwordStrength();

  return (
    <div className="auth-page">
      {/* Left: Brand Panel */}
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="auth-left-logo" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={28} className="text-white" />
          </div>
          <h1 className="auth-left-title">
            Tham Gia<br />Cộng Đồng<br />BadmintonHub
          </h1>
          <p className="auth-left-sub">
            Hàng ngàn tay vợt đã tin tưởng chọn BadmintonHub để đặt sân, quản lý lịch và nâng cao kỹ năng thi đấu.
          </p>
          <div className="auth-left-features">
            {[
              { icon: <Zap size={20} />, text: 'Đặt sân nhanh — chỉ 30 giây' },
              { icon: <Target size={20} />, text: 'Chọn giờ linh hoạt theo lịch của bạn' },
              { icon: <Coins size={20} />, text: 'Giá minh bạch, không phát sinh thêm' },
              { icon: <Lock size={20} />, text: 'Tài khoản bảo mật 100%' },
            ].map(f => (
              <div key={f.text} className="auth-left-feature" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ display: 'inline-flex', color: '#fff' }}>{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Register Form */}
      <div className="auth-right">
        <div className="auth-container animate-fadeInUp">
          {/* Header */}
          <div className="auth-header">
            <div className="auth-logo" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={28} className="text-emerald-600" />
            </div>
            <h1 className="auth-title">Tạo Tài Khoản</h1>
            <p className="auth-subtitle">Đăng ký miễn phí và bắt đầu đặt sân ngay!</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span className="form-label-icon" style={{ display: 'inline-flex' }}><User size={14} /></span> Họ và tên
              </label>
              <input
                id="register-name"
                type="text"
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="form-input"
                placeholder="Nguyễn Văn A"
                autoComplete="name"
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span className="form-label-icon" style={{ display: 'inline-flex' }}><Mail size={14} /></span> Địa chỉ Email
              </label>
              <input
                id="register-email"
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
              <label className="form-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span className="form-label-icon" style={{ display: 'inline-flex' }}><Phone size={14} /></span> Số điện thoại
              </label>
              <input
                id="register-phone"
                type="tel"
                required
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="form-input"
                placeholder="0912 345 678"
                autoComplete="tel"
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span className="form-label-icon" style={{ display: 'inline-flex' }}><Lock size={14} /></span> Mật khẩu
              </label>
              <div className="input-password-wrap">
                <input
                  id="register-password"
                  type={showPass ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="form-input"
                  placeholder="Tối thiểu 6 ký tự"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="input-eye-btn"
                  onClick={() => setShowPass(!showPass)}
                  tabIndex={-1}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
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
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {loading ? (
                <span className="auth-btn-loading" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span className="auth-spinner" />
                  Đang đăng ký...
                </span>
              ) : (
                <>
                  <UserPlus size={16} />
                  <span>Tạo Tài Khoản Miễn Phí</span>
                </>
              )}
            </button>
          </form>

          <p className="auth-footer-text">
            Đã có tài khoản?{' '}
            <Link to="/login" className="auth-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              Đăng nhập ngay <ArrowRight size={12} />
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
