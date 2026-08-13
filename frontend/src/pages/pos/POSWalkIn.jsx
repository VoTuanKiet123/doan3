import { useState, useEffect } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";
import { UserPlus, Clock, MapPin, Phone, User, Zap } from "lucide-react";

const courtStatusInfo = {
  available: { label: "Trống", dot: "#10b981", bg: "#ecfdf5", text: "#065f46" },
  in_use: { label: "Đang mở phiên", dot: "#f59e0b", bg: "#fffbeb", text: "#92400e" },
  reserved: { label: "Đã đặt", dot: "#3b82f6", bg: "#eff6ff", text: "#1e40af" },
  maintenance: { label: "Bảo trì", dot: "#ef4444", bg: "#fef2f2", text: "#b91c1c" },
};

export default function POSWalkIn() {
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    courtId: "",
    date: new Date().toISOString().split("T")[0],
    startTime: "",
    endTime: "",
    customerName: "",
    customerPhone: "",
    note: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCourts();
  }, []);

  const fetchCourts = async () => {
    try {
      const res = await api.get("/pos/courts-status");
      setCourts(res.data.courts);
    } catch (err) {
      toast.error("Không thể tải danh sách sân");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.courtId || !form.startTime || !form.endTime) {
      toast.error("Vui lòng chọn sân và khung giờ");
      return;
    }
    if (form.startTime >= form.endTime) {
      toast.error("Giờ kết thúc phải sau giờ bắt đầu");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/pos/bookings/walkin", form);
      toast.success(res.data.message);
      setForm((prev) => ({
        ...prev,
        startTime: "",
        endTime: "",
        customerName: "",
        customerPhone: "",
        note: "",
      }));
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi tạo booking");
    } finally {
      setSubmitting(false);
    }
  };

  const quickSlots = [
    { label: "1 tiếng", minutes: 60 },
    { label: "1.5 tiếng", minutes: 90 },
    { label: "2 tiếng", minutes: 120 },
  ];

  const applyQuickSlot = (minutes) => {
    if (!form.startTime) {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, "0");
      const m = String(now.getMinutes()).padStart(2, "0");
      const start = `${h}:${m}`;
      const endDate = new Date(now.getTime() + minutes * 60000);
      const end = `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;
      setForm((prev) => ({ ...prev, startTime: start, endTime: end }));
    } else {
      const [sh, sm] = form.startTime.split(":").map(Number);
      const totalMin = sh * 60 + sm + minutes;
      const eh = Math.floor(totalMin / 60);
      const em = totalMin % 60;
      setForm((prev) => ({
        ...prev,
        endTime: `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`,
      }));
    }
  };

  const selectedCourt = courts.find((c) => c._id === form.courtId);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 240, gap: 12, color: "#047857" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #a7f3d0", borderTopColor: "#10b981", animation: "spin 0.8s linear infinite" }} />
        <span style={{ fontWeight: 600, fontSize: 14 }}>Đang tải...</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Page header */}
      <div
        style={{
          background: "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)",
          borderRadius: 16,
          padding: "20px 24px",
          color: "white",
          display: "flex",
          alignItems: "center",
          gap: 14,
          boxShadow: "0 6px 20px rgba(59,130,246,0.35)",
        }}
      >
        <div
          style={{
            width: 50,
            height: 50,
            borderRadius: 14,
            background: "rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <UserPlus size={26} />
        </div>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Khách vãng lai</h1>
          <p style={{ fontSize: 13, opacity: 0.85, margin: "2px 0 0" }}>
            Đặt sân và mở phiên chơi ngay tức thì
          </p>
        </div>
      </div>

      {/* Info box */}
      <div
        style={{
          background: "#fffbeb",
          border: "1px solid #fde68a",
          borderRadius: 12,
          padding: "12px 16px",
          fontSize: 13,
          color: "#92400e",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 16 }}>ℹ️</span>
        Phiên sẽ được <strong>mở ngay (Check-in)</strong>. Thanh toán sẽ thực hiện khi Check-out.
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Chọn sân */}
        <div
          style={{
            background: "white",
            borderRadius: 16,
            padding: 20,
            boxShadow: "0 2px 8px rgba(4,120,87,0.06)",
            border: "1px solid #d1fae5",
          }}
        >
          <h3
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#064e3b",
              marginBottom: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ background: "#ecfdf5", borderRadius: 8, padding: "4px 8px", display: "flex", alignItems: "center" }}>
              <MapPin size={16} color="#10b981" />
            </span>
            Chọn sân
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
              gap: 10,
            }}
          >
            {courts.map((court) => {
              const info = courtStatusInfo[court.currentStatus] || courtStatusInfo.available;
              const isSelected = form.courtId === court._id;
              const isDisabled = court.currentStatus !== "available";
              return (
                <button
                  key={court._id}
                  type="button"
                  onClick={() => !isDisabled && handleChange("courtId", court._id)}
                  disabled={isDisabled}
                  style={{
                    padding: "12px 8px",
                    borderRadius: 12,
                    border: isSelected
                      ? "2px solid #3b82f6"
                      : `2px solid ${isDisabled ? "#e5e7eb" : info.bg}`,
                    background: isSelected
                      ? "linear-gradient(135deg, #eff6ff, #dbeafe)"
                      : isDisabled
                      ? "#f9fafb"
                      : info.bg,
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    opacity: isDisabled ? 0.55 : 1,
                    textAlign: "center",
                    transition: "all 0.2s",
                    transform: isSelected ? "scale(1.03)" : "scale(1)",
                    boxShadow: isSelected ? "0 4px 14px rgba(59,130,246,0.25)" : "none",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 14,
                      color: isSelected ? "#1d4ed8" : info.text,
                    }}
                  >
                    {court.name}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      marginTop: 5,
                    }}
                  >
                    <div
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: isSelected ? "#3b82f6" : info.dot,
                      }}
                    />
                    <span style={{ fontSize: 10, color: isSelected ? "#1d4ed8" : info.text, fontWeight: 600 }}>
                      {info.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          {selectedCourt && (
            <div
              style={{
                marginTop: 12,
                padding: "8px 14px",
                background: "#eff6ff",
                borderRadius: 8,
                fontSize: 13,
                color: "#1d4ed8",
                fontWeight: 600,
                border: "1px solid #bfdbfe",
              }}
            >
              ✓ Đã chọn: {selectedCourt.name}
            </div>
          )}
        </div>

        {/* Thời gian */}
        <div
          style={{
            background: "white",
            borderRadius: 16,
            padding: 20,
            boxShadow: "0 2px 8px rgba(4,120,87,0.06)",
            border: "1px solid #d1fae5",
          }}
        >
          <h3
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#064e3b",
              marginBottom: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ background: "#ecfdf5", borderRadius: 8, padding: "4px 8px", display: "flex", alignItems: "center" }}>
              <Clock size={16} color="#10b981" />
            </span>
            Thời gian
          </h3>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>
                Ngày
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => handleChange("date", e.target.value)}
                style={{
                  border: "1.5px solid #d1fae5",
                  borderRadius: 10,
                  padding: "9px 12px",
                  fontSize: 13,
                  outline: "none",
                  fontFamily: "inherit",
                  color: "#064e3b",
                  background: "#f9fffe",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#10b981")}
                onBlur={(e) => (e.target.style.borderColor = "#d1fae5")}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>
                Bắt đầu
              </label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => handleChange("startTime", e.target.value)}
                style={{
                  border: "1.5px solid #d1fae5",
                  borderRadius: 10,
                  padding: "9px 12px",
                  fontSize: 13,
                  outline: "none",
                  fontFamily: "inherit",
                  color: "#064e3b",
                  background: "#f9fffe",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#10b981")}
                onBlur={(e) => (e.target.style.borderColor = "#d1fae5")}
              />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 9, color: "#9ca3af" }}>
              →
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>
                Kết thúc
              </label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => handleChange("endTime", e.target.value)}
                style={{
                  border: "1.5px solid #d1fae5",
                  borderRadius: 10,
                  padding: "9px 12px",
                  fontSize: 13,
                  outline: "none",
                  fontFamily: "inherit",
                  color: "#064e3b",
                  background: "#f9fffe",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#10b981")}
                onBlur={(e) => (e.target.style.borderColor = "#d1fae5")}
              />
            </div>
          </div>

          {/* Quick time slots */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "flex", alignItems: "center", gap: 4 }}>
              <Zap size={12} /> Nhanh:
            </span>
            {quickSlots.map((slot) => (
              <button
                key={slot.minutes}
                type="button"
                onClick={() => applyQuickSlot(slot.minutes)}
                style={{
                  background: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  color: "#065f46",
                  padding: "5px 12px",
                  borderRadius: 99,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = "#d1fae5";
                  e.target.style.borderColor = "#6ee7b7";
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = "#ecfdf5";
                  e.target.style.borderColor = "#a7f3d0";
                }}
              >
                {slot.label}
              </button>
            ))}
          </div>
        </div>

        {/* Thông tin khách */}
        <div
          style={{
            background: "white",
            borderRadius: 16,
            padding: 20,
            boxShadow: "0 2px 8px rgba(4,120,87,0.06)",
            border: "1px solid #d1fae5",
          }}
        >
          <h3
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#064e3b",
              marginBottom: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ background: "#ecfdf5", borderRadius: 8, padding: "4px 8px", display: "flex", alignItems: "center" }}>
              <User size={16} color="#10b981" />
            </span>
            Thông tin khách <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400 }}>(tuỳ chọn)</span>
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>
                Tên khách
              </label>
              <input
                type="text"
                value={form.customerName}
                onChange={(e) => handleChange("customerName", e.target.value)}
                placeholder="Nhập tên khách..."
                style={{
                  width: "100%",
                  border: "1.5px solid #d1fae5",
                  borderRadius: 10,
                  padding: "9px 12px",
                  fontSize: 13,
                  outline: "none",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                  background: "#f9fffe",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#10b981")}
                onBlur={(e) => (e.target.style.borderColor = "#d1fae5")}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                <Phone size={12} /> Số điện thoại
              </label>
              <input
                type="tel"
                value={form.customerPhone}
                onChange={(e) => handleChange("customerPhone", e.target.value)}
                placeholder="Nhập SĐT..."
                style={{
                  width: "100%",
                  border: "1.5px solid #d1fae5",
                  borderRadius: 10,
                  padding: "9px 12px",
                  fontSize: 13,
                  outline: "none",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                  background: "#f9fffe",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#10b981")}
                onBlur={(e) => (e.target.style.borderColor = "#d1fae5")}
              />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <input
              type="text"
              value={form.note}
              onChange={(e) => handleChange("note", e.target.value)}
              placeholder="Ghi chú (tuỳ chọn)..."
              style={{
                width: "100%",
                border: "1.5px solid #d1fae5",
                borderRadius: 10,
                padding: "9px 12px",
                fontSize: 13,
                outline: "none",
                fontFamily: "inherit",
                boxSizing: "border-box",
                background: "#f9fffe",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#10b981")}
              onBlur={(e) => (e.target.style.borderColor = "#d1fae5")}
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !form.courtId || !form.startTime || !form.endTime}
          style={{
            width: "100%",
            background:
              submitting || !form.courtId || !form.startTime || !form.endTime
                ? "#e5e7eb"
                : "linear-gradient(135deg, #1d4ed8, #3b82f6)",
            color:
              submitting || !form.courtId || !form.startTime || !form.endTime
                ? "#9ca3af"
                : "white",
            border: "none",
            borderRadius: 14,
            padding: "16px",
            fontSize: 15,
            fontWeight: 800,
            cursor:
              submitting || !form.courtId || !form.startTime || !form.endTime
                ? "not-allowed"
                : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            fontFamily: "inherit",
            transition: "all 0.25s",
            boxShadow:
              !form.courtId || !form.startTime || !form.endTime
                ? "none"
                : "0 6px 20px rgba(59,130,246,0.4)",
          }}
        >
          {submitting ? (
            <>
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  border: "3px solid rgba(255,255,255,0.4)",
                  borderTopColor: "white",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              Đang xử lý...
            </>
          ) : (
            <>
              <UserPlus size={20} />
              Mở phiên & Cho vào sân
            </>
          )}
        </button>
      </form>
    </div>
  );
}
