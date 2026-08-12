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
  ArrowRightLeft,
  Shield,
} from "lucide-react";

export default function POSShift() {
  const [currentShift, setCurrentShift] = useState(null);
  const [shiftHistory, setShiftHistory] = useState([]);
  const [floatAmount, setFloatAmount] = useState(0);

  // Helper: đảm bảo floatAmount luôn là số, tránh lỗi toLocaleString
  const safeFloat = (val) => (val != null ? val : 0);
  const fmt = (val) => safeFloat(val).toLocaleString();
  const [loading, setLoading] = useState(true);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [lastShift, setLastShift] = useState(null);
  const [handoverConfirmed, setHandoverConfirmed] = useState(false);
  const [actualCashCounted, setActualCashCounted] = useState("");
  const [discrepancyNote, setDiscrepancyNote] = useState("");
  const [confirmedLeaveFloat, setConfirmedLeaveFloat] = useState(false);
  const [processing, setProcessing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [shiftRes, historyRes, floatRes] = await Promise.all([
        api.get("/pos/shifts/current"),
        api.get("/pos/shifts/history"),
        api.get("/settings/float-amount"),
      ]);
      setCurrentShift(shiftRes.data.shift);
      setShiftHistory(historyRes.data.shifts);
      setFloatAmount(floatRes.data.floatAmount);
    } catch (err) {
      toast.error("Không thể tải dữ liệu ca");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Khi mở modal mở ca, kiểm tra ca trước
  const handleOpenModal = async () => {
    setShowOpenModal(true);
    setHandoverConfirmed(false);
    try {
      const res = await api.get("/pos/shifts/last-closed");
      setLastShift(res.data.shift);
    } catch {
      setLastShift(null);
    }
  };

  const handleOpenShift = async () => {
    if (
      lastShift &&
      lastShift.handoverStatus === "pending" &&
      !handoverConfirmed
    ) {
      toast.error("Vui lòng xác nhận đã nhận bàn giao quỹ từ ca trước!");
      return;
    }

    setProcessing(true);
    try {
      const res = await api.post("/pos/shifts/open", {
        handoverConfirmed: handoverConfirmed,
      });
      toast.success(res.data.message);
      setShowOpenModal(false);
      setHandoverConfirmed(false);
      setLastShift(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi mở ca");
    } finally {
      setProcessing(false);
    }
  };

  const handleCloseShift = async () => {
    const cash = parseInt(actualCashCounted);
    if (isNaN(cash) || cash < 0) {
      toast.error("Vui lòng nhập số tiền mặt thực tế đếm được");
      return;
    }
    if (!currentShift) return;

    if (!confirmedLeaveFloat) {
      toast.error("Vui lòng xác nhận đã để lại quỹ định mức trong quầy");
      return;
    }

    setProcessing(true);
    try {
      const res = await api.put(`/pos/shifts/${currentShift._id}/close`, {
        actualCashCounted: cash,
        discrepancyNote: discrepancyNote || "",
        confirmedLeaveFloat,
      });
      const data = res.data.shift;
      const summary = res.data.summary;

      if (data.discrepancy === 0) {
        toast.success("Đóng ca thành công! Quỹ khớp ✅");
      } else if (data.discrepancy > 0) {
        toast.success(
          `Đóng ca thành công! Dư ${data.discrepancy.toLocaleString()}đ ⚠️`,
        );
      } else {
        toast.success(
          `Đóng ca thành công! Thiếu ${Math.abs(data.discrepancy).toLocaleString()}đ ⚠️`,
        );
      }

      if (summary && summary.amountWithdrawn > 0) {
        toast(
          `💰 Số tiền rút nộp: ${summary.amountWithdrawn.toLocaleString()}đ | Để lại quỹ: ${summary.amountLeftForNextShift.toLocaleString()}đ`,
          { duration: 8000, icon: "💰" },
        );
      }

      setShowCloseModal(false);
      setActualCashCounted("");
      setDiscrepancyNote("");
      setConfirmedLeaveFloat(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi đóng ca");
    } finally {
      setProcessing(false);
    }
  };

  const closePreview = currentShift
    ? (() => {
        const rev = currentShift.cashRevenue || 0;
        const refOut = currentShift.cashRefundOut || 0;
        const expected = (currentShift.floatAmount || 0) + rev - refOut;
        const actual = parseInt(actualCashCounted) || 0;
        const disc = actual - expected;
        const withdrawn = actual - (currentShift.floatAmount || 0);
        return { expected, disc, withdrawn };
      })()
    : null;

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

            {/* Imprest Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                <div className="text-xs text-purple-600 flex items-center gap-1">
                  <Shield size={14} /> Quỹ định mức
                </div>
                <div className="text-lg font-bold text-purple-700">
                  {currentShift.floatAmount?.toLocaleString()}đ
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <div className="text-xs text-green-600 flex items-center gap-1">
                  <TrendingUp size={14} /> Doanh thu TM
                </div>
                <div className="text-lg font-bold text-green-700">
                  +{(currentShift.cashRevenue || 0).toLocaleString()}đ
                </div>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <div className="text-xs text-red-600 flex items-center gap-1">
                  <TrendingDown size={14} /> Hoàn/Chi TM
                </div>
                <div className="text-lg font-bold text-red-700">
                  -{(currentShift.cashRefundOut || 0).toLocaleString()}đ
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-xs text-blue-600 flex items-center gap-1">
                  <DollarSign size={14} /> Dự kiến tồn
                </div>
                <div className="text-lg font-bold text-blue-700">
                  {(
                    (currentShift.floatAmount || 0) +
                    (currentShift.cashRevenue || 0) -
                    (currentShift.cashRefundOut || 0)
                  ).toLocaleString()}
                  đ
                </div>
              </div>
            </div>

            {(currentShift.totalTransferIn || 0) > 0 && (
              <div className="bg-cyan-50 rounded-lg p-3 border border-cyan-100">
                <span className="text-xs text-cyan-600">
                  💳 Chuyển khoản: +
                  {(currentShift.totalTransferIn || 0).toLocaleString()}đ
                </span>
                <span className="text-xs text-gray-400 ml-2">
                  (không tính vào quỹ tiền mặt)
                </span>
              </div>
            )}

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
              onClick={handleOpenModal}
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
                <div className="flex-1">
                  <div className="font-medium text-sm flex items-center gap-2">
                    {shift.staffName || shift.staff?.name}
                    {shift.handoverStatus === "confirmed" && (
                      <span className="text-green-500 text-xs">✓ Bàn giao</span>
                    )}
                    {shift.handoverStatus === "disputed" && (
                      <span className="text-red-500 text-xs">⚠ Tranh chấp</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {shift.shiftDate} ·{" "}
                    {new Date(shift.openedAt).toLocaleTimeString("vi-VN")}
                    {shift.closedAt &&
                      ` → ${new Date(shift.closedAt).toLocaleTimeString("vi-VN")}`}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    Quỹ: {shift.floatAmount?.toLocaleString()}đ | DT: +
                    {(shift.cashRevenue || 0).toLocaleString()}đ | Rút:{" "}
                    {(shift.amountWithdrawn || 0).toLocaleString()}đ
                  </div>
                </div>
                <div className="text-right ml-3">
                  <div className="font-bold text-sm">
                    {shift.status === "closed" ? (
                      (shift.discrepancy ?? 0) === 0 ? (
                        <span className="text-green-600">Khớp ✅</span>
                      ) : (
                        <span className="text-red-600">
                          {(shift.discrepancy ?? 0) > 0 ? "+" : ""}
                          {(shift.discrepancy ?? 0).toLocaleString()}đ
                        </span>
                      )
                    ) : (
                      <span className="text-yellow-600">Đang mở</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    Dự kiến: {(shift.expectedCash || 0).toLocaleString()}đ
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
            className="bg-white rounded-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-green-700 mb-4 flex items-center gap-2">
              <CheckCircle size={24} /> Mở ca làm việc
            </h3>

            <div className="bg-purple-50 rounded-lg p-4 mb-4 border border-purple-200">
              <div className="text-sm text-purple-600 mb-1">
                Quỹ định mức (cố định)
              </div>
              <div className="text-2xl font-bold text-purple-700">
                {floatAmount.toLocaleString()}đ
              </div>
              <div className="text-xs text-purple-500 mt-1">
                Quỹ này do Admin cấu hình, dùng để thối tiền khách — không phải
                doanh thu
              </div>
            </div>

            {lastShift && lastShift.handoverStatus === "pending" && (
              <div className="bg-yellow-50 rounded-lg p-4 mb-4 border border-yellow-200">
                <div className="flex items-center gap-2 text-yellow-700 font-medium mb-2">
                  <ArrowRightLeft size={18} />
                  Bàn giao từ ca trước
                </div>
                <div className="text-sm text-yellow-700 space-y-1">
                  <div>
                    Ca trước: <strong>{lastShift.staffName}</strong> (
                    {lastShift.shiftDate})
                  </div>
                  <div>
                    Quỹ để lại:{" "}
                    <strong>{lastShift.floatAmount?.toLocaleString()}đ</strong>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={handoverConfirmed}
                      onChange={(e) => setHandoverConfirmed(e.target.checked)}
                      className="w-4 h-4 text-green-600 rounded"
                    />
                    <span className="text-sm text-yellow-800">
                      Tôi xác nhận đã đếm và nhận đủ quỹ{" "}
                      {lastShift.floatAmount?.toLocaleString()}đ
                    </span>
                  </label>
                </div>
              </div>
            )}

            {lastShift && lastShift.handoverStatus === "confirmed" && (
              <div className="bg-green-50 rounded-lg p-4 mb-4 border border-green-200">
                <div className="text-sm text-green-700">
                  ✅ Bàn giao ca trước đã được xác nhận. Quỹ{" "}
                  {lastShift.floatAmount?.toLocaleString()}đ đã sẵn sàng.
                </div>
              </div>
            )}

            {!lastShift && (
              <div className="bg-blue-50 rounded-lg p-4 mb-4 border border-blue-200">
                <div className="text-sm text-blue-700">
                  ℹ️ Đây là ca đầu tiên. Hãy đảm bảo có đủ{" "}
                  {floatAmount.toLocaleString()}đ tiền lẻ trong quầy.
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleOpenShift}
                disabled={processing}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2.5 rounded-lg font-medium transition"
              >
                {processing ? "Đang xử lý..." : "Mở ca"}
              </button>
              <button
                onClick={() => {
                  setShowOpenModal(false);
                  setHandoverConfirmed(false);
                  setLastShift(null);
                }}
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
            className="bg-white rounded-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-red-700 mb-4 flex items-center gap-2">
              <XCircle size={24} /> Đóng ca làm việc
            </h3>

            <div className="bg-gray-50 rounded-lg p-4 mb-4 text-sm border">
              <h4 className="font-bold text-gray-700 mb-3">
                📊 Đối soát quỹ (Imprest System)
              </h4>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">🏦 Quỹ định mức:</span>
                  <span className="font-bold text-purple-700">
                    {currentShift.floatAmount?.toLocaleString()}đ
                  </span>
                </div>
                <div className="flex justify-between items-center text-green-700">
                  <span>💰 Doanh thu tiền mặt:</span>
                  <span className="font-bold">
                    +{(currentShift.cashRevenue || 0).toLocaleString()}đ
                  </span>
                </div>
                <div className="flex justify-between items-center text-red-700">
                  <span>💸 Hoàn/Chi tiền mặt:</span>
                  <span className="font-bold">
                    -{(currentShift.cashRefundOut || 0).toLocaleString()}đ
                  </span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-blue-700">
                      📋 Dự kiến tồn quỹ:
                    </span>
                    <span className="font-bold text-lg text-blue-700">
                      {(
                        (currentShift.floatAmount || 0) +
                        (currentShift.cashRevenue || 0) -
                        (currentShift.cashRefundOut || 0)
                      ).toLocaleString()}
                      đ
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    = Quỹ định mức + Doanh thu TM − Hoàn/Chi TM
                  </div>
                </div>

                {closePreview && actualCashCounted && (
                  <>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-700">
                          🔢 Thực tế đếm được:
                        </span>
                        <span className="font-bold text-lg">
                          {parseInt(actualCashCounted).toLocaleString()}đ
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">
                        {closePreview.disc === 0
                          ? "✅ Chênh lệch:"
                          : closePreview.disc > 0
                            ? "⚠️ Dư:"
                            : "🔴 Thiếu:"}
                      </span>
                      <span
                        className={`font-bold text-lg ${closePreview.disc === 0 ? "text-green-600" : closePreview.disc > 0 ? "text-yellow-600" : "text-red-600"}`}
                      >
                        {closePreview.disc === 0
                          ? "0đ"
                          : `${closePreview.disc > 0 ? "+" : ""}${closePreview.disc.toLocaleString()}đ`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-t pt-2 mt-2">
                      <span className="font-semibold text-green-700">
                        📤 Số tiền rút nộp:
                      </span>
                      <span className="font-bold text-lg text-green-700">
                        {closePreview.withdrawn > 0
                          ? closePreview.withdrawn.toLocaleString()
                          : "0"}
                        đ
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-purple-700">
                        🏦 Để lại quỹ ca sau:
                      </span>
                      <span className="font-bold text-purple-700">
                        {currentShift.floatAmount?.toLocaleString()}đ
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="mb-3">
              <label className="text-sm text-gray-600 mb-1 block font-medium">
                🔢 Số tiền mặt thực tế đếm được trong quầy
              </label>
              <input
                type="number"
                min="0"
                placeholder="Nhập số tiền thực tế đếm được"
                value={actualCashCounted}
                onChange={(e) => setActualCashCounted(e.target.value)}
                className="w-full border rounded-lg px-3 py-2.5 text-lg focus:ring-2 focus:ring-red-500 outline-none"
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1">
                Đếm toàn bộ tiền mặt trong quầy (bao gồm cả quỹ định mức)
              </p>
            </div>

            <div className="mb-3">
              <label className="flex items-center gap-2 cursor-pointer bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                <input
                  type="checkbox"
                  checked={confirmedLeaveFloat}
                  onChange={(e) => setConfirmedLeaveFloat(e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded"
                />
                <span className="text-sm text-yellow-800">
                  Tôi xác nhận đã để lại đúng{" "}
                  <strong>{currentShift.floatAmount?.toLocaleString()}đ</strong>{" "}
                  quỹ định mức trong quầy cho ca sau
                </span>
              </label>
            </div>

            <div className="mb-4">
              <label className="text-sm text-gray-600 mb-1 block">
                Ghi chú (nếu có chênh lệch)
              </label>
              <input
                type="text"
                placeholder="Lý do chênh lệch..."
                value={discrepancyNote}
                onChange={(e) => setDiscrepancyNote(e.target.value)}
                className="w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>

            {closePreview &&
              actualCashCounted &&
              closePreview.withdrawn < 0 && (
                <div className="bg-red-50 rounded-lg p-3 mb-4 border border-red-200">
                  <div className="flex items-center gap-2 text-red-700 font-medium">
                    <AlertCircle size={18} />
                    ⚠️ CẢNH BÁO: Không đủ quỹ để lại cho ca sau!
                  </div>
                  <div className="text-sm text-red-600 mt-1">
                    Thiếu {Math.abs(closePreview.withdrawn).toLocaleString()}đ
                    so với quỹ định mức. Cần Admin duyệt.
                  </div>
                </div>
              )}

            <div className="flex gap-2">
              <button
                onClick={handleCloseShift}
                disabled={processing}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white py-2.5 rounded-lg font-medium transition"
              >
                {processing ? "Đang xử lý..." : "Xác nhận đóng ca"}
              </button>
              <button
                onClick={() => {
                  setShowCloseModal(false);
                  setActualCashCounted("");
                  setDiscrepancyNote("");
                  setConfirmedLeaveFloat(false);
                }}
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
