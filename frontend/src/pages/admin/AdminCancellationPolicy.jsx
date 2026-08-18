import { useState, useEffect, useCallback } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";
import { ShieldAlert, Plus, Trash2, Save, Clock } from "lucide-react";

export default function AdminCancellationPolicy() {
  const [policies, setPolicies] = useState([]);
  const [activePolicy, setActivePolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    rules: [{ hoursBefore: 24, refundPercent: 100 }],
    noShowMinutes: 15,
    description: "",
  });

  const fetchPolicies = useCallback(async () => {
    try {
      const res = await api.get("/cancellation-policy/all");
      setPolicies(res.data.policies);
      const active = res.data.policies.find((p) => p.isActive);
      setActivePolicy(active || null);
      if (active) {
        setForm({
          name: active.name,
          rules: [...active.rules],
          noShowMinutes: active.noShowMinutes,
          description: active.description || "",
        });
      }
    } catch (err) {
      toast.error("Không thể tải chính sách");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const addRule = () => {
    setForm((prev) => ({
      ...prev,
      rules: [...prev.rules, { hoursBefore: 0, refundPercent: 0 }],
    }));
  };

  const removeRule = (index) => {
    setForm((prev) => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index),
    }));
  };

  const updateRule = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      rules: prev.rules.map((rule, i) =>
        i === index
          ? {
              ...rule,
              [field]:
                field === "refundPercent"
                  ? Math.min(100, Math.max(0, parseInt(value) || 0))
                  : parseInt(value) || 0,
            }
          : rule,
      ),
    }));
  };

  const handleSave = async () => {
    if (form.rules.length === 0) {
      toast.error("Cần ít nhất 1 rule");
      return;
    }

    try {
      if (activePolicy) {
        await api.put(`/cancellation-policy/${activePolicy._id}`, form);
        toast.success("Cập nhật chính sách thành công!");
      } else {
        await api.post("/cancellation-policy", form);
        toast.success("Tạo chính sách mới thành công!");
      }
      fetchPolicies();
      setEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi lưu chính sách");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Xoá chính sách này?")) return;
    try {
      await api.delete(`/cancellation-policy/${id}`);
      toast.success("Đã xoá");
      fetchPolicies();
    } catch (err) {
      toast.error("Lỗi xoá");
    }
  };

  if (loading) {
    return (
      <div className="admin-page-content">
        <div className="admin-loading">
          <div className="admin-loading-spinner" />
          <span>Đang tải dữ liệu...</span>
        </div>
      </div>
    );
  }

  const historyPolicies = policies.filter((policy) => !policy.isActive);

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <ShieldAlert size={26} style={{ color: "#f59e0b" }} />
              Chính sách huỷ &amp; No-show
            </span>
          </h1>
          <p className="admin-page-subtitle">
            Quản lý refund, chiến lược no-show và điều kiện huỷ đặt sân
          </p>
        </div>
        <button
          onClick={() => setEditing(!editing)}
          className="admin-header-btn"
        >
          {editing
            ? "Huỷ chỉnh sửa"
            : activePolicy
              ? "Chỉnh sửa"
              : "Tạo mới"}
        </button>
      </div>

      {editing && (
        <div className="admin-card admin-policy-form">
          <div className="admin-setting-field">
            <label htmlFor="policy-name">Tên chính sách</label>
            <input
              id="policy-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Ví dụ: Chính sách mặc định"
            />
          </div>

          <div className="admin-setting-field">
            <label>Quy tắc hoàn tiền</label>
            <div className="admin-policy-rules">
              {form.rules.map((rule, i) => (
                <div key={i} className="admin-policy-rule">
                  <span className="admin-policy-rule-label">Huỷ trước</span>
                  <input
                    type="number"
                    min="0"
                    value={rule.hoursBefore}
                    onChange={(e) => updateRule(i, "hoursBefore", e.target.value)}
                  />
                  <span className="admin-policy-rule-label">giờ</span>
                  <span className="admin-policy-rule-label">→ hoàn</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={rule.refundPercent}
                    onChange={(e) => updateRule(i, "refundPercent", e.target.value)}
                  />
                  <span className="admin-policy-rule-label">%</span>
                  <button
                    type="button"
                    onClick={() => removeRule(i)}
                    className="admin-policy-rule-delete"
                    aria-label="Xoá quy tắc"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addRule} className="admin-btn admin-btn--outline admin-policy-add-btn">
              <Plus size={16} /> Thêm quy tắc
            </button>
          </div>

          <div className="admin-setting-grid">
            <div className="admin-setting-field">
              <label htmlFor="no-show-minutes">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Clock size={14} /> Thời gian no-show (phút)
                </span>
              </label>
              <input
                id="no-show-minutes"
                type="number"
                min="0"
                value={form.noShowMinutes}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    noShowMinutes: parseInt(e.target.value) || 0,
                  }))
                }
              />
              <p className="admin-setting-note">
                Quá thời gian này mà khách không đến sẽ được đánh dấu no-show.
              </p>
            </div>

            <div className="admin-setting-field">
              <label htmlFor="policy-description">Mô tả</label>
              <input
                id="policy-description"
                type="text"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Mô tả ngắn gọn về chính sách..."
              />
            </div>
          </div>

          <div className="admin-setting-actions">
            <button type="button" onClick={handleSave} className="admin-header-btn">
              <Save size={16} /> Lưu chính sách
            </button>
          </div>
        </div>
      )}

      {!editing && activePolicy && (
        <div className="admin-card">
          <div className="admin-policy-summary">
            <div className="admin-policy-header-row">
              <span className="admin-policy-badge">ĐANG ÁP DỤNG</span>
              <h2>{activePolicy.name}</h2>
            </div>

            <div className="admin-policy-list">
              {[...activePolicy.rules]
                .sort((a, b) => b.hoursBefore - a.hoursBefore)
                .map((rule, index) => (
                  <div key={`${rule.hoursBefore}-${index}`} className="admin-policy-row">
                    <span>Huỷ trước ≥ {rule.hoursBefore} giờ</span>
                    <strong
                      className={
                        rule.refundPercent === 100
                          ? "admin-policy-refund admin-policy-refund--full"
                          : rule.refundPercent >= 50
                            ? "admin-policy-refund admin-policy-refund--mid"
                            : "admin-policy-refund admin-policy-refund--low"
                      }
                    >
                      Hoàn {rule.refundPercent}%
                    </strong>
                  </div>
                ))}
            </div>

            <div className="admin-policy-meta">
              <Clock size={14} />
              <span>No-show sau: {activePolicy.noShowMinutes} phút</span>
            </div>

            {activePolicy.description && (
              <p className="admin-setting-note" style={{ margin: 0 }}>
                {activePolicy.description}
              </p>
            )}
          </div>
        </div>
      )}

      {!editing && !activePolicy && (
        <div className="admin-card admin-empty">
          <ShieldAlert size={48} className="admin-empty-icon" />
          <p>Chưa có chính sách huỷ nào</p>
          <span>Nhấn “Tạo mới” để thiết lập chính sách cho khách hàng.</span>
        </div>
      )}

      {historyPolicies.length > 0 && (
        <div className="admin-table-wrap">
          <div className="admin-table-header">
            <h2>Lịch sử chính sách</h2>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tên chính sách</th>
                <th>Quy tắc</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {historyPolicies.map((policy) => (
                <tr key={policy._id}>
                  <td>
                    <strong style={{ color: "#1e293b" }}>{policy.name}</strong>
                  </td>
                  <td>
                    {policy.rules
                      .map((r) => `${r.hoursBefore}h → ${r.refundPercent}%`)
                      .join(" | ")}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleDelete(policy._id)}
                      className="admin-btn admin-btn--outline admin-policy-delete-btn"
                    >
                      <Trash2 size={14} /> Xoá
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
