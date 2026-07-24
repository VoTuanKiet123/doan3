import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import toast from "react-hot-toast";
import {
  Volleyball,
  Clock,
  Users,
  ShoppingCart,
  AlertTriangle,
} from "lucide-react";

const statusConfig = {
  available: {
    label: "Trống",
    color: "bg-green-100 text-green-800 border-green-300",
    icon: "🟢",
  },
  reserved: {
    label: "Đã đặt",
    color: "bg-blue-100 text-blue-800 border-blue-300",
    icon: "📅",
  },
  in_use: {
    label: "Đang chơi",
    color: "bg-orange-100 text-orange-800 border-orange-300",
    icon: "🏸",
  },
  maintenance: {
    label: "Bảo trì",
    color: "bg-red-100 text-red-800 border-red-300",
    icon: "🔧",
  },
};

export default function POSDashboard() {
  const navigate = useNavigate();
  const [courts, setCourts] = useState([]);
  const [currentShift, setCurrentShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState("");
  const [todayStats, setTodayStats] = useState({
    bookings: 0,
    walkins: 0,
    revenue: 0,
  });

  const fetchData = useCallback(async () => {
    try {
      const [courtsRes, shiftRes] = await Promise.all([
        api.get("/pos/courts-status"),
        api.get("/pos/shifts/current"),
      ]);
      setCourts(courtsRes.data.courts);
      setCurrentTime(courtsRes.data.currentTime);
      setCurrentShift(shiftRes.data.shift);

      // Tính stats
      const stats = courtsRes.data.courts.reduce(
        (acc, c) => ({
          bookings: acc.bookings + c.totalBookingsToday,
          walkins: acc.walkins + (c.currentStatus === "in_use" ? 1 : 0),
          revenue: acc.revenue,
        }),
        { bookings: 0, walkins: 0, revenue: 0 },
      );

      if (shiftRes.data.shift) {
        stats.revenue =
          shiftRes.data.shift.totalCashIn + shiftRes.data.shift.totalTransferIn;
      }
      setTodayStats(stats);
    } catch (err) {
      toast.error("Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh mỗi 30s
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-700"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Volleyball size={16} />
            Sân
          </div>
          <div className="text-2xl font-bold">{courts.length}</div>
          <div className="text-xs text-gray-400">
            {courts.filter((c) => c.currentStatus === "available").length} trống
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Clock size={16} />
            Hôm nay
          </div>
          <div className="text-2xl font-bold">{todayStats.bookings}</div>
          <div className="text-xs text-gray-400">lượt đặt</div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Users size={16} />
            Đang chơi
          </div>
          <div className="text-2xl font-bold text-orange-600">
            {courts.filter((c) => c.currentStatus === "in_use").length}
          </div>
          <div className="text-xs text-gray-400">sân đang hoạt động</div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <ShoppingCart size={16} />
            Doanh thu ca
          </div>
          <div className="text-2xl font-bold text-green-700">
            {todayStats.revenue.toLocaleString()}đ
          </div>
          <div className="text-xs text-gray-400">
            {currentShift ? "Ca đang mở" : "Chưa mở ca"}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => navigate("/pos/checkin")}
          className="bg-green-600 hover:bg-green-700 text-white rounded-xl p-4 shadow-sm transition flex flex-col items-center gap-2"
        >
          <ClipboardCheckIcon />
          <span className="font-semibold text-sm">Check-in</span>
          <span className="text-xs text-green-100">Khách đã đặt</span>
        </button>
        <button
          onClick={() => navigate("/pos/walkin")}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-4 shadow-sm transition flex flex-col items-center gap-2"
        >
          <WalkInIcon />
          <span className="font-semibold text-sm">Khách vãng lai</span>
          <span className="text-xs text-blue-100">Đặt + Check-in</span>
        </button>
        <button
          onClick={() => navigate("/pos/orders")}
          className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl p-4 shadow-sm transition flex flex-col items-center gap-2"
        >
          <ShoppingCartIcon />
          <span className="font-semibold text-sm">Bán dịch vụ</span>
          <span className="text-xs text-purple-100">Nước, đồ ăn</span>
        </button>
        <button
          onClick={() => navigate("/pos/shift")}
          className={`rounded-xl p-4 shadow-sm transition flex flex-col items-center gap-2 ${
            currentShift
              ? "bg-yellow-500 hover:bg-yellow-600 text-white"
              : "bg-gray-500 hover:bg-gray-600 text-white"
          }`}
        >
          <ClockIcon />
          <span className="font-semibold text-sm">
            {currentShift ? "Đóng ca" : "Mở ca"}
          </span>
          <span className="text-xs opacity-80">
            {currentShift
              ? `${currentShift.expectedCash?.toLocaleString() || 0}đ`
              : "Bắt đầu ca mới"}
          </span>
        </button>
      </div>

      {/* Court Status Grid */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-3">
          📋 Sơ đồ sân · {currentTime}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {courts.map((court) => {
            const status =
              statusConfig[court.currentStatus] || statusConfig.available;
            return (
              <div
                key={court._id}
                className={`rounded-xl p-4 border-2 shadow-sm ${status.color} transition`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-lg">{court.name}</span>
                  <span className="text-xl">{status.icon}</span>
                </div>
                <div className="text-sm font-medium">{status.label}</div>
                {court.currentBooking && (
                  <div className="text-xs mt-1 opacity-75">
                    {court.currentBooking.user?.name || "Khách"}
                    <br />
                    {court.currentBooking.startTime} -{" "}
                    {court.currentBooking.endTime}
                  </div>
                )}
                {court.upcomingCount > 0 &&
                  court.currentStatus === "available" && (
                    <div className="text-xs mt-1 text-blue-600">
                      Sắp tới: {court.upcomingCount} lượt
                    </div>
                  )}
                {court.maintenanceCount > 0 && (
                  <div className="flex items-center gap-1 text-xs mt-1 text-red-600">
                    <AlertTriangle size={12} /> Bảo trì
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// SVG Icons for quick actions (simplified inline)
function ClipboardCheckIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <polyline points="9 14 11 16 15 12" />
    </svg>
  );
}

function WalkInIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}

function ShoppingCartIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
