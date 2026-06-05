import { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const DAY_FULL = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6..22

const TYPE_CONFIG = {
  peak: { label: 'Giờ vàng', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: '⚡' },
  weekend: { label: 'Cuối tuần', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', icon: '🔴' },
  holiday: { label: 'Ngày lễ', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', icon: '🎉' },
};

const emptyForm = {
  name: '',
  type: 'peak',
  daysOfWeek: [],
  startHour: 17,
  endHour: 21,
  priceMultiplier: 1.5,
  priority: 1,
  isActive: true,
};

export default function AdminPricing() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchRules = () => {
    setLoading(true);
    api.get('/pricing')
      .then(res => { setRules(res.data.rules); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchRules(); }, []);

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowModal(true); };

  const openEdit = (rule) => {
    setForm({
      name: rule.name,
      type: rule.type,
      daysOfWeek: rule.daysOfWeek,
      startHour: rule.startHour,
      endHour: rule.endHour,
      priceMultiplier: rule.priceMultiplier,
      priority: rule.priority,
      isActive: rule.isActive,
    });
    setEditId(rule._id);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (form.daysOfWeek.length === 0) {
      toast.error('Vui lòng chọn ít nhất một ngày áp dụng');
      return;
    }
    if (Number(form.startHour) >= Number(form.endHour)) {
      toast.error('Giờ bắt đầu phải nhỏ hơn giờ kết thúc');
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await api.put(`/pricing/${editId}`, form);
        toast.success('Cập nhật quy tắc giá thành công');
      } else {
        await api.post('/pricing', form);
        toast.success('Tạo quy tắc giá thành công');
      }
      setShowModal(false);
      fetchRules();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi lưu');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (rule) => {
    try {
      await api.patch(`/pricing/${rule._id}/toggle`);
      toast.success(`Đã ${rule.isActive ? 'tắt' : 'bật'} quy tắc "${rule.name}"`);
      fetchRules();
    } catch (err) {
      toast.error('Không thể cập nhật trạng thái');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa quy tắc giá này?')) return;
    try {
      await api.delete(`/pricing/${id}`);
      toast.success('Xóa quy tắc giá thành công');
      fetchRules();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi xóa');
    }
  };

  const toggleDay = (day) => {
    setForm(f => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(day)
        ? f.daysOfWeek.filter(d => d !== day)
        : [...f.daysOfWeek, day].sort((a, b) => a - b),
    }));
  };

  // --- Heatmap: tính cell nào có rule ---
  const getCellRule = (dayIdx, hour) => {
    const activeRules = rules.filter(r => r.isActive);
    const matching = activeRules.filter(r =>
      r.daysOfWeek.includes(dayIdx) && r.startHour <= hour && hour < r.endHour
    );
    if (matching.length === 0) return null;
    return matching.sort((a, b) => b.priority - a.priority)[0];
  };

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Quản lý giá động</h1>
          <p className="admin-page-subtitle">Cấu hình giờ vàng, cuối tuần và ngày lễ</p>
        </div>
        <button onClick={openAdd} className="admin-header-btn">
          + Thêm quy tắc giá
        </button>
      </div>

      {/* === Heatmap lịch giá === */}
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        border: '1px solid #f1f5f9',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <span style={{ fontSize: '20px' }}>📅</span>
          <div>
            <h2 style={{ fontWeight: 700, color: '#1e293b', fontSize: '15px', margin: 0 }}>Bản đồ giá theo khung giờ</h2>
            <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>Màu sắc thể hiện quy tắc đang active</p>
          </div>
          {/* Legend */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: '#e2e8f0' }} />
              <span style={{ fontSize: '11px', color: '#64748b' }}>Giá thường</span>
            </div>
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: cfg.bg, border: `1.5px solid ${cfg.color}` }} />
                <span style={{ fontSize: '11px', color: '#64748b' }}>{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: '700px' }}>
            <thead>
              <tr>
                <th style={{ width: '52px', padding: '4px 8px', fontSize: '11px', color: '#94a3b8', textAlign: 'left' }}>Giờ</th>
                {DAY_LABELS.map((d, i) => (
                  <th key={i} style={{ padding: '4px 6px', fontSize: '11px', fontWeight: 700, color: (i === 0 || i === 6) ? '#ef4444' : '#475569', textAlign: 'center', minWidth: '72px' }}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOURS.map(hour => (
                <tr key={hour}>
                  <td style={{ padding: '2px 8px', fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>{String(hour).padStart(2,'0')}:00</td>
                  {DAY_LABELS.map((_, dayIdx) => {
                    const rule = getCellRule(dayIdx, hour);
                    const cfg = rule ? TYPE_CONFIG[rule.type] : null;
                    return (
                      <td key={dayIdx} style={{ padding: '2px 4px' }}>
                        <div
                          title={rule ? `${rule.name} (×${rule.priceMultiplier})` : 'Giá thường'}
                          style={{
                            height: '22px',
                            borderRadius: '5px',
                            background: cfg ? cfg.bg : '#f8fafc',
                            border: cfg ? `1px solid ${cfg.color}40` : '1px solid #e2e8f0',
                            cursor: 'default',
                            transition: 'transform 0.1s',
                          }}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* === Bảng danh sách rules === */}
      {loading ? (
        <div className="admin-loading">
          <div className="admin-loading-spinner" />
          <span>Đang tải dữ liệu...</span>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tên quy tắc</th>
                <th>Loại</th>
                <th>Ngày áp dụng</th>
                <th>Khung giờ</th>
                <th>Hệ số giá</th>
                <th>Ưu tiên</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {rules.length === 0 ? (
                <tr><td colSpan={8} className="admin-table-empty">Chưa có quy tắc giá nào. Nhấn "+ Thêm quy tắc giá" để bắt đầu.</td></tr>
              ) : rules.map(rule => {
                const cfg = TYPE_CONFIG[rule.type];
                return (
                  <tr key={rule._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>{cfg?.icon}</span>
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{rule.name}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                        background: cfg?.bg, color: cfg?.color, border: `1px solid ${cfg?.color}40`,
                      }}>
                        {cfg?.label}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {rule.daysOfWeek.sort((a,b)=>a-b).map(d => (
                          <span key={d} style={{
                            padding: '2px 7px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                            background: (d === 0 || d === 6) ? '#fee2e2' : '#f1f5f9',
                            color: (d === 0 || d === 6) ? '#ef4444' : '#475569',
                          }}>
                            {DAY_LABELS[d]}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, color: '#374151', fontSize: '13px' }}>
                      {String(rule.startHour).padStart(2,'0')}:00 – {String(rule.endHour).padStart(2,'0')}:00
                    </td>
                    <td>
                      <span style={{
                        fontWeight: 800, fontSize: '15px',
                        color: rule.priceMultiplier > 1 ? '#f59e0b' : '#22c55e',
                      }}>
                        ×{rule.priceMultiplier}
                      </span>
                      <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '4px' }}>
                        (+{Math.round((rule.priceMultiplier - 1) * 100)}%)
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontWeight: 700, color: '#6366f1', background: '#eef2ff', padding: '2px 8px', borderRadius: '6px', fontSize: '12px' }}>
                        P{rule.priority}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleToggle(rule)}
                        style={{
                          padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                          cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                          background: rule.isActive ? '#dcfce7' : '#f1f5f9',
                          color: rule.isActive ? '#16a34a' : '#94a3b8',
                        }}
                      >
                        {rule.isActive ? '● Đang bật' : '○ Tắt'}
                      </button>
                    </td>
                    <td>
                      <div className="admin-action-group">
                        <button onClick={() => openEdit(rule)} className="admin-action-btn admin-action-btn--edit">Sửa</button>
                        <button onClick={() => handleDelete(rule._id)} className="admin-action-btn admin-action-btn--danger">Xóa</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* === Modal Thêm / Sửa === */}
      {showModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal" style={{ maxWidth: '520px', width: '95vw' }}>
            <h2 className="admin-modal-title">{editId ? '✏️ Sửa quy tắc giá' : '➕ Thêm quy tắc giá mới'}</h2>

            <form onSubmit={handleSave} className="admin-modal-form">
              {/* Tên */}
              <div className="form-group">
                <label className="form-label">Tên quy tắc *</label>
                <input required type="text" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="form-input" placeholder="VD: Giờ vàng buổi tối" />
              </div>

              {/* Loại */}
              <div className="form-group">
                <label className="form-label">Loại *</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="form-input">
                  <option value="peak">⚡ Giờ vàng (Peak Hours)</option>
                  <option value="weekend">🔴 Cuối tuần (Weekend)</option>
                  <option value="holiday">🎉 Ngày lễ (Holiday)</option>
                </select>
              </div>

              {/* Ngày áp dụng */}
              <div className="form-group">
                <label className="form-label">Ngày áp dụng *</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                  {DAY_FULL.map((label, idx) => {
                    const selected = form.daysOfWeek.includes(idx);
                    const isWeekend = idx === 0 || idx === 6;
                    return (
                      <button
                        key={idx} type="button"
                        onClick={() => toggleDay(idx)}
                        style={{
                          padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                          cursor: 'pointer', transition: 'all 0.15s',
                          background: selected ? (isWeekend ? '#fee2e2' : '#e0e7ff') : '#f8fafc',
                          color: selected ? (isWeekend ? '#dc2626' : '#4338ca') : '#94a3b8',
                          border: selected ? `1.5px solid ${isWeekend ? '#fca5a5' : '#a5b4fc'}` : '1.5px solid #e2e8f0',
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                {/* Quick select buttons */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button type="button" style={{ fontSize: '11px', color: '#6366f1', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => setForm(f => ({ ...f, daysOfWeek: [1,2,3,4,5] }))}>
                    Chọn T2-T6
                  </button>
                  <button type="button" style={{ fontSize: '11px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => setForm(f => ({ ...f, daysOfWeek: [0,6] }))}>
                    Chọn CN+T7
                  </button>
                  <button type="button" style={{ fontSize: '11px', color: '#475569', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={() => setForm(f => ({ ...f, daysOfWeek: [0,1,2,3,4,5,6] }))}>
                    Chọn tất cả
                  </button>
                </div>
              </div>

              {/* Khung giờ */}
              <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Từ giờ *</label>
                  <select value={form.startHour} onChange={e => setForm({ ...form, startHour: Number(e.target.value) })} className="form-input">
                    {Array.from({ length: 17 }, (_, i) => i + 6).map(h => (
                      <option key={h} value={h}>{String(h).padStart(2,'0')}:00</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Đến giờ *</label>
                  <select value={form.endHour} onChange={e => setForm({ ...form, endHour: Number(e.target.value) })} className="form-input">
                    {Array.from({ length: 17 }, (_, i) => i + 6).map(h => (
                      <option key={h + 1} value={h + 1}>{String(h + 1).padStart(2,'0')}:00</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Hệ số nhân */}
              <div className="form-group">
                <label className="form-label">
                  Hệ số giá *
                  <span style={{ fontWeight: 400, color: '#94a3b8', marginLeft: '8px' }}>
                    (×{form.priceMultiplier} = tăng {Math.round((form.priceMultiplier - 1) * 100)}%)
                  </span>
                </label>
                <input
                  required type="number" min="1.0" max="5.0" step="0.1"
                  value={form.priceMultiplier}
                  onChange={e => setForm({ ...form, priceMultiplier: parseFloat(e.target.value) || 1 })}
                  className="form-input"
                />
                {/* Quick presets */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {[1.2, 1.3, 1.5, 1.8, 2.0].map(v => (
                    <button key={v} type="button"
                      onClick={() => setForm(f => ({ ...f, priceMultiplier: v }))}
                      style={{
                        padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                        background: form.priceMultiplier === v ? '#fef3c7' : '#f8fafc',
                        color: form.priceMultiplier === v ? '#d97706' : '#94a3b8',
                        border: form.priceMultiplier === v ? '1.5px solid #fcd34d' : '1.5px solid #e2e8f0',
                      }}>
                      ×{v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority & Active */}
              <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Độ ưu tiên</label>
                  <input type="number" min="1" max="10" value={form.priority}
                    onChange={e => setForm({ ...form, priority: parseInt(e.target.value) || 1 })}
                    className="form-input" />
                  <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Cao hơn = ưu tiên khi chồng nhau</p>
                </div>
                <div>
                  <label className="form-label">Trạng thái</label>
                  <select value={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.value === 'true' })} className="form-input">
                    <option value="true">● Đang bật</option>
                    <option value="false">○ Tắt</option>
                  </select>
                </div>
              </div>

              <div className="admin-modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="admin-modal-cancel">Huỷ</button>
                <button type="submit" disabled={saving} className="admin-modal-submit">
                  {saving ? 'Đang lưu...' : (editId ? 'Cập nhật' : 'Tạo quy tắc')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
