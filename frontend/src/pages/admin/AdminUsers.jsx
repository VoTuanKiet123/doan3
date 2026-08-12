import { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Users, Trash2, ShieldCheck, UserCircle } from 'lucide-react';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = () => {
    api.get('/users').then(res => {
      setUsers(res.data.users);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Bạn có chắc muốn xóa người dùng "${name}"?`)) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('Xóa người dùng thành công');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi xóa');
    }
  };

  const roleMap = {
    admin: { text: 'Admin', cls: 'badge badge-admin-role' },
    user: { text: 'Người dùng', cls: 'badge badge-user-role' },
  };

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Quản lý người dùng</h1>
          <p className="admin-page-subtitle">Danh sách tất cả người dùng trong hệ thống</p>
        </div>
        <div className="admin-page-header-stat">
          <span className="admin-stat-number">{users.length}</span>
          <span className="admin-stat-label">người dùng</span>
        </div>
      </div>

      {loading ? (
        <div className="admin-loading">
          <div className="admin-loading-spinner"></div>
          <span>Đang tải dữ liệu...</span>
        </div>
      ) : users.length === 0 ? (
        <div className="admin-empty">
          <span className="admin-empty-icon"><Users size={40} /></span>
          <p>Chưa có người dùng nào</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Số điện thoại</th>
                <th>Vai trò</th>
                <th>Ngày tạo</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const r = roleMap[u.role] || roleMap.user;
                return (
                  <tr key={u._id}>
                    <td>
                      <div className="admin-user-cell">
                        <div className="admin-user-avatar-sm">
                          {u.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <span className="admin-user-name">{u.name}</span>
                      </div>
                    </td>
                    <td className="admin-text-secondary">{u.email}</td>
                    <td className="admin-text-secondary">{u.phone || '—'}</td>
                    <td>
                      <span className={r.cls} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {u.role === 'admin' ? <ShieldCheck size={12} /> : <UserCircle size={12} />}
                        {r.text}
                      </span>
                    </td>
                    <td className="admin-text-secondary">
                      {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td>
                      {u.role !== 'admin' ? (
                        <button
                          onClick={() => handleDelete(u._id, u.name)}
                          className="admin-action-btn admin-action-btn--danger"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <Trash2 size={13} /> Xóa
                        </button>
                      ) : (
                        <span className="admin-text-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
