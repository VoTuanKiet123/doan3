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
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Page Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)",
          borderRadius: 16,
          padding: "20px 24px",
          color: "white",
          display: "flex",
          alignItems: "center",
          gap: 14,
          boxShadow: "0 6px 20px rgba(245,158,11,0.35)",
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
          <Clock size={26} />
        </div>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Quản lý ca làm việc</h1>
          <p style={{ fontSize: 13, opacity: 0.85, margin: "2px 0 0" }}>
            Mở / đóng ca · Đối soát quỹ tiền mặt
          </p>
        </div>
      </div>

      {/* Current Shift Status */}
      <div
        style={{
          background: "white",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 2px 8px rgba(4,120,87,0.06)",
          border: "1px solid #d1fae5",
        }}
      >
        {currentShift ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span
                    style={{
                      background: "linear-gradient(135deg, #d1fae5, #a7f3d0)",
                      color: "#065f46",
                      padding: "3px 10px",
                      borderRadius: 99,
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: "0.05em",
                      border: "1px solid #6ee7b7",
                    }}
                  >
                    ● ĐANG MỞ
                  </span>
                  <span style={{ fontSize: 13, color: "#6b7280" }}>Ca ngày {currentShift.shiftDate}</span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#1f2937", marginBottom: 3 }}>
                  {currentShift.staffName}
                </div>
                <div style={{ fontSize: 13, color: "#9ca3af" }}>
                  Mở ca lúc: {new Date(currentShift.openedAt).toLocaleTimeString("vi-VN")}
                </div>
              </div>
              <button
                onClick={() => setShowCloseModal(true)}
                style={{
                  background: "linear-gradient(135deg, #dc2626, #ef4444)",
                  color: "white",
                  border: "none",
                  padding: "12px 22px",
                  borderRadius: 12,
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontFamily: "inherit",
                  boxShadow: "0 4px 14px rgba(239,68,68,0.35)",
                  transition: "all 0.2s",
                }}
              >
                <XCircle size={18} />
                Đóng ca
              </button>
            </div>

            {/* Imprest Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
              {[
                { icon: <Shield size={16} />, label: "Quỹ định mức", value: `${currentShift.floatAmount?.toLocaleString()}đ`, bg: "#faf5ff", border: "#e9d5ff", color: "#7c3aed" },
                { icon: <TrendingUp size={16} />, label: "Doanh thu TM", value: `+${(currentShift.cashRevenue || 0).toLocaleString()}đ`, bg: "#f0fdf4", border: "#bbf7d0", color: "#16a34a" },
                { icon: <TrendingDown size={16} />, label: "Hoàn/Chi TM", value: `-${(currentShift.cashRefundOut || 0).toLocaleString()}đ`, bg: "#fef2f2", border: "#fecaca", color: "#dc2626" },
                { icon: <DollarSign size={16} />, label: "Dự kiến tồn", value: `${((currentShift.floatAmount || 0) + (currentShift.cashRevenue || 0) - (currentShift.cashRefundOut || 0)).toLocaleString()}đ`, bg: "#eff6ff", border: "#bfdbfe", color: "#2563eb" },
              ].map((s, i) => (
                <div key={i} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: s.color, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                    {s.icon} {s.label}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {(currentShift.totalTransferIn || 0) > 0 && (
              <div style={{ background: "#ecfeff", border: "1px solid #a5f3fc", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#0e7490", display: "flex", alignItems: "center", gap: 8 }}>
                <span>💳</span>
                <span>Chuyển khoản: <strong>+{(currentShift.totalTransferIn || 0).toLocaleString()}đ</strong></span>
                <span style={{ color: "#9ca3af", fontSize: 12 }}>(không tính vào quỹ tiền mặt)</span>
              </div>
            )}

            {/* Mini stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, borderTop: "1px solid #f3f4f6", paddingTop: 16 }}>
              {[
                { label: "Đặt sân", value: currentShift.bookingCount || 0, emoji: "🏸" },
                { label: "Walk-in", value: currentShift.walkInCount || 0, emoji: "🚶" },
                { label: "Dịch vụ", value: currentShift.serviceOrderCount || 0, emoji: "🛒" },
                { label: "Hoàn tiền", value: currentShift.refundCount || 0, emoji: "↩️" },
              ].map((s, i) => (
                <div key={i} style={{ background: "#f9fafb", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 16, marginBottom: 2 }}>{s.emoji}</div>
                  <div style={{ fontWeight: 800, fontSize: 18, color: "#1f2937" }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🕐</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#1f2937", marginBottom: 8 }}>
              Chưa mở ca làm việc
            </h3>
            <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 20 }}>
              Bạn cần mở ca trước khi thực hiện các giao dịch
            </p>
            <button
              onClick={handleOpenModal}
              style={{
                background: "linear-gradient(135deg, #059669, #10b981)",
                color: "white",
                border: "none",
                padding: "14px 32px",
                borderRadius: 14,
                fontWeight: 800,
                fontSize: 15,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "inherit",
                boxShadow: "0 6px 20px rgba(16,185,129,0.4)",
                transition: "all 0.2s",
              }}
            >
              <CheckCircle size={20} />
              Mở ca ngay
            </button>
          </div>
        )}
      </div>

      {/* Shift History */}
      {shiftHistory.length > 0 && (
        <div
          style={{
            background: "white",
            borderRadius: 16,
            padding: 20,
            boxShadow: "0 2px 8px rgba(4,120,87,0.06)",
            border: "1px solid #d1fae5",
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 800, color: "#064e3b", marginBottom: 14 }}>📋 Lịch sử ca làm</h3>
          <div style={{ maxHeight: 360, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            {shiftHistory.map((shift) => (
              <div
                key={shift._id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderRadius: 12,
                  border: "1px solid #f3f4f6",
                  background: "#fafafa",
                  transition: "background 0.2s",
                  gap: 12,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f0fdf4")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#fafafa")}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#1f2937", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                    {shift.staffName || shift.staff?.name}
                    {shift.handoverStatus === "confirmed" && (
                      <span style={{ background: "#d1fae5", color: "#065f46", padding: "1px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700 }}>✓ Bàn giao</span>
                    )}
                    {shift.handoverStatus === "disputed" && (
                      <span style={{ background: "#fef2f2", color: "#b91c1c", padding: "1px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700 }}>⚠ Tranh chấp</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    {shift.shiftDate} · {new Date(shift.openedAt).toLocaleTimeString("vi-VN")}
                    {shift.closedAt && ` → ${new Date(shift.closedAt).toLocaleTimeString("vi-VN")}`}
                  </div>
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                    Quỹ: {shift.floatAmount?.toLocaleString()}đ · DT: +{(shift.cashRevenue || 0).toLocaleString()}đ · Rút: {(shift.amountWithdrawn || 0).toLocaleString()}đ
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 3 }}>
                    {shift.status === "closed" ? (
                      (shift.discrepancy ?? 0) === 0 ? (
                        <span style={{ color: "#16a34a" }}>Khớp ✅</span>
                      ) : (
                        <span style={{ color: "#dc2626" }}>
                          {(shift.discrepancy ?? 0) > 0 ? "+" : ""}
                          {(shift.discrepancy ?? 0).toLocaleString()}đ
                        </span>
                      )
                    ) : (
                      <span style={{ color: "#d97706" }}>Đang mở</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>Dự kiến: {(shift.expectedCash || 0).toLocaleString()}đ</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Open Shift Modal */}
      {showOpenModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 16,
          }}
          onClick={() => setShowOpenModal(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: 24,
              padding: 28,
              maxWidth: 460,
              width: "100%",
              boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
              maxHeight: "90vh",
              overflowY: "auto",
              position: "relative",
              fontFamily: "inherit",
              animation: "fadeInUp 0.25s ease",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
                paddingBottom: 14,
                borderBottom: "1.5px solid #f0fdf4",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: "linear-gradient(135deg, #d1fae5, #a7f3d0)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CheckCircle size={22} color="#059669" />
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: "#064e3b", margin: 0 }}>
                    Mở ca làm việc
                  </h3>
                  <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0" }}>
                    Xác nhận số tiền quỹ để bắt đầu phiên
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowOpenModal(false);
                  setHandoverConfirmed(false);
                  setLastShift(null);
                }}
                style={{
                  background: "#f3f4f6",
                  border: "none",
                  borderRadius: "50%",
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#6b7280",
                }}
              >
                ✕
              </button>
            </div>

            {/* Quỹ định mức card */}
            <div
              style={{
                background: "linear-gradient(135deg, #faf5ff, #f3e8ff)",
                borderRadius: 16,
                padding: "16px 20px",
                marginBottom: 16,
                border: "1.5px solid #e9d5ff",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#7c3aed",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 4,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Shield size={14} /> Quỹ định mức (cố định)
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#6d28d9" }}>
                {floatAmount.toLocaleString()}đ
              </div>
              <div style={{ fontSize: 11, color: "#8b5cf6", marginTop: 4, lineHeight: 1.4 }}>
                Quỹ do Admin cấu hình, dùng để thối tiền lẻ cho khách (không tính vào doanh thu).
              </div>
            </div>

            {/* Bàn giao ca trước (Pending) */}
            {lastShift && lastShift.handoverStatus === "pending" && (
              <div
                style={{
                  background: "linear-gradient(135deg, #fffbeb, #fef3c7)",
                  borderRadius: 16,
                  padding: "16px 20px",
                  marginBottom: 20,
                  border: "1.5px solid #fde68a",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: "#b45309",
                    fontWeight: 800,
                    fontSize: 14,
                    marginBottom: 10,
                  }}
                >
                  <ArrowRightLeft size={16} /> Bàn giao từ ca trước
                </div>
                <div style={{ fontSize: 13, color: "#92400e", lineHeight: 1.6 }}>
                  <div>
                    Ca trước: <strong>{lastShift.staffName}</strong> ({lastShift.shiftDate})
                  </div>
                  <div>
                    Quỹ để lại: <strong>{lastShift.floatAmount?.toLocaleString()}đ</strong>
                  </div>
                </div>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginTop: 12,
                    paddingTop: 10,
                    borderTop: "1px dashed #fcd34d",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={handoverConfirmed}
                    onChange={(e) => setHandoverConfirmed(e.target.checked)}
                    style={{
                      width: 18,
                      height: 18,
                      accentColor: "#10b981",
                      cursor: "pointer",
                    }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#78350f" }}>
                    Tôi xác nhận đã đếm và nhận đủ quỹ {lastShift.floatAmount?.toLocaleString()}đ
                  </span>
                </label>
              </div>
            )}

            {/* Bàn giao ca trước (Confirmed) */}
            {lastShift && lastShift.handoverStatus === "confirmed" && (
              <div
                style={{
                  background: "#ecfdf5",
                  borderRadius: 14,
                  padding: "12px 16px",
                  marginBottom: 20,
                  border: "1px solid #a7f3d0",
                  fontSize: 13,
                  color: "#065f46",
                  fontWeight: 600,
                }}
              >
                ✅ Bàn giao ca trước đã được xác nhận. Quỹ{" "}
                <strong>{lastShift.floatAmount?.toLocaleString()}đ</strong> đã sẵn sàng.
              </div>
            )}

            {/* Ca đầu tiên */}
            {!lastShift && (
              <div
                style={{
                  background: "#eff6ff",
                  borderRadius: 14,
                  padding: "12px 16px",
                  marginBottom: 20,
                  border: "1px solid #bfdbfe",
                  fontSize: 13,
                  color: "#1e40af",
                  fontWeight: 600,
                }}
              >
                ℹ️ Đây là ca đầu tiên. Hãy đảm bảo có đủ <strong>{floatAmount.toLocaleString()}đ</strong> tiền lẻ trong quầy.
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={handleOpenShift}
                disabled={processing}
                style={{
                  flex: 1,
                  background: processing
                    ? "#9ca3af"
                    : "linear-gradient(135deg, #059669, #10b981)",
                  color: "white",
                  border: "none",
                  padding: "14px",
                  borderRadius: 14,
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: processing ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  boxShadow: processing
                    ? "none"
                    : "0 6px 20px rgba(16,185,129,0.35)",
                  transition: "all 0.2s",
                }}
              >
                {processing ? "Đang xử lý..." : "Mở ca ngay"}
              </button>
              <button
                onClick={() => {
                  setShowOpenModal(false);
                  setHandoverConfirmed(false);
                  setLastShift(null);
                }}
                style={{
                  flex: 1,
                  background: "#f3f4f6",
                  color: "#374151",
                  border: "1.5px solid #e5e7eb",
                  padding: "14px",
                  borderRadius: 14,
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.2s",
                }}
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
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 16,
          }}
          onClick={() => setShowCloseModal(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: 24,
              padding: 28,
              maxWidth: 480,
              width: "100%",
              boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
              maxHeight: "90vh",
              overflowY: "auto",
              position: "relative",
              fontFamily: "inherit",
              animation: "fadeInUp 0.25s ease",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
                paddingBottom: 14,
                borderBottom: "1.5px solid #fef2f2",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: "linear-gradient(135deg, #fecaca, #fee2e2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <XCircle size={22} color="#dc2626" />
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: "#991b1b", margin: 0 }}>
                    Đóng ca làm việc
                  </h3>
                  <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0" }}>
                    Đối soát quỹ và bàn giao ca
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCloseModal(false);
                  setActualCashCounted("");
                  setDiscrepancyNote("");
                  setConfirmedLeaveFloat(false);
                }}
                style={{
                  background: "#f3f4f6",
                  border: "none",
                  borderRadius: "50%",
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#6b7280",
                }}
              >
                ✕
              </button>
            </div>

            {/* Đối soát quỹ Card */}
            <div
              style={{
                background: "#f9fafb",
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                border: "1.5px solid #e5e7eb",
              }}
            >
              <h4 style={{ fontSize: 13, fontWeight: 800, color: "#374151", margin: "0 0 10px" }}>
                📊 Đối soát quỹ (Imprest System)
              </h4>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                <div style={{ display: "flex", justifyBetween: "space-between", justifyContent: "space-between" }}>
                  <span style={{ color: "#6b7280" }}>🏦 Quỹ định mức:</span>
                  <strong style={{ color: "#7c3aed" }}>
                    {currentShift.floatAmount?.toLocaleString()}đ
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#16a34a" }}>
                  <span>💰 Doanh thu tiền mặt:</span>
                  <strong>+{(currentShift.cashRevenue || 0).toLocaleString()}đ</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#dc2626" }}>
                  <span>💸 Hoàn/Chi tiền mặt:</span>
                  <strong>-{(currentShift.cashRefundOut || 0).toLocaleString()}đ</strong>
                </div>
                <div style={{ borderTop: "1px dashed #d1d5db", paddingTop: 8, marginTop: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700, color: "#2563eb" }}>📋 Dự kiến tồn quỹ:</span>
                    <span style={{ fontSize: 16, fontWeight: 900, color: "#2563eb" }}>
                      {(
                        (currentShift.floatAmount || 0) +
                        (currentShift.cashRevenue || 0) -
                        (currentShift.cashRefundOut || 0)
                      ).toLocaleString()}đ
                    </span>
                  </div>
                </div>

                {closePreview && actualCashCounted && (
                  <>
                    <div style={{ borderTop: "1px dashed #d1d5db", paddingTop: 8, marginTop: 4 }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontWeight: 700, color: "#374151" }}>🔢 Thực tế đếm được:</span>
                        <strong style={{ fontSize: 15 }}>
                          {parseInt(actualCashCounted).toLocaleString()}đ
                        </strong>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 700 }}>
                        {closePreview.disc === 0
                          ? "✅ Chênh lệch:"
                          : closePreview.disc > 0
                            ? "⚠️ Dư:"
                            : "🔴 Thiếu:"}
                      </span>
                      <span
                        style={{
                          fontSize: 16,
                          fontWeight: 900,
                          color:
                            closePreview.disc === 0
                              ? "#16a34a"
                              : closePreview.disc > 0
                                ? "#d97706"
                                : "#dc2626",
                        }}
                      >
                        {closePreview.disc === 0
                          ? "0đ"
                          : `${closePreview.disc > 0 ? "+" : ""}${closePreview.disc.toLocaleString()}đ`}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed #d1d5db", paddingTop: 8, marginTop: 4 }}>
                      <span style={{ fontWeight: 700, color: "#16a34a" }}>📤 Số tiền rút nộp:</span>
                      <strong style={{ fontSize: 15, color: "#16a34a" }}>
                        {closePreview.withdrawn > 0
                          ? closePreview.withdrawn.toLocaleString()
                          : "0"}đ
                      </strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontWeight: 700, color: "#7c3aed" }}>🏦 Để lại quỹ ca sau:</span>
                      <strong style={{ color: "#7c3aed" }}>
                        {currentShift.floatAmount?.toLocaleString()}đ
                      </strong>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Input thực tế đếm */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 }}>
                🔢 Số tiền mặt thực tế đếm được trong quầy
              </label>
              <input
                type="number"
                min="0"
                placeholder="Nhập số tiền thực tế đếm được..."
                value={actualCashCounted}
                onChange={(e) => setActualCashCounted(e.target.value)}
                style={{
                  width: "100%",
                  border: "1.5px solid #fecaca",
                  borderRadius: 12,
                  padding: "12px 14px",
                  fontSize: 16,
                  fontWeight: 800,
                  outline: "none",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                  background: "#fff5f5",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#ef4444")}
                onBlur={(e) => (e.target.style.borderColor = "#fecaca")}
                autoFocus
              />
              <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                Đếm toàn bộ tiền mặt trong quầy (bao gồm cả quỹ định mức)
              </p>
            </div>

            {/* Checkbox xác nhận để lại quỹ */}
            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "#fffbeb",
                  borderRadius: 12,
                  padding: "12px 14px",
                  border: "1px solid #fde68a",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={confirmedLeaveFloat}
                  onChange={(e) => setConfirmedLeaveFloat(e.target.checked)}
                  style={{
                    width: 18,
                    height: 18,
                    accentColor: "#dc2626",
                    cursor: "pointer",
                  }}
                />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#78350f" }}>
                  Tôi xác nhận đã để lại đúng{" "}
                  <strong>{currentShift.floatAmount?.toLocaleString()}đ</strong> quỹ định mức trong quầy
                </span>
              </label>
            </div>

            {/* Ghi chú */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", display: "block", marginBottom: 4 }}>
                Ghi chú (nếu có chênh lệch)
              </label>
              <input
                type="text"
                placeholder="Lý do chênh lệch..."
                value={discrepancyNote}
                onChange={(e) => setDiscrepancyNote(e.target.value)}
                style={{
                  width: "100%",
                  border: "1.5px solid #e5e7eb",
                  borderRadius: 10,
                  padding: "9px 12px",
                  fontSize: 13,
                  outline: "none",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {closePreview && actualCashCounted && closePreview.withdrawn < 0 && (
              <div
                style={{
                  background: "#fef2f2",
                  borderRadius: 12,
                  padding: "12px 14px",
                  marginBottom: 20,
                  border: "1px solid #fecaca",
                  fontSize: 12,
                  color: "#991b1b",
                }}
              >
                <div style={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertCircle size={16} /> ⚠️ CẢNH BÁO: Không đủ quỹ để lại!
                </div>
                <div style={{ marginTop: 2 }}>
                  Thiếu {Math.abs(closePreview.withdrawn).toLocaleString()}đ so với quỹ định mức.
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={handleCloseShift}
                disabled={processing}
                style={{
                  flex: 1,
                  background: processing
                    ? "#9ca3af"
                    : "linear-gradient(135deg, #dc2626, #ef4444)",
                  color: "white",
                  border: "none",
                  padding: "14px",
                  borderRadius: 14,
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: processing ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  boxShadow: processing
                    ? "none"
                    : "0 6px 20px rgba(239,68,68,0.35)",
                  transition: "all 0.2s",
                }}
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
                style={{
                  flex: 1,
                  background: "#f3f4f6",
                  color: "#374151",
                  border: "1.5px solid #e5e7eb",
                  padding: "14px",
                  borderRadius: 14,
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.2s",
                }}
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
