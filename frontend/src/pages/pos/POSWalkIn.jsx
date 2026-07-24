import { useState, useEffect } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";
import { UserPlus, Clock, MapPin, Phone, User, CreditCard } from "lucide-react";

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
    paymentMethod: "cash",
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
      // Reset form
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

  // Quick time slots
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-700"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
        <UserPlus size={24} className="text-blue-600" />
        Khách vãng lai · Đặt & Check-in
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Chọn sân */}
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <MapPin size={18} /> Chọn sân
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {courts.map((court) => (
              <button
                key={court._id}
                type="button"
                onClick={() => handleChange("courtId", court._id)}
                className={`p-3 rounded-lg border-2 text-center transition ${
                  form.courtId === court._id
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : court.currentStatus === "available"
                      ? "border-gray-200 hover:border-green-300 bg-white"
                      : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
                disabled={court.currentStatus !== "available"}
              >
                <div className="font-bold">{court.name}</div>
                <div className="text-xs mt-1">
                  {court.currentStatus === "available"
                    ? "🟢 Trống"
                    : court.currentStatus === "in_use"
                      ? "🏸 Đang chơi"
                      : court.currentStatus === "reserved"
                        ? "📅 Đã đặt"
                        : "🔧 Bảo trì"}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Thời gian */}
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Clock size={18} /> Thời gian
          </h3>
          <div className="flex flex-col sm:flex-row gap-3 mb-3">
            <input
              type="date"
              value={form.date}
              onChange={(e) => handleChange("date", e.target.value)}
              className="border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <div className="flex gap-2 items-center">
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => handleChange("startTime", e.target.value)}
                className="border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Bắt đầu"
              />
              <span className="text-gray-400">→</span>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => handleChange("endTime", e.target.value)}
                className="border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Kết thúc"
              />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {quickSlots.map((slot) => (
              <button
                key={slot.minutes}
                type="button"
                onClick={() => applyQuickSlot(slot.minutes)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm transition"
              >
                ⚡ {slot.label}
              </button>
            ))}
          </div>
        </div>

        {/* Thông tin khách */}
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <User size={18} /> Thông tin khách
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-500 mb-1 block">
                Tên khách
              </label>
              <input
                type="text"
                value={form.customerName}
                onChange={(e) => handleChange("customerName", e.target.value)}
                placeholder="Nhập tên (tuỳ chọn)"
                className="w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-1 block flex items-center gap-1">
                <Phone size={14} /> Số điện thoại
              </label>
              <input
                type="tel"
                value={form.customerPhone}
                onChange={(e) => handleChange("customerPhone", e.target.value)}
                placeholder="Nhập SĐT"
                className="w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Thanh toán */}
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <CreditCard size={18} /> Thanh toán
          </h3>
          <div className="flex gap-3">
            <label
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 cursor-pointer transition ${
                form.paymentMethod === "cash"
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200"
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="cash"
                checked={form.paymentMethod === "cash"}
                onChange={(e) => handleChange("paymentMethod", e.target.value)}
                className="hidden"
              />
              💵 Tiền mặt
            </label>
            <label
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 cursor-pointer transition ${
                form.paymentMethod === "transfer"
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200"
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="transfer"
                checked={form.paymentMethod === "transfer"}
                onChange={(e) => handleChange("paymentMethod", e.target.value)}
                className="hidden"
              />
              📱 Chuyển khoản
            </label>
          </div>
        </div>

        {/* Note */}
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <input
            type="text"
            value={form.note}
            onChange={(e) => handleChange("note", e.target.value)}
            placeholder="Ghi chú (tuỳ chọn)..."
            className="w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={
            submitting || !form.courtId || !form.startTime || !form.endTime
          }
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 rounded-xl font-bold text-lg transition flex items-center justify-center gap-2"
        >
          {submitting ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          ) : (
            <>
              <UserPlus size={20} />
              Tạo booking & Check-in ngay
            </>
          )}
        </button>
      </form>
    </div>
  );
}
