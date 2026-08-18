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
      <div className="admin-page-content">
        <div className="admin-loading">
          <div className="admin-loading-spinner" />
          <span>Đang tải dữ liệu...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Settings size={26} style={{ color: "#64748b" }} />
              Cấu hình hệ thống
            </span>
          </h1>
          <p className="admin-page-subtitle">
            Thiết lập quỹ tiền lẻ, thông tin sân và giờ hoạt động
          </p>
        </div>
      </div>

      <div className="admin-card admin-setting-section">
        <div className="admin-setting-section-header">
          <DollarSign size={20} style={{ color: "#7c3aed" }} />
          <h3>Quỹ tiền lẻ định mức (Imprest System)</h3>
        </div>

        <p className="admin-setting-description">
          Quỹ định mức là khoản tiền mặt cố định luôn có trong quầy để thối tiền khách.
          Khoản này <strong>không phải doanh thu</strong> và được giữ nguyên qua mọi ca làm việc.
          Nhân viên POS sẽ không được tự ý thay đổi con số này.
        </p>

        <div className="admin-setting-field admin-setting-field--compact">
          <label htmlFor="float-amount">Số tiền quỹ định mức (VNĐ)</label>
          <input
            id="float-amount"
            type="number"
            min="0"
            step="100000"
            value={form.floatAmount}
            onChange={(e) => handleChange("floatAmount", parseInt(e.target.value) || 0)}
          />
          <p className="admin-setting-note">Đề xuất: 500.000đ - 1.000.000đ tùy quy mô sân.</p>
        </div>
      </div>

      <div className="admin-card admin-setting-section">
        <div className="admin-setting-section-header">
          <Building2 size={20} style={{ color: "#2563eb" }} />
          <h3>Thông tin sân</h3>
        </div>

        <div className="admin-setting-grid">
          <div className="admin-setting-field">
            <label htmlFor="venue-name">Tên sân / Venue</label>
            <input
              id="venue-name"
              type="text"
              value={form.venueName}
              onChange={(e) => handleChange("venueName", e.target.value)}
              placeholder="Sân Cầu Lông Badminton Center"
            />
          </div>

          <div className="admin-setting-field">
            <label htmlFor="venue-phone">Số điện thoại</label>
            <input
              id="venue-phone"
              type="text"
              value={form.venuePhone}
              onChange={(e) => handleChange("venuePhone", e.target.value)}
              placeholder="0901234567"
            />
          </div>

          <div className="admin-setting-field admin-setting-field--full">
            <label htmlFor="venue-address">Địa chỉ</label>
            <input
              id="venue-address"
              type="text"
              value={form.venueAddress}
              onChange={(e) => handleChange("venueAddress", e.target.value)}
              placeholder="123 Nguyễn Huệ, Quận 1, TP.HCM"
            />
          </div>

          <div className="admin-setting-field">
            <label htmlFor="open-time">Giờ mở cửa</label>
            <input
              id="open-time"
              type="time"
              value={form.openTime}
              onChange={(e) => handleChange("openTime", e.target.value)}
            />
          </div>

          <div className="admin-setting-field">
            <label htmlFor="close-time">Giờ đóng cửa</label>
            <input
              id="close-time"
              type="time"
              value={form.closeTime}
              onChange={(e) => handleChange("closeTime", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="admin-setting-actions">
        <button onClick={handleSave} disabled={saving} className="admin-header-btn">
          <Save size={18} />
          {saving ? "Đang lưu..." : "Lưu cấu hình"}
        </button>
      </div>
    </div>
  );
}
