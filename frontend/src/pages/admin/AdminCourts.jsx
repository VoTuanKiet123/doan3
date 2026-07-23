import { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Pencil, Trash2, PlusCircle, Volleyball } from 'lucide-react';

const DEFAULT_SERVICES = {
  A: [
    'Thảm Taraflex cao cấp thi đấu',
    'Đèn LED 800-1000 Lux chống lóa',
    'Điều hòa / Quạt mát công suất lớn',
    'Nước uống đóng chai miễn phí',
    'Wifi tốc độ cao miễn phí',
    'Dịch vụ lau thảm & Tủ đồ khóa từ'
  ],
  B: [
    'Thảm cao su tiêu chuẩn BWF',
    'Đèn LED 600 Lux chống lóa',
    'Quạt mát công suất lớn & Ghế chờ',
    'Wifi miễn phí',
    'Nước giải khát bán kèm'
  ],
  C: [
    'Sàn acrylic / thảm cao su cơ bản',
    'Hệ thống đèn chiếu sáng tiêu chuẩn',
    'Quạt xoay & Ghế ngồi nghỉ',
    'Cây nước uống miễn phí tự phục vụ'
  ]
};

const DEFAULT_PRICES = { A: 70000, B: 50000, C: 30000 };

const emptyForm = { name: '', type: 'A', description: '', pricePerHour: 70000, services: DEFAULT_SERVICES.A.join('\n'), status: 'active' };

export default function AdminCourts() {
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchCourts = () => {
    api.get('/courts').then(res => { setCourts(res.data.courts); setLoading(false); });
  };

  useEffect(() => { fetchCourts(); }, []);

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowModal(true); };

  const openEdit = (court) => {
    const cType = court.type || 'A';
    setForm({
      name: court.name,
      type: cType,
      description: court.description || '',
      pricePerHour: court.pricePerHour || DEFAULT_PRICES[cType],
      services: Array.isArray(court.services) && court.services.length > 0 ? court.services.join('\n') : DEFAULT_SERVICES[cType].join('\n'),
      status: court.status
    });
    setEditId(court._id);
    setShowModal(true);
  };

  const handleTypeChange = (newType) => {
    setForm(prev => ({
      ...prev,
      type: newType,
      pricePerHour: DEFAULT_PRICES[newType] || prev.pricePerHour,
      services: DEFAULT_SERVICES[newType] ? DEFAULT_SERVICES[newType].join('\n') : prev.services
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const servicesArray = form.services ? form.services.split('\n').map(s => s.trim()).filter(Boolean) : [];
      const payload = {
        ...form,
        pricePerHour: Number(form.pricePerHour),
        services: servicesArray
      };

      if (editId) {
        await api.put(`/courts/${editId}`, payload);
        toast.success('Cập nhật sân thành công');
      } else {
        await api.post('/courts', payload);
        toast.success('Thêm sân thành công');
      }
      setShowModal(false);
      fetchCourts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi lưu');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa sân này?')) return;
    try {
      await api.delete(`/courts/${id}`);
      toast.success('Xóa sân thành công');
      fetchCourts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi xóa');
    }
  };

  const statusMap = { active: 'Hoạt động', inactive: 'Tạm đóng' };
  const statusCls = {
    active: 'badge badge-active',
    inactive: 'badge badge-inactive',
  };

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Quản lý sân</h1>
          <p className="admin-page-subtitle">Thêm, sửa, phân loại sân & dịch vụ kèm theo</p>
        </div>
        <button onClick={openAdd} className="admin-header-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <PlusCircle size={16} /> Thêm sân
        </button>
      </div>

      {loading ? (
        <div className="admin-loading">
          <div className="admin-loading-spinner"></div>
          <span>Đang tải dữ liệu...</span>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tên sân</th>
                <th>Loại sân</th>
                <th>Mô tả & Dịch vụ</th>
                <th>Giá/giờ</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {courts.length === 0 ? (
                <tr><td colSpan={6} className="admin-table-empty">Chưa có sân nào</td></tr>
              ) : courts.map((court) => {
                const cType = court.type || (court.pricePerHour >= 70000 ? 'A' : (court.pricePerHour >= 50000 ? 'B' : 'C'));
                return (
                  <tr key={court._id}>
                    <td className="admin-user-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Volleyball size={15} style={{ color: '#0D9D57', flexShrink: 0 }} /> {court.name}
                    </td>
                    <td>
                      <span className={`badge ${cType === 'A' ? 'badge-hot' : cType === 'B' ? 'badge-active' : 'badge-inactive'}`}>
                        Sân {cType} ({cType === 'A' ? 'VIP' : cType === 'B' ? 'Tiêu chuẩn' : 'Tiết kiệm'})
                      </span>
                    </td>
                    <td className="admin-text-secondary" style={{ maxWidth: 260 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{court.description || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {court.services && court.services.length > 0 ? `${court.services.length} dịch vụ đi kèm` : 'Dịch vụ mặc định'}
                      </div>
                    </td>
                    <td className="admin-text-price">{court.pricePerHour?.toLocaleString('vi-VN')}đ</td>
                    <td>
                      <span className={statusCls[court.status]}>
                        {statusMap[court.status]}
                      </span>
                    </td>
                    <td>
                      <div className="admin-action-group">
                        <button onClick={() => openEdit(court)} className="admin-action-btn admin-action-btn--edit" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Pencil size={13} /> Sửa
                        </button>
                        <button onClick={() => handleDelete(court._id)} className="admin-action-btn admin-action-btn--danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Trash2 size={13} /> Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal" style={{ maxWidth: 540 }}>
            <h2 className="admin-modal-title">{editId ? 'Sửa sân' : 'Thêm sân mới'}</h2>
            <form onSubmit={handleSave} className="admin-modal-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Tên sân *</label>
                  <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                    className="form-input" placeholder="Sân A1" />
                </div>
                <div className="form-group">
                  <label className="form-label">Loại sân *</label>
                  <select value={form.type} onChange={e => handleTypeChange(e.target.value)} className="form-input">
                    <option value="A">Sân A (VIP - 70.000đ/h)</option>
                    <option value="B">Sân B (Tiêu chuẩn - 50.000đ/h)</option>
                    <option value="C">Sân C (Tiết kiệm - 30.000đ/h)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Giá/giờ (đồng) *</label>
                  <input required type="number" min="0" value={form.pricePerHour} onChange={e => setForm({...form, pricePerHour: e.target.value})}
                    className="form-input" placeholder="70000" />
                </div>
                <div className="form-group">
                  <label className="form-label">Trạng thái</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}
                    className="form-input">
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Tạm đóng</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Mô tả sân</label>
                <textarea rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  className="form-input" placeholder="Mô tả sân..." style={{ resize: 'none' }} />
              </div>

              <div className="form-group">
                <label className="form-label">Dịch vụ đi kèm (Mỗi dịch vụ 1 dòng)</label>
                <textarea rows={5} value={form.services} onChange={e => setForm({...form, services: e.target.value})}
                  className="form-input" placeholder="Nhập mỗi dịch vụ trên 1 dòng..." style={{ resize: 'vertical', fontSize: 13 }} />
              </div>

              <div className="admin-modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="admin-modal-cancel">
                  Huỷ
                </button>
                <button type="submit" disabled={saving} className="admin-modal-submit">
                  {saving ? 'Đang lưu...' : (editId ? 'Cập nhật' : 'Thêm sân')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
