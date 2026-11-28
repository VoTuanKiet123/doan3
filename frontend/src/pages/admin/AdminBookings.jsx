import { useEffect, useState, useRef, Fragment } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";
import {
  Volleyball,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  CalendarX,
  QrCode,
  Camera,
  Keyboard,
  X,
  UserCheck,
} from "lucide-react";

const STATUS_MAP = {
  pending: { text: "Chờ xác nhận", cls: "badge badge-pending" },
  confirmed: { text: "Đã xác nhận", cls: "badge badge-confirmed" },
  cancelled: { text: "Đã huỷ", cls: "badge badge-cancelled" },
};

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [expandedRows, setExpandedRows] = useState({});

  // Modal Quét QR Check-in
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [scanMode, setScanMode] = useState("manual"); // 'manual' | 'camera'
  const [manualCode, setManualCode] = useState("");
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInResult, setCheckInResult] = useState(null); // { ok, message, booking }
  const scannerRef = useRef(null);

  const toggleRow = (id) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const fetchBookings = () => {
    api
      .get("/bookings")
      .then((res) => {
        setBookings(res.data.bookings || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Quản lý Camera QR Scanner
  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch {
        // Bỏ qua lỗi khi camera đã dừng
      }
      scannerRef.current = null;
    }
  };

  useEffect(() => {
    if (!showCheckInModal || scanMode !== "camera") {
      stopCamera();
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        const scanner = new Html5Qrcode("admin-qr-reader");
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          async (decodedText) => {
            await stopCamera();
            setScanMode("manual");
            setManualCode(decodedText);
            submitCheckInCode(decodedText);
          },
          () => {},
        );
      } catch {
        toast.error("Không mở được camera. Hãy nhập mã vé thủ công.");
        setScanMode("manual");
      }
    })();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [showCheckInModal, scanMode]);

  const submitCheckInCode = async (codeValue) => {
    const code = String(codeValue ?? manualCode).trim();
    if (!code) {
      toast.error("Vui lòng nhập mã vé (VD: BHUB-A1B2C3)");
      return;
    }
    setCheckingIn(true);
    setCheckInResult(null);
    try {
      const res = await api.put("/bookings/check-in-code", { code });
      toast.success(res.data.message);
      setCheckInResult({
        ok: true,
        message: res.data.message,
        booking: res.data.booking,
      });
      setManualCode("");
      fetchBookings();
    } catch (err) {
      const msg = err.response?.data?.message || "Check-in thất bại";
      toast.error(msg);
      setCheckInResult({
        ok: false,
        message: msg,
        booking: err.response?.data?.booking || null,
      });
    } finally {
      setCheckingIn(false);
    }
  };

  const handleQuickCheckIn = async (id) => {
    try {
      await api.put(`/bookings/${id}/checkin`);
      toast.success("Check-in thành công!");
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi check-in");
    }
  };

  const handleStatus = async (id, status) => {
    try {
      await api.put(`/bookings/${id}/status`, { status });
      toast.success("Cập nhật trạng thái thành công");
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi cập nhật");
    }
  };

  const closeCheckInModal = () => {
    stopCamera();
    setShowCheckInModal(false);
    setCheckInResult(null);
    setManualCode("");
    setScanMode("manual");
  };

  const filtered =
    filter === "all" ? bookings : bookings.filter((b) => b.status === filter);

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Quản lý đặt sân</h1>
          <p className="admin-page-subtitle">
            Xem, xác nhận lịch đặt sân và quét mã QR Check-in tại quầy
          </p>
        </div>
        <button
          onClick={() => {
            setCheckInResult(null);
            setShowCheckInModal(true);
          }}
          className="admin-header-btn"
        >
          <QrCode size={16} /> Quét QR Check-in
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="admin-filter-tabs">
        {[
          { key: "all", label: "Tất cả" },
          { key: "pending", label: "Chờ xác nhận" },
          { key: "confirmed", label: "Đã xác nhận" },
          { key: "cancelled", label: "Đã huỷ" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`admin-filter-tab ${filter === tab.key ? "admin-filter-tab--active" : ""}`}
          >
            {tab.label}
            <span className="admin-filter-tab-count">
              {tab.key === "all"
                ? bookings.length
                : bookings.filter((b) => b.status === tab.key).length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="admin-loading">
          <div className="admin-loading-spinner"></div>
          <span>Đang tải dữ liệu...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty">
          <span className="admin-empty-icon">
            <CalendarX size={40} />
          </span>
          <p>Không có booking nào</p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>Sân</th>
                <th>Ngày</th>
                <th>Giờ</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => {
                const s = STATUS_MAP[b.status];
                const isExpanded = expandedRows[b._id];
                const ticketCode =
                  b.checkInCode ||
                  `BHUB-${String(b._id).slice(-6).toUpperCase()}`;
                return (
                  <Fragment key={b._id}>
                    <tr>
                      <td>
                        <div className="admin-user-cell">
                          <div>
                            <div className="admin-user-name">
                              {b.user?.name}
                            </div>
                            <div className="admin-text-muted">
                              {b.user?.phone || ticketCode}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="admin-text-secondary">
                        <Volleyball size={14} style={{ color: "#0D9D57" }} />{" "}
                        {b.court?.name}
                      </td>
                      <td className="admin-text-secondary">{b.date}</td>
                      <td className="admin-text-secondary">
                        {b.startTime} - {b.endTime}
                      </td>
                      <td>
                        <div
                          className="admin-price-cell"
                          style={{ display: "flex", flexDirection: "column" }}
                        >
                          <span
                            className="admin-text-price"
                            style={{ fontWeight: "bold" }}
                          >
                            {b.totalPrice?.toLocaleString("vi-VN")}đ
                          </span>
                          {b.paymentStatus === "paid" && (
                            <span className="text-[11px] font-semibold text-emerald-700">
                              ✓ Đã thanh toán
                            </span>
                          )}
                          {b.priceBreakdown && b.priceBreakdown.length > 0 && (
                            <button
                              onClick={() => toggleRow(b._id)}
                              className="admin-detail-toggle-btn"
                              style={{
                                border: "none",
                                background: "none",
                                color: "#10b981",
                                fontSize: "11px",
                                fontWeight: "bold",
                                cursor: "pointer",
                                padding: "2px 0",
                                textDecoration: "underline",
                                textAlign: "left",
                                marginTop: "2px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 3,
                              }}
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp size={12} /> Ẩn chi tiết
                                </>
                              ) : (
                                <>
                                  <ChevronDown size={12} /> Chi tiết giá
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col items-start gap-1">
                          <span className={s?.cls}>{s?.text}</span>
                          {b.checkedIn && (
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              ✓ Đã Check-in
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="admin-action-group">
                          {b.status === "pending" && (
                            <button
                              onClick={() => handleStatus(b._id, "confirmed")}
                              className="admin-action-btn admin-action-btn--confirm"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <CheckCircle size={13} /> Xác nhận
                            </button>
                          )}
                          {b.status === "confirmed" && !b.checkedIn && (
                            <button
                              onClick={() => handleQuickCheckIn(b._id)}
                              className="admin-action-btn admin-action-btn--edit"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <UserCheck size={13} /> Check-in
                            </button>
                          )}
                          {b.status !== "cancelled" && !b.checkedIn && (
                            <button
                              onClick={() => handleStatus(b._id, "cancelled")}
                              className="admin-action-btn admin-action-btn--danger"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <XCircle size={13} /> Huỷ
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded &&
                      b.priceBreakdown &&
                      b.priceBreakdown.length > 0 && (
                        <tr
                          className="admin-expanded-row"
                          style={{ backgroundColor: "#f8fafc" }}
                        >
                          <td
                            colSpan="7"
                            style={{
                              padding: "16px 24px",
                              borderBottom: "1px solid #e2e8f0",
                            }}
                          >
                            <div className="admin-breakdown-container">
                              <h4
                                style={{
                                  margin: "0 0 10px 0",
                                  fontSize: "11px",
                                  fontWeight: "800",
                                  color: "#64748b",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.5px",
                                }}
                              >
                                Chi tiết phân bổ giá động từng khung giờ (30 phút)
                              </h4>
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns:
                                    "repeat(auto-fill, minmax(220px, 1fr))",
                                  gap: "8px",
                                }}
                              >
                                {b.priceBreakdown.map((seg, idx) => {
                                  const isNormal = seg.ruleType === "normal";
                                  const isPeak = seg.ruleType === "peak";
                                  const isWeekend = seg.ruleType === "weekend";
                                  const dotColor = isNormal
                                    ? "#10b981"
                                    : isPeak
                                      ? "#f59e0b"
                                      : isWeekend
                                        ? "#ef4444"
                                        : "#8b5cf6";
                                  const tagBg = isNormal
                                    ? "#ecfdf5"
                                    : isPeak
                                      ? "#fffbeb"
                                      : isWeekend
                                        ? "#fef2f2"
                                        : "#f5f3ff";
                                  const borderColor = isNormal
                                    ? "#a7f3d0"
                                    : isPeak
                                      ? "#fde68a"
                                      : isWeekend
                                        ? "#fca5a5"
                                        : "#ddd6fe";
                                  return (
                                    <div
                                      key={idx}
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        padding: "8px 12px",
                                        borderRadius: "10px",
                                        backgroundColor: tagBg,
                                        border: `1px solid ${borderColor}`,
                                        fontSize: "11px",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "6px",
                                        }}
                                      >
                                        <span
                                          style={{
                                            width: "6px",
                                            height: "6px",
                                            borderRadius: "50%",
                                            backgroundColor: dotColor,
                                          }}
                                        />
                                        <span
                                          style={{
                                            fontWeight: "bold",
                                            color: "#1e293b",
                                          }}
                                        >
                                          {seg.timeSlot}
                                        </span>
                                        {seg.ruleName && (
                                          <span
                                            style={{
                                              color: "#64748b",
                                              fontSize: "10px",
                                              marginLeft: "4px",
                                            }}
                                          >
                                            ({seg.ruleName})
                                          </span>
                                        )}
                                      </div>
                                      <span
                                        style={{
                                          fontWeight: "bold",
                                          color: "#0f172a",
                                        }}
                                      >
                                        {seg.price?.toLocaleString("vi-VN")}đ
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL QUÉT QR / NHẬP MÃ VÉ CHECK-IN ── */}
      {showCheckInModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={closeCheckInModal}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="font-extrabold text-lg text-slate-900">
                Check-in vé QR tại quầy
              </h2>
              <button
                onClick={closeCheckInModal}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X size={18} />
              </button>
            </div>

            {/* Chọn chế độ Nhập mã / Camera */}
            <div className="grid grid-cols-2 gap-2 mt-4 bg-gray-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setScanMode("manual")}
                className={`py-2 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 transition ${
                  scanMode === "manual"
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-gray-600"
                }`}
              >
                <Keyboard size={14} /> Nhập / Dán mã vé
              </button>
              <button
                type="button"
                onClick={() => setScanMode("camera")}
                className={`py-2 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 transition ${
                  scanMode === "camera"
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-gray-600"
                }`}
              >
                <Camera size={14} /> Quét bằng Camera
              </button>
            </div>

            {scanMode === "camera" ? (
              <div className="mt-4">
                <div
                  id="admin-qr-reader"
                  className="w-full rounded-xl overflow-hidden border border-gray-200 bg-black/5 min-h-[240px]"
                />
                <p className="text-xs text-gray-500 text-center mt-2">
                  Đưa mã QR trên điện thoại khách vào khung hình
                </p>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitCheckInCode();
                }}
                className="mt-4 space-y-3"
              >
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Mã vé Check-in
                  </label>
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    placeholder="VD: BHUB-A1B2C3"
                    autoFocus
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm font-bold tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={checkingIn}
                  className="w-full py-2.5 rounded-xl bg-[#0b7f47] hover:bg-[#08653a] text-white font-bold text-sm transition disabled:opacity-60"
                >
                  {checkingIn ? "Đang kiểm tra..." : "Xác nhận Check-in"}
                </button>
              </form>
            )}

            {/* Kết quả Check-in */}
            {checkInResult && (
              <div
                className={`mt-4 p-3.5 rounded-xl border text-xs space-y-1.5 ${
                  checkInResult.ok
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-red-50 border-red-200 text-red-800"
                }`}
              >
                <p className="font-bold text-sm">{checkInResult.message}</p>
                {checkInResult.booking && (
                  <div className="pt-1 border-t border-black/10 space-y-1">
                    <p>
                      Khách:{" "}
                      <strong>{checkInResult.booking.user?.name || "—"}</strong>
                    </p>
                    <p>
                      Sân:{" "}
                      <strong>
                        {checkInResult.booking.court?.name || "—"}
                      </strong>
                    </p>
                    <p>
                      Khung giờ:{" "}
                      <strong>
                        {checkInResult.booking.date} ·{" "}
                        {checkInResult.booking.startTime}–
                        {checkInResult.booking.endTime}
                      </strong>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}