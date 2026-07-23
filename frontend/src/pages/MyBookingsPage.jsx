import { useEffect, useState } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import {
  Activity,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  List,
  Hourglass,
  FileText,
  BarChart3,
  ShoppingBag,
} from "lucide-react";

const STATUS_MAP = {
  pending: {
    text: "Chờ Xác Nhận",
    cls: "badge-pending",
    icon: <Clock size={12} />,
  },
  confirmed: {
    text: "Đã Xác Nhận",
    cls: "badge-confirmed",
    icon: <CheckCircle size={12} />,
  },
  cancelled: {
    text: "Đã Hủy Lịch",
    cls: "badge-cancelled",
    icon: <XCircle size={12} />,
  },
};

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [serviceOrders, setServiceOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedBookings, setExpandedBookings] = useState({});
  const [filter, setFilter] = useState("all");
  const [now, setNow] = useState(Date.now());

  const toggleBreakdown = (id) =>
    setExpandedBookings((prev) => ({ ...prev, [id]: !prev[id] }));

  const fetchBookings = () => {
    Promise.all([api.get("/bookings"), api.get("/service-orders")])
      .then(([bookingRes, svcRes]) => {
        setBookings(bookingRes.data.bookings);
        setServiceOrders(svcRes.data.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCancel = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy lịch đặt sân này?")) return;
    try {
      await api.delete(`/bookings/${id}`);
      toast.success("Hủy lịch thành công");
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || "Hủy thất bại");
    }
  };

  const filtered =
    filter === "all" ? bookings : bookings.filter((b) => b.status === filter);

  const getHoldTimeLeft = (expiresAt) => {
    if (!expiresAt) return null;
    const diff = Math.max(0, new Date(expiresAt).getTime() - now);
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  // Tìm đơn dịch vụ gắn với 1 booking
  const getLinkedServices = (bookingId, batchId) => {
    return serviceOrders.filter(
      (so) => so.booking === bookingId || so.booking === batchId,
    );
  };

  const counts = {
    all: bookings.length,
    pending: bookings.filter((b) => b.status === "pending").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
  };

  return (
    <div className="animate-fadeIn has-bottom-nav">
      {/* Header */}
      <div
        style={{
          background:
            "linear-gradient(135deg, #0D9D57 0%, #1aaf64 60%, #0a7a42 100%)",
          padding: "28px 16px 48px",
        }}
      >
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <h1
            style={{
              fontSize: "clamp(20px, 4vw, 28px)",
              fontWeight: 900,
              color: "white",
              marginBottom: 6,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Calendar size={24} /> Lịch Đặt Của Tôi
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.8)",
              fontWeight: 500,
            }}
          >
            {bookings.length} lịch đặt tổng cộng
          </p>
        </div>
      </div>

      <div
        style={{
          maxWidth: 800,
          margin: "-24px auto 0",
          padding: "0 16px 48px",
        }}
      >
        {/* Filter Tabs */}
        <div
          style={{
            background: "white",
            borderRadius: 14,
            border: "1px solid var(--border)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
            padding: "6px",
            display: "flex",
            gap: 4,
            marginBottom: 16,
            overflowX: "auto",
          }}
        >
          {[
            { id: "all", label: "Tất cả", icon: <List size={16} /> },
            { id: "pending", label: "Chờ xác nhận", icon: <Clock size={16} /> },
            {
              id: "confirmed",
              label: "Đã xác nhận",
              icon: <CheckCircle size={16} />,
            },
            { id: "cancelled", label: "Đã hủy", icon: <XCircle size={16} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              style={{
                flex: 1,
                padding: "10px 8px",
                borderRadius: 10,
                border: "none",
                background: filter === tab.id ? "#0D9D57" : "transparent",
                color: filter === tab.id ? "white" : "var(--text-secondary)",
                fontWeight: 800,
                fontSize: 12,
                cursor: "pointer",
                transition: "all 0.2s",
                fontFamily: "Nunito, sans-serif",
                whiteSpace: "nowrap",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span style={{ display: "inline-flex" }}>{tab.icon}</span>
              {tab.label}
              <span
                style={{
                  fontSize: 11,
                  background:
                    filter === tab.id
                      ? "rgba(255,255,255,0.25)"
                      : "var(--surface-2)",
                  borderRadius: 999,
                  padding: "1px 8px",
                }}
              >
                {counts[tab.id]}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="skeleton"
                style={{ height: 120, borderRadius: 14 }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "56px 20px",
              background: "white",
              borderRadius: 16,
              border: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <Calendar size={56} className="text-slate-300" />
            </div>
            <h3
              style={{
                fontWeight: 800,
                fontSize: 18,
                color: "var(--text-primary)",
                marginBottom: 8,
              }}
            >
              {filter === "all"
                ? "Bạn chưa đặt lịch nào"
                : "Không có lịch trong mục này"}
            </h3>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: 13,
                maxWidth: 280,
                margin: "0 auto 24px",
              }}
            >
              {filter === "all"
                ? "Hãy đặt sân ngay để bắt đầu trải nghiệm!"
                : "Không tìm thấy lịch với trạng thái này."}
            </p>
            {filter === "all" ? (
              <Link
                to="/courts"
                className="btn btn-primary"
                style={{ borderRadius: 999, padding: "12px 28px" }}
              >
                Đặt sân ngay →
              </Link>
            ) : (
              <button
                onClick={() => setFilter("all")}
                className="btn btn-outline"
                style={{ borderRadius: 999 }}
              >
                Xem tất cả lịch
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map((b, idx) => {
              const s = STATUS_MAP[b.status] || STATUS_MAP.pending;
              const holdTimeLeft =
                b.status === "pending" ? getHoldTimeLeft(b.expiresAt) : null;
              const startParts = b.startTime.split(":");
              const endParts = b.endTime.split(":");
              const startMinutes =
                parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
              const endMinutes =
                parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
              const duration = (endMinutes - startMinutes) / 60;
              const linkedServices = getLinkedServices(b._id, b.batchId);

              return (
                <div
                  key={b._id}
                  className="booking-card"
                  style={{
                    animation: `fadeInUp 0.4s ease ${idx * 0.05}s both`,
                  }}
                >
                  {/* Header */}
                  <div className="booking-card__header">
                    <div
                      className="booking-card__icon"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Activity size={20} className="text-emerald-600" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3
                        style={{
                          fontWeight: 800,
                          fontSize: 15,
                          color: "var(--text-primary)",
                          marginBottom: 2,
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {b.court?.name || "Sân cầu lông"}
                      </h3>
                      <div
                        style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
                      >
                        <span
                          className="booking-meta-chip"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Calendar size={11} /> {b.date}
                        </span>
                        <span
                          className="booking-meta-chip"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Clock size={11} /> {b.startTime} – {b.endTime} (
                          {duration}h)
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: 6,
                      }}
                    >
                      <span
                        className={`badge ${s.cls}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {s.icon} <span>{s.text}</span>
                      </span>
                      {holdTimeLeft && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: "#b45309",
                            background: "#fff7ed",
                            border: "1px solid #fed7aa",
                            borderRadius: 999,
                            padding: "4px 8px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Hourglass size={11} /> Giữ chỗ còn {holdTimeLeft}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="booking-card__body">
                    {/* Price */}
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--text-muted)",
                          marginBottom: 2,
                        }}
                      >
                        TỔNG TIỀN
                      </div>
                      <div
                        style={{
                          fontSize: 22,
                          fontWeight: 900,
                          color: "var(--primary)",
                        }}
                      >
                        {b.totalPrice?.toLocaleString("vi-VN")}đ
                      </div>
                      {/* Dịch vụ đi kèm */}
                      {linkedServices.length > 0 &&
                        linkedServices.map((so) => (
                          <div
                            key={so._id}
                            style={{
                              marginTop: 6,
                              padding: "6px 10px",
                              background: "#f0fdf4",
                              borderRadius: 8,
                              border: "1px solid #bbf7d0",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: "#166534",
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                marginBottom: 3,
                              }}
                            >
                              <ShoppingBag size={11} /> Dịch vụ đi kèm (
                              {so.orderNumber})
                              <span
                                className={`badge ${so.status === "paid" ? "badge-confirmed" : so.status === "cancelled" ? "badge-cancelled" : "badge-pending"}`}
                                style={{ fontSize: 9 }}
                              >
                                {so.status === "paid"
                                  ? "Đã TT"
                                  : so.status === "cancelled"
                                    ? "Đã hủy"
                                    : "Chờ TT"}
                              </span>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 4,
                              }}
                            >
                              {so.items.slice(0, 4).map((item) => (
                                <span
                                  key={item._id}
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 600,
                                    background: "white",
                                    color: "#065f46",
                                    padding: "2px 6px",
                                    borderRadius: 4,
                                    border: "1px solid #a7f3d0",
                                  }}
                                >
                                  {item.productName} x{item.quantity}
                                </span>
                              ))}
                              {so.items.length > 4 && (
                                <span
                                  style={{ fontSize: 10, color: "#6b7280" }}
                                >
                                  +{so.items.length - 4}
                                </span>
                              )}
                            </div>
                            {so.totalAmount > 0 && (
                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 800,
                                  color: "#059669",
                                  marginTop: 3,
                                }}
                              >
                                Tổng DV:{" "}
                                {so.totalAmount.toLocaleString("vi-VN")}đ
                              </div>
                            )}
                          </div>
                        ))}
                      {b.priceBreakdown && b.priceBreakdown.length > 0 && (
                        <button
                          onClick={() => toggleBreakdown(b._id)}
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: "var(--primary)",
                            background: "var(--primary-light)",
                            border: "none",
                            borderRadius: 6,
                            padding: "3px 10px",
                            cursor: "pointer",
                            marginTop: 4,
                            fontFamily: "Nunito, sans-serif",
                          }}
                        >
                          {expandedBookings[b._id]
                            ? "▲ Ẩn chi tiết"
                            : "▼ Chi tiết giá"}
                        </button>
                      )}
                    </div>

                    {/* Note + Cancel */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: 8,
                      }}
                    >
                      {b.note && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--text-muted)",
                            background: "var(--surface-2)",
                            padding: "6px 12px",
                            borderRadius: 8,
                            maxWidth: 200,
                            textAlign: "right",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <FileText size={12} /> {b.note}
                        </div>
                      )}
                      {b.status !== "cancelled" && (
                        <button
                          onClick={() => handleCancel(b._id)}
                          style={{
                            background: "#ffeaea",
                            color: "#c62828",
                            border: "1px solid #ffcdd2",
                            padding: "8px 16px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 800,
                            cursor: "pointer",
                            fontFamily: "Nunito, sans-serif",
                            transition: "all 0.2s",
                          }}
                        >
                          Hủy lịch
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Price breakdown */}
                  {expandedBookings[b._id] &&
                    b.priceBreakdown &&
                    b.priceBreakdown.length > 0 && (
                      <div
                        style={{
                          borderTop: "1px solid var(--border-light)",
                          padding: "14px 20px",
                          animation: "fadeIn 0.3s ease",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: "var(--text-muted)",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            marginBottom: 10,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <BarChart3 size={12} /> Chi tiết tính giá
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(200px, 1fr))",
                            gap: 8,
                          }}
                        >
                          {b.priceBreakdown.map((seg, i) => {
                            const isNormal = seg.ruleType === "normal";
                            const isPeak = seg.ruleType === "peak";
                            const isWeekend = seg.ruleType === "weekend";
                            const bg = isNormal
                              ? "#e8f8ef"
                              : isPeak
                                ? "#fff8e1"
                                : isWeekend
                                  ? "#fdecea"
                                  : "#f3e8ff";
                            const color = isNormal
                              ? "#0D9D57"
                              : isPeak
                                ? "#d97706"
                                : isWeekend
                                  ? "#c62828"
                                  : "#7c3aed";
                            return (
                              <div
                                key={i}
                                style={{
                                  background: bg,
                                  borderRadius: 10,
                                  padding: "10px 14px",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <div>
                                  <div
                                    style={{
                                      fontSize: 12,
                                      fontWeight: 700,
                                      color,
                                    }}
                                  >
                                    {seg.timeSlot}
                                  </div>
                                  {seg.ruleName && (
                                    <div
                                      style={{
                                        fontSize: 10,
                                        color,
                                        opacity: 0.7,
                                      }}
                                    >
                                      {seg.ruleName}
                                    </div>
                                  )}
                                </div>
                                <div
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 800,
                                    color,
                                  }}
                                >
                                  {seg.price?.toLocaleString("vi-VN")}đ
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
