import { useState } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";
import {
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  User,
  Phone,
  ChevronDown,
} from "lucide-react";

export default function POSCheckIn() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDate, setSearchDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      toast.error("Vui lòng nhập ít nhất 2 ký tự");
      return;
    }
    setSearching(true);
    try {
      const res = await api.get("/pos/bookings/search", {
        params: { q: searchQuery, date: searchDate },
      });
      setSearchResults(res.data.bookings);
      if (res.data.bookings.length === 0) {
        toast("Không tìm thấy booking nào", { icon: "🔍" });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi tìm kiếm");
    } finally {
      setSearching(false);
    }
  };

  const handleCheckIn = async (bookingId) => {
    const method = prompt("Phương thức thanh toán (cash/transfer)?", "cash");
    if (!method) return;

    try {
      const res = await api.put(`/pos/bookings/${bookingId}/checkin`, {
        paymentMethod: method,
      });
      toast.success(res.data.message);
      setSelectedBooking(null);
      handleSearch(); // Refresh results
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi check-in");
    }
  };

  const handleCancel = async () => {
    if (!selectedBooking) return;
    const reason = prompt("Lý do huỷ:", "Khách yêu cầu huỷ");
    if (!reason) return;

    try {
      const res = await api.put(`/pos/bookings/${selectedBooking._id}/cancel`, {
        reason,
        paymentMethod: "cash",
      });
      toast.success(res.data.message);
      setShowCancelModal(false);
      setSelectedBooking(null);
      handleSearch();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi huỷ booking");
    }
  };

  const handleReschedule = async () => {
    if (!selectedBooking) return;
    const newDate =
      prompt("Ngày mới (YYYY-MM-DD):", selectedBooking.date) ||
      selectedBooking.date;
    const newStart = prompt(
      "Giờ bắt đầu mới (HH:mm):",
      selectedBooking.startTime,
    );
    const newEnd = prompt("Giờ kết thúc mới (HH:mm):", selectedBooking.endTime);
    if (!newStart || !newEnd) return;

    try {
      const res = await api.put(
        `/pos/bookings/${selectedBooking._id}/reschedule`,
        {
          newDate,
          newStartTime: newStart,
          newEndTime: newEnd,
        },
      );
      toast.success(res.data.message);
      setShowRescheduleModal(false);
      setSelectedBooking(null);
      handleSearch();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi dời lịch");
    }
  };

  const handleNoShow = async (bookingId) => {
    if (!confirm("Xác nhận đánh dấu no-show?")) return;
    try {
      const res = await api.put(`/pos/bookings/${bookingId}/noshow`);
      toast.success(res.data.message);
      handleSearch();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi");
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
        <CheckCircle size={24} className="text-green-600" />
        Check-in khách đã đặt
      </h2>

      {/* Search Bar */}
      <div className="bg-white rounded-xl p-4 shadow-sm border">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Nhập SĐT, tên khách hoặc mã booking..."
              className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <input
            type="date"
            className="border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-green-500 outline-none"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-medium transition flex items-center gap-2 disabled:opacity-50"
          >
            {searching ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : (
              <Search size={18} />
            )}
            Tìm
          </button>
        </div>
      </div>

      {/* Results */}
      {searchResults.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm text-gray-500">
            Tìm thấy {searchResults.length} booking
          </div>

          {searchResults.map((booking) => (
            <div
              key={booking._id}
              className="bg-white rounded-xl p-4 shadow-sm border hover:border-green-300 transition cursor-pointer"
              onClick={() => setSelectedBooking(booking)}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-lg">
                      {booking.court?.name || "Sân"}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        booking.status === "confirmed"
                          ? "bg-blue-100 text-blue-700"
                          : booking.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : booking.status === "checked_in"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {booking.status === "checked_in"
                        ? "Đã check-in"
                        : booking.status === "confirmed"
                          ? "Đã xác nhận"
                          : booking.status === "pending"
                            ? "Chờ thanh toán"
                            : booking.status}
                    </span>
                    {booking.bookingType === "walk-in" && (
                      <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-medium">
                        Walk-in
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    📅 {booking.date} · ⏰ {booking.startTime} -{" "}
                    {booking.endTime}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <User size={14} /> {booking.user?.name || "Khách"}
                    </span>
                    {booking.customerPhone && (
                      <span className="flex items-center gap-1">
                        <Phone size={14} /> {booking.customerPhone}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 font-semibold text-green-700">
                    {booking.totalPrice?.toLocaleString()}đ
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {!booking.checkedIn &&
                    (booking.status === "confirmed" ||
                      booking.status === "pending") && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCheckIn(booking._id);
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1"
                      >
                        <CheckCircle size={16} /> Check-in
                      </button>
                    )}
                  {booking.checkedIn && (
                    <span className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1">
                      ✅ Đã check-in
                    </span>
                  )}
                  {["pending", "confirmed"].includes(booking.status) &&
                    !booking.checkedIn && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNoShow(booking._id);
                        }}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm transition flex items-center gap-1"
                      >
                        <XCircle size={16} /> No-show
                      </button>
                    )}
                  {!["cancelled", "no_show"].includes(booking.status) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBooking(booking);
                        setShowRescheduleModal(true);
                      }}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-lg text-sm transition"
                    >
                      🔄 Đổi giờ
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {!searching && searchResults.length === 0 && searchQuery.length >= 2 && (
        <div className="text-center py-8 text-gray-400">
          <Search size={48} className="mx-auto mb-3 opacity-50" />
          <p>Không tìm thấy booking nào</p>
          <p className="text-sm">Thử lại với SĐT hoặc tên khác</p>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && selectedBooking && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowCancelModal(false)}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-red-600 mb-3">
              ⚠️ Xác nhận huỷ booking
            </h3>
            <div className="text-sm text-gray-600 mb-4">
              <p>
                Sân: <strong>{selectedBooking.court?.name}</strong>
              </p>
              <p>
                Ngày: {selectedBooking.date} · {selectedBooking.startTime} -{" "}
                {selectedBooking.endTime}
              </p>
              <p>
                Tiền đã thu:{" "}
                <strong>{selectedBooking.totalPrice?.toLocaleString()}đ</strong>
              </p>
              <p className="mt-2 text-yellow-600">
                <AlertCircle size={16} className="inline mr-1" />
                Hệ thống sẽ tự tính % hoàn tiền theo chính sách huỷ
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-medium transition"
              >
                Xác nhận huỷ
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg font-medium transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && selectedBooking && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowRescheduleModal(false)}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-blue-600 mb-3">
              🔄 Dời lịch
            </h3>
            <div className="text-sm text-gray-600 mb-4">
              <p>
                Hiện tại:{" "}
                <strong>
                  {selectedBooking.date} · {selectedBooking.startTime} -{" "}
                  {selectedBooking.endTime}
                </strong>
              </p>
              <p>Sân: {selectedBooking.court?.name}</p>
            </div>
            <div className="space-y-3 mb-4">
              <input
                id="rsDate"
                type="date"
                defaultValue={selectedBooking.date}
                className="w-full border rounded-lg px-3 py-2"
              />
              <div className="flex gap-2">
                <input
                  id="rsStart"
                  type="time"
                  defaultValue={selectedBooking.startTime}
                  className="flex-1 border rounded-lg px-3 py-2"
                />
                <input
                  id="rsEnd"
                  type="time"
                  defaultValue={selectedBooking.endTime}
                  className="flex-1 border rounded-lg px-3 py-2"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleReschedule}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition"
              >
                Xác nhận dời
              </button>
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg font-medium transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
