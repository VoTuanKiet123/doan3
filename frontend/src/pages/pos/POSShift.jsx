import { useState, useEffect, useCallback } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";
import {
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

export default function POSShift() {
  const [currentShift, setCurrentShift] = useState(null);
  const [shiftHistory, setShiftHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [openingCash, setOpeningCash] = useState("");
  const [closingCash, setClosingCash] = useState("");
  const [differenceNote, setDifferenceNote] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [shiftRes, historyRes] = await Promise.all([
        api.get("/pos/shifts/current"),
        api.get("/pos/shifts/history"),
      ]);
      setCurrentShift(shiftRes.data.shift);
      setShiftHistory(historyRes.data.shifts);
    } catch (err) {
      toast.error("Không thể tải dữ liệu ca");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenShift = async () => {
    const cash = parseInt(openingCash);
    if (isNaN(cash) || cash < 0) {
      toast.error("Vui lòng nhập số tiền hợp lệ");
      return;
    }
    setProcessing(true);
    try {
      const res = await api.post("/pos/shifts/open", { openingCash: cash });
      toast.success(res.data.message);
      setShowOpenModal(false);
      setOpeningCash("");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi mở ca");
    } finally {
      setProcessing(false);
    }
  };

  const handleCloseShift = async () => {
    const cash = parseInt(closingCash);
    if (isNaN(cash) || cash < 0) {
      toast.error("Vui lòng nhập số tiền hợp lệ");
      return;
    }
    if (!currentShift) return;

    setProcessing(true);
    try {
      const res = await api.put(`/pos/shifts/${currentShift._id}/close`, {
        closingCash: cash,
        differenceNote: differenceNote || "",
      });
      const data = res.data.shift;
      if (data.cashDifference === 0) {
        toast.success("Đóng ca thành công! Quỹ khớp ✅");
      } else if (data.cashDifference > 0) {
        toast.success(
          `Đóng ca thành công! Dư ${data.cashDifference.toLocaleString()}đ ⚠️`,
        );
      } else {
        toast.success(
          `Đóng ca thành công! Thiếu ${Math.abs(data.cashDifference).toLocaleString()}đ ⚠️`,
        );
      }
      setShowCloseModal(false);
      setClosingCash("");
      setDifferenceNote("");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi đóng ca");
    } finally {
      setProcessing(false);
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
        <Clock size={24} className="text-yellow-600" />
        Quản lý ca làm việc
      </h2>

      {/* Current Shift Status */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        {currentShift ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                    ĐANG MỞ
                  </span>
                  <span className="text-gray-500 text-sm">
                    Ca ngày {currentShift.shiftDate}
                  </span>
                </div>
                <div className="text-2xl font-bold mt-1">
                  {currentShift.staffName}
                </div>
                <div className="text-sm text-gray-500">
                  Mở ca:{" "}
                  {new Date(currentShift.openedAt).toLocaleTimeString("vi-VN")}
                </div>
              </div>
              <button
                onClick={() => setShowCloseModal(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold transition flex items-center gap-2"
              >
                <XCircle size={20} />
                Đóng ca
              </button>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <DollarSign size={14} /> Tồn quỹ đầu
                </div>
                <div className="text-lg font-bold">
                  {currentShift.openingCash?.toLocaleString()}đ
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingUp size={14} /> Thu vào (TM)
                </div>
                <div className="text-lg font-bold text-green-700">
                  {currentShift.totalCashIn?.toLocaleString()}đ
                </div>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <div className="text-xs text-red-600 flex items-center gap-1">
                  <TrendingDown size={14} /> Chi ra (TM)
                </div>
                <div className="text-lg font-bold text-red-700">
                  {currentShift.totalCashOut?.toLocaleString()}đ
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-xs text-blue-600 flex items-center gap-1">
                  <DollarSign size={14} /> Dự kiến
                </div>
                <div className="text-lg font-bold text-blue-700">
                  {currentShift.expectedCash?.toLocaleString()}đ
                </div>
              </div>
            </div>

            {/* Counts */}
            <div className="grid grid-cols-4 gap-2 text-center text-sm">
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="font-bold">
                  {currentShift.bookingCount || 0}
                </div>
                <div className="text-xs text-gray-500">Đặt sân</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="font-bold">{currentShift.walkInCount || 0}</div>
                <div className="text-xs text-gray-500">Walk-in</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="font-bold">
                  {currentShift.serviceOrderCount || 0}
                </div>
                <div className="text-xs text-gray-500">Dịch vụ</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="font-bold">{currentShift.refundCount || 0}</div>
                <div className="text-xs text-gray-500">Hoàn tiền</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="text-5xl mb-3">🕐</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              Chưa mở ca làm việc
            </h3>
            <p className="text-gray-500 text-sm mb-4">
              Bạn cần mở ca trước khi thực hiện các giao dịch
            </p>
            <button
              onClick={() => setShowOpenModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold transition inline-flex items-center gap-2"
            >
              <CheckCircle size={20} />
              Mở ca ngay
            </button>
          </div>
        )}
      </div>

      {/* Shift History */}
      {shiftHistory.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <h3 className="font-bold text-gray-800 mb-3">📋 Lịch sử ca làm</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {shiftHistory.map((shift) => (
              <div
                key={shift._id}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50"
              >
                <div>
                  <div className="font-medium text-sm">
                    {shift.staffName || shift.staff?.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {shift.shiftDate} ·{" "}
                    {new Date(shift.openedAt).toLocaleTimeString("vi-VN")}
                    {shift.closedAt &&
                      ` → ${new Date(shift.closedAt).toLocaleTimeString("vi-VN")}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm">
                    {shift.status === "closed" ? (
                      shift.cashDifference === 0 ? (
                        <span className="text-green-600">Khớp ✅</span>
                      ) : (
                        <span className="text-red-600">
                          {shift.cashDifference > 0 ? "+" : ""}
                          {shift.cashDifference?.toLocaleString()}đ
                        </span>
                      )
                    ) : (
                      <span className="text-yellow-600">Đang mở</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    Dự kiến: {shift.expectedCash?.toLocaleString()}đ
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Open Shift Modal */}
      {showOpenModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowOpenModal(false)}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-green-700 mb-4 flex items-center gap-2">
              <CheckCircle size={24} /> Mở ca làm việc
            </h3>
            <div className="mb-4">
              <label className="text-sm text-gray-600 mb-1 block">
                Số tiền mặt tồn quỹ đầu ca
              </label>
              <input
                type="number"
                min="0"
                placeholder="VD: 500000"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                className="w-full border rounded-lg px-3 py-2.5 text-lg focus:ring-2 focus:ring-green-500 outline-none"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleOpenShift()}
              />
              <p className="text-xs text-gray-400 mt-1">
                Nhập số tiền mặt có sẵn trong quỹ đầu ca
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleOpenShift}
                disabled={processing}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2.5 rounded-lg font-medium transition"
              >
                {processing ? "Đang xử lý..." : "Mở ca"}
              </button>
              <button
                onClick={() => setShowOpenModal(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 py-2.5 rounded-lg font-medium transition"
              >
                Huỷ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Shift Modal */}
      {showCloseModal && currentShift && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowCloseModal(false)}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-red-700 mb-4 flex items-center gap-2">
              <XCircle size={24} /> Đóng ca làm việc
            </h3>

            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
              <div className="flex justify-between mb-1">
                <span>Tồn quỹ đầu ca:</span>
                <span className="font-medium">
                  {currentShift.openingCash?.toLocaleString()}đ
                </span>
              </div>
              <div className="flex justify-between mb-1 text-green-700">
                <span>Thu tiền mặt:</span>
                <span className="font-medium">
                  +{currentShift.totalCashIn?.toLocaleString()}đ
                </span>
              </div>
              <div className="flex justify-between mb-1 text-red-700">
                <span>Chi tiền mặt:</span>
                <span className="font-medium">
                  -{currentShift.totalCashOut?.toLocaleString()}đ
                </span>
              </div>
              <div className="flex justify-between font-bold border-t pt-1 mt-1">
                <span>Dự kiến tồn quỹ:</span>
                <span className="text-blue-700">
                  {currentShift.expectedCash?.toLocaleString()}đ
                </span>
              </div>
            </div>

            <div className="mb-3">
              <label className="text-sm text-gray-600 mb-1 block">
                Số tiền mặt thực tế đếm được
              </label>
              <input
                type="number"
                min="0"
                placeholder="Nhập số tiền thực tế"
                value={closingCash}
                onChange={(e) => setClosingCash(e.target.value)}
                className="w-full border rounded-lg px-3 py-2.5 text-lg focus:ring-2 focus:ring-red-500 outline-none"
                autoFocus
              />
            </div>

            <div className="mb-4">
              <label className="text-sm text-gray-600 mb-1 block">
                Ghi chú (nếu lệch quỹ)
              </label>
              <input
                type="text"
                placeholder="Lý do chênh lệch..."
                value={differenceNote}
                onChange={(e) => setDifferenceNote(e.target.value)}
                className="w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCloseShift}
                disabled={processing}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white py-2.5 rounded-lg font-medium transition"
              >
                {processing ? "Đang xử lý..." : "Xác nhận đóng ca"}
              </button>
              <button
                onClick={() => setShowCloseModal(false)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 py-2.5 rounded-lg font-medium transition"
              >
                Huỷ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
