import { useState, useEffect } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";
import { Settings, Save, DollarSign, Building2 } from "lucide-react";

export default function AdminSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    floatAmount: 500000,
    venueName: "",
    venueAddress: "",
    venuePhone: "",
    openTime: "06:00",
    closeTime: "22:00",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get("/settings/admin");
      const s = res.data.settings;
      setSettings(s);
      setForm({
        floatAmount: s.floatAmount || 500000,
        venueName: s.venueName || "",
        venueAddress: s.venueAddress || "",
        venuePhone: s.venuePhone || "",
        openTime: s.openTime || "06:00",
        closeTime: s.closeTime || "22:00",
      });
    } catch (err) {
      toast.error("Không thể tải cấu hình hệ thống");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (form.floatAmount < 0) {
      toast.error("Quỹ định mức không được âm");
      return;
    }

    setSaving(true);
    try {
      const res = await api.put("/settings/admin", form);
      setSettings(res.data.settings);
      toast.success("Đã lưu cấu hình hệ thống!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi lưu cấu hình");
    } finally {
      setSaving(false);
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
      <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <Settings size={28} className="text-gray-600" />
        Cấu hình hệ thống
      </h2>

      {/* Quỹ định mức (Imprest System) */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign size={20} className="text-purple-600" />
          <h3 className="text-lg font-bold text-gray-800">
            Quỹ tiền lẻ định mức (Imprest System)
          </h3>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Quỹ định mức là khoản tiền mặt cố định luôn có trong quầy để thối tiền
          khách. Khoản này <strong>không phải doanh thu</strong> và được giữ
          nguyên qua mọi ca làm việc. Nhân viên POS sẽ không được tự ý thay đổi
          con số này.
        </p>

        <div className="max-w-xs">
          <label className="text-sm text-gray-600 mb-1 block font-medium">
            Số tiền quỹ định mức (VNĐ)
          </label>
          <input
            type="number"
            min="0"
            step="100000"
            value={form.floatAmount}
            onChange={(e) =>
              handleChange("floatAmount", parseInt(e.target.value) || 0)
            }
            className="w-full border rounded-lg px-3 py-2.5 text-lg focus:ring-2 focus:ring-purple-500 outline-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            Đề xuất: 500.000đ - 1.000.000đ tùy quy mô sân
          </p>
        </div>
      </div>

      {/* Thông tin sân */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={20} className="text-blue-600" />
          <h3 className="text-lg font-bold text-gray-800">Thông tin sân</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">
              Tên sân / Venue
            </label>
            <input
              type="text"
              value={form.venueName}
              onChange={(e) => handleChange("venueName", e.target.value)}
              className="w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Sân Cầu Lông Badminton Center"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">
              Số điện thoại
            </label>
            <input
              type="text"
              value={form.venuePhone}
              onChange={(e) => handleChange("venuePhone", e.target.value)}
              className="w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="0901234567"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm text-gray-600 mb-1 block">Địa chỉ</label>
            <input
              type="text"
              value={form.venueAddress}
              onChange={(e) => handleChange("venueAddress", e.target.value)}
              className="w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="123 Nguyễn Huệ, Quận 1, TP.HCM"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">
              Giờ mở cửa
            </label>
            <input
              type="time"
              value={form.openTime}
              onChange={(e) => handleChange("openTime", e.target.value)}
              className="w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">
              Giờ đóng cửa
            </label>
            <input
              type="time"
              value={form.closeTime}
              onChange={(e) => handleChange("closeTime", e.target.value)}
              className="w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-xl font-bold transition flex items-center gap-2"
        >
          <Save size={20} />
          {saving ? "Đang lưu..." : "Lưu cấu hình"}
        </button>
      </div>
    </div>
  );
}
