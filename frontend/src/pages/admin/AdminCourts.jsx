import { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Pencil, Trash2, PlusCircle, Volleyball } from 'lucide-react';

const emptyForm = { name: '', description: '', pricePerHour: '', status: 'active' };

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
    setForm({ name: court.name, description: court.description || '', pricePerHour: court.pricePerHour, status: court.status });
    setEditId(court._id);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        await api.put(`/courts/${editId}`, form);
        toast.success('Cập nhật sân thành công');
      } else {
        await api.post('/courts', form);
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

  const statusMap = { active: 'Hoạt động', inactive: 'Tạm đóng', maintenance: 'Bảo trì' };
  const statusCls = {
    active: 'badge badge-active',
    inactive: 'badge badge-inactive',
    maintenance: 'badge badge-maintenance',
  };

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Quản lý sân</h1>
          <p className="admin-page-subtitle">Thêm, sửa, xóa sân cầu lông</p>
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
                <th>Mô tả</th>
                <th>Giá/giờ</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {courts.length === 0 ? (
                <tr><td colSpan={5} className="admin-table-empty">Chưa có sân nào</td></tr>
              ) : courts.map((court) => (
                <tr key={court._id}>
                  <td className="admin-user-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Volleyball size={15} style={{ color: '#0D9D57', flexShrink: 0 }} /> {court.name}
                  </td>
                  <td className="admin-text-secondary admin-text-truncate">{court.description || '—'}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <h2 className="admin-modal-title">{editId ? 'Sửa sân' : 'Thêm sân mới'}</h2>
            <form onSubmit={handleSave} className="admin-modal-form">
              <div className="form-group">
                <label className="form-label">Tên sân *</label>
                <input required type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="form-input" placeholder="Sân A1" />
              </div>
              <div className="form-group">
                <label className="form-label">Mô tả</label>
                <textarea rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  className="form-input" placeholder="Mô tả sân..." style={{ resize: 'none' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Giá/giờ (đồng) *</label>
                <input required type="number" min="0" value={form.pricePerHour} onChange={e => setForm({...form, pricePerHour: e.target.value})}
                  className="form-input" placeholder="50000" />
              </div>
              <div className="form-group">
                <label className="form-label">Trạng thái</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}
                  className="form-input">
                  <option value="active">Hoạt động</option>
                  <option value="inactive">Tạm đóng</option>
                  <option value="maintenance">Bảo trì</option>
                </select>
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
