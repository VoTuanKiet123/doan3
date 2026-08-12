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
    if (!confirm("Xoá chính sách này?")) return;
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-700"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <ShieldAlert size={28} className="text-orange-600" />
          Chính sách huỷ & No-show
        </h1>
        <button
          onClick={() => setEditing(!editing)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          {editing
            ? "Huỷ chỉnh sửa"
            : activePolicy
              ? "✏️ Chỉnh sửa"
              : "➕ Tạo mới"}
        </button>
      </div>

      {/* Edit Form */}
      {editing && (
        <div className="bg-white rounded-xl p-6 shadow-sm border space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-600 block mb-1">
              Tên chính sách
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600 block mb-2">
              Quy tắc hoàn tiền
            </label>
            <div className="space-y-2">
              {form.rules.map((rule, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-gray-50 rounded-lg p-3"
                >
                  <span className="text-sm text-gray-500">Huỷ trước</span>
                  <input
                    type="number"
                    min="0"
                    value={rule.hoursBefore}
                    onChange={(e) =>
                      updateRule(i, "hoursBefore", e.target.value)
                    }
                    className="w-20 border rounded px-2 py-1.5 text-center focus:ring-2 focus:ring-green-500 outline-none"
                  />
                  <span className="text-sm text-gray-500">giờ → hoàn</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={rule.refundPercent}
                    onChange={(e) =>
                      updateRule(i, "refundPercent", e.target.value)
                    }
                    className="w-20 border rounded px-2 py-1.5 text-center focus:ring-2 focus:ring-green-500 outline-none"
                  />
                  <span className="text-sm text-gray-500">%</span>
                  <button
                    onClick={() => removeRule(i)}
                    className="ml-auto p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addRule}
              className="mt-2 text-green-600 hover:text-green-700 text-sm flex items-center gap-1"
            >
              <Plus size={14} /> Thêm rule
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1 flex items-center gap-1">
                <Clock size={14} /> Thời gian no-show (phút)
              </label>
              <input
                type="number"
                min="0"
                value={form.noShowMinutes}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    noShowMinutes: parseInt(e.target.value) || 0,
                  }))
                }
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                Quá thời gian này mà khách chưa đến → đánh dấu no-show
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1">
                Mô tả
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="Mô tả ngắn gọn..."
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-medium transition flex items-center gap-2"
          >
            <Save size={18} />
            Lưu chính sách
          </button>
        </div>
      )}

      {/* Active Policy Display */}
      {!editing && activePolicy && (
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
              ĐANG ÁP DỤNG
            </span>
            <h2 className="text-lg font-bold">{activePolicy.name}</h2>
          </div>

          <div className="space-y-2 mb-4">
            {activePolicy.rules
              .sort((a, b) => b.hoursBefore - a.hoursBefore)
              .map((rule, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-gray-50 rounded-lg p-3"
                >
                  <span className="text-sm">
                    Huỷ trước <strong>≥ {rule.hoursBefore}h</strong> →{" "}
                    <strong
                      className={
                        rule.refundPercent === 100
                          ? "text-green-600"
                          : rule.refundPercent >= 50
                            ? "text-yellow-600"
                            : "text-red-600"
                      }
                    >
                      Hoàn {rule.refundPercent}%
                    </strong>
                  </span>
                </div>
              ))}
          </div>

          <div className="text-sm text-gray-500">
            <Clock size={14} className="inline mr-1" />
            No-show sau: <strong>{activePolicy.noShowMinutes} phút</strong>
            {activePolicy.description && (
              <p className="mt-1 text-gray-400">{activePolicy.description}</p>
            )}
          </div>
        </div>
      )}

      {!editing && !activePolicy && (
        <div className="text-center py-12 text-gray-400">
          <ShieldAlert size={48} className="mx-auto mb-3 opacity-50" />
          <p>Chưa có chính sách huỷ nào</p>
          <p className="text-sm">Nhấn "Tạo mới" để thiết lập</p>
        </div>
      )}

      {/* History */}
      {policies.length > 1 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <h3 className="font-bold text-gray-800 mb-3">
            📋 Lịch sử chính sách
          </h3>
          <div className="space-y-2">
            {policies
              .filter((p) => !p.isActive)
              .map((policy) => (
                <div
                  key={policy._id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100"
                >
                  <div>
                    <div className="font-medium text-sm">{policy.name}</div>
                    <div className="text-xs text-gray-500">
                      {policy.rules
                        .map((r) => `${r.hoursBefore}h→${r.refundPercent}%`)
                        .join(" | ")}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(policy._id)}
                    className="text-red-400 hover:text-red-600 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
