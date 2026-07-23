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
  History,
  Star,
  TrendingUp,
  Award,
  Zap,
  Send,
  MessageSquare,
  ChevronRight,
  ThumbsUp,
  ArrowLeft,
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

/* ─── Star display (read-only) ─── */
function StarDisplay({ value, size = 14 }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          fill={s <= value ? "#f59e0b" : "none"}
          color={s <= value ? "#f59e0b" : "#d1d5db"}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}

/* ─── Interactive star picker ─── */
function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  const LABELS = ["", "Rất tệ", "Không tốt", "Bình thường", "Tốt", "Xuất sắc"];
  const COLORS = ["", "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#0D9D57"];
  const EMOJIS = ["", "😞", "😕", "😐", "😊", "🤩"];
  const BG = ["", "#fef2f2", "#fff7ed", "#fffbeb", "#f0fdf4", "#e8f8ef"];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      {/* Stars row */}
      <div style={{ display: "flex", gap: 10 }}>
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            onMouseEnter={() => setHovered(s)}
            onMouseLeave={() => setHovered(0)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              transition: "transform 0.15s",
              transform: s <= display ? "scale(1.18)" : "scale(1)",
            }}
          >
            <Star
              size={40}
              fill={s <= display ? COLORS[display] || "#f59e0b" : "none"}
              color={s <= display ? COLORS[display] || "#f59e0b" : "#d1d5db"}
              strokeWidth={1.5}
              style={{
                transition: "all 0.18s",
                filter:
                  s <= display
                    ? `drop-shadow(0 2px 6px ${COLORS[display]}55)`
                    : "none",
              }}
            />
          </button>
        ))}
      </div>

      {/* Label pill */}
      <div
        style={{
          minHeight: 36,
          display: "flex",
          alignItems: "center",
          transition: "all 0.2s",
        }}
      >
        {display > 0 ? (
          <div
            style={{
              background: BG[display],
              color: COLORS[display],
              borderRadius: 99,
              padding: "6px 18px",
              fontWeight: 800,
              fontSize: 14,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              border: `1.5px solid ${COLORS[display]}30`,
              animation: "fadeIn 0.18s ease",
            }}
          >
            <span style={{ fontSize: 18 }}>{EMOJIS[display]}</span>
            {LABELS[display]}
          </div>
        ) : (
          <span
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
              fontWeight: 600,
            }}
          >
            Chạm vào ngôi sao để chọn
          </span>
        )}
      </div>

      {/* Number labels under stars */}
      <div style={{ display: "flex", gap: 10 }}>
        {[1, 2, 3, 4, 5].map((s) => (
          <div
            key={s}
            style={{
              width: 48,
              textAlign: "center",
              fontSize: 11,
              fontWeight: 700,
              color: s <= display ? COLORS[display] : "var(--text-muted)",
              transition: "color 0.2s",
            }}
          >
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Inline review form for one booking ─── */
function InlineReviewForm({ booking, onSubmitted, onBack }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) {
      toast.error("Vui lòng chọn số sao đánh giá!");
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/bookings/${booking._id}/review`, { rating, comment });
      toast.success("Cảm ơn bạn đã đánh giá! ⭐");
      onSubmitted();
    } catch (err) {
      toast.error(err.response?.data?.message || "Gửi đánh giá thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        background: "white",
        borderRadius: 20,
        border: "1px solid var(--border)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
        overflow: "hidden",
        animation: "fadeInUp 0.35s ease",
      }}
    >
      {/* Card header */}
      <div
        style={{
          background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          padding: "20px 24px",
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "none",
            borderRadius: 8,
            padding: "5px 12px",
            color: "white",
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "Nunito, sans-serif",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            marginBottom: 12,
          }}
        >
          <ArrowLeft size={13} /> Chọn sân khác
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "rgba(255,255,255,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Star size={22} color="white" fill="white" />
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16, color: "white" }}>
              {booking.court?.name || "Sân cầu lông"}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.85)",
                display: "flex",
                gap: 10,
                marginTop: 2,
              }}
            >
              <span>
                <Calendar
                  size={11}
                  style={{
                    display: "inline",
                    verticalAlign: "middle",
                    marginRight: 3,
                  }}
                />
                {booking.date}
              </span>
              <span>
                <Clock
                  size={11}
                  style={{
                    display: "inline",
                    verticalAlign: "middle",
                    marginRight: 3,
                  }}
                />
                {booking.startTime}–{booking.endTime}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Form body */}
      <form
        onSubmit={handleSubmit}
        style={{
          padding: "28px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {/* ⭐ Star picker – tiêu điểm chính */}
        <div>
          <div style={{ textAlign: "center", marginBottom: 4 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--text-secondary)",
              }}
            >
              Bạn chấm điểm chất lượng sân thế nào?
            </span>
          </div>
          <div
            style={{
              padding: "20px 16px",
              background: "var(--surface-2)",
              borderRadius: 16,
              marginTop: 10,
            }}
          >
            <StarPicker value={rating} onChange={setRating} />
          </div>
        </div>

        {/* Comment */}
        <div>
          <label
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--text-secondary)",
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <MessageSquare size={14} /> Nhận xét chi tiết{" "}
            <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>
              (không bắt buộc)
            </span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Sân sạch sẽ, ánh sáng tốt, nhân viên thân thiện... Chia sẻ để giúp người chơi khác nhé!"
            rows={4}
            maxLength={300}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 12,
              border: "1.5px solid var(--border)",
              outline: "none",
              fontFamily: "Nunito, sans-serif",
              fontSize: 13,
              resize: "vertical",
              color: "var(--text-primary)",
              background: "var(--surface-2)",
              lineHeight: 1.6,
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#f59e0b")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
          />
          <div
            style={{
              textAlign: "right",
              fontSize: 11,
              color: "var(--text-muted)",
              marginTop: 4,
            }}
          >
            {comment.length}/300
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || !rating}
          style={{
            padding: "14px",
            borderRadius: 999,
            border: "none",
            background: rating
              ? "linear-gradient(135deg, #f59e0b, #d97706)"
              : "#e5e7eb",
            color: rating ? "white" : "#9ca3af",
            fontWeight: 800,
            fontSize: 15,
            fontFamily: "Nunito, sans-serif",
            cursor: rating && !submitting ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            boxShadow: rating ? "0 6px 20px rgba(245,158,11,0.35)" : "none",
            transition: "all 0.2s",
          }}
        >
          {submitting ? (
            <>
              <span
                style={{
                  width: 18,
                  height: 18,
                  border: "2px solid rgba(255,255,255,0.35)",
                  borderTopColor: "white",
                  borderRadius: "50%",
                  display: "inline-block",
                  animation: "spin 0.7s linear infinite",
                }}
              />{" "}
              Đang gửi...
            </>
          ) : (
            <>
              <Send size={16} /> Gửi đánh giá
            </>
          )}
        </button>
      </form>
    </div>
  );
}

/* ─── Review card (already submitted) ─── */
function ReviewCard({ review, idx }) {
  const COLORS = ["", "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#0D9D57"];
  const LABELS = ["", "Rất tệ", "Không tốt", "Bình thường", "Tốt", "Xuất sắc"];
  const c = COLORS[review.rating] || "#f59e0b";

  return (
    <div
      style={{
        background: "white",
        borderRadius: 16,
        border: "1px solid var(--border)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
        overflow: "hidden",
        animation: `fadeInUp 0.4s ease ${idx * 0.06}s both`,
      }}
    >
      {/* Colored top bar */}
      <div
        style={{
          height: 4,
          background: `linear-gradient(90deg, ${c}, ${c}99)`,
        }}
      />
      <div style={{ padding: "16px 18px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontWeight: 800,
                fontSize: 14,
                color: "var(--text-primary)",
                marginBottom: 4,
              }}
            >
              {review.court?.name || "Sân cầu lông"}
            </div>
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <Calendar size={11} /> {review.date}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <Clock size={11} /> {review.startTime}–{review.endTime}
              </span>
            </div>
            <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={16}
                  fill={s <= review.rating ? c : "none"}
                  color={s <= review.rating ? c : "#d1d5db"}
                  strokeWidth={1.5}
                />
              ))}
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: c,
                  marginLeft: 4,
                }}
              >
                {LABELS[review.rating]}
              </span>
            </div>
          </div>
          <div
            style={{
              background: c + "18",
              borderRadius: 10,
              padding: "8px 12px",
              textAlign: "center",
              flexShrink: 0,
            }}
          >
            <div
              style={{ fontSize: 24, fontWeight: 900, color: c, lineHeight: 1 }}
            >
              {review.rating}
            </div>
            <div
              style={{ fontSize: 9, fontWeight: 700, color: c, opacity: 0.8 }}
            >
              / 5
            </div>
          </div>
        </div>
        {review.comment && (
          <div
            style={{
              marginTop: 10,
              fontSize: 13,
              color: "var(--text-secondary)",
              background: "var(--surface-2)",
              borderRadius: 10,
              padding: "10px 14px",
              lineHeight: 1.6,
              display: "flex",
              gap: 8,
            }}
          >
            <MessageSquare
              size={13}
              style={{ flexShrink: 0, marginTop: 1, color: "#9ba6bb" }}
            />
            <span>"{review.comment}"</span>
          </div>
        )}
        {review.createdAt && (
          <div
            style={{
              marginTop: 8,
              fontSize: 11,
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <CheckCircle size={10} color="#0D9D57" />{" "}
            {new Date(review.createdAt).toLocaleString("vi-VN")}
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════ */
/*               MAIN PAGE                  */
/* ════════════════════════════════════════ */
export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedBookings, setExpandedBookings] = useState({});
  const [filter, setFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("bookings"); // 'bookings' | 'history' | 'reviews'
  const [now, setNow] = useState(Date.now());

  // History
  const [historyBookings, setHistoryBookings] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Reviews
  const [myReviews, setMyReviews] = useState([]);
  const [reviewable, setReviewable] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  /* ─── Fetch helpers ─── */
  const fetchBookings = () => {
    Promise.all([api.get("/bookings"), api.get("/service-orders")])
      .then(([bookingRes, svcRes]) => {
        setBookings(bookingRes.data.bookings);
        setServiceOrders(svcRes.data.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const fetchHistory = async () => {
    if (historyBookings.length > 0) return;
    setHistoryLoading(true);
    try {
      const res = await api.get("/bookings");
      const today = new Date().toISOString().split("T")[0];
      setHistoryBookings(
        res.data.bookings.filter(
          (b) =>
            b.status === "cancelled" ||
            (b.status === "confirmed" && b.date <= today),
        ),
      );
    } catch {
      toast.error("Không thể tải lịch sử");
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchReviews = async () => {
    setReviewLoading(true);
    try {
      const [myRes, ableRes] = await Promise.all([
        api.get("/bookings/my-reviews"),
        api.get("/bookings/reviewable"),
      ]);
      setMyReviews(myRes.data.reviews || []);
      setReviewable(ableRes.data.bookings || []);
    } catch {
      toast.error("Không thể tải đánh giá");
    } finally {
      setReviewLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);
  useEffect(() => {
    if (activeTab === "history") fetchHistory();
  }, [activeTab]);
  useEffect(() => {
    if (activeTab === "reviews") fetchReviews();
  }, [activeTab]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  /* ─── Handlers ─── */
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

  const handleReviewSubmitted = () => {
    setSubmitSuccess(true);
    setSelectedBooking(null);
    fetchReviews();
    setTimeout(() => setSubmitSuccess(false), 3000);
  };

  const toggleBreakdown = (id) =>
    setExpandedBookings((p) => ({ ...p, [id]: !p[id] }));

  const getHoldTimeLeft = (expiresAt) => {
    if (!expiresAt) return null;
    const diff = Math.max(0, new Date(expiresAt).getTime() - now);
    return `${Math.floor(diff / 60000)}:${String(Math.floor((diff % 60000) / 1000)).padStart(2, "0")}`;
  };

  /* ─── Derived values ─── */
  const filtered =
    filter === "all" ? bookings : bookings.filter((b) => b.status === filter);
  const counts = {
    all: bookings.length,
    pending: bookings.filter((b) => b.status === "pending").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
  };
  const today = new Date().toISOString().split("T")[0];
  const completedBookings = bookings.filter(
    (b) => b.status === "confirmed" && b.date <= today,
  );
  const totalSpent = completedBookings.reduce(
    (s, b) => s + (b.totalPrice || 0),
    0,
  );
  const totalHours = completedBookings.reduce((s, b) => {
    const [sh, sm] = b.startTime.split(":").map(Number);
    const [eh, em] = b.endTime.split(":").map(Number);
    return s + (eh * 60 + em - sh * 60 - sm) / 60;
  }, 0);
  const avgRating = myReviews.length
    ? (myReviews.reduce((s, r) => s + r.rating, 0) / myReviews.length).toFixed(
        1,
      )
    : 0;

  /* ─── Tabs config ─── */
  const TABS = [
    {
      id: "bookings",
      label: "Lịch Đặt",
      icon: <Calendar size={15} />,
      badge: bookings.length || null,
    },
    {
      id: "history",
      label: "Lịch Sử",
      icon: <History size={15} />,
      badge: null,
    },
    {
      id: "reviews",
      label: "Đánh Giá",
      icon: <Star size={15} />,
      badge: reviewable.length > 0 ? reviewable.length : null,
    },
  ];

  /* ════════════════════════════════ RENDER ═══════════════════════════════ */
  return (
    <div className="animate-fadeIn has-bottom-nav">
      {/* ── HEADER ── */}
      <div
        style={{
          background:
            "linear-gradient(135deg, #0D9D57 0%, #1aaf64 55%, #0a7a42 100%)",
          padding: "28px 16px 56px",
        }}
      >
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <h1
            style={{
              fontSize: "clamp(20px, 4vw, 26px)",
              fontWeight: 900,
              color: "white",
              marginBottom: 4,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Calendar size={24} /> Lịch Của Tôi
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.8)",
              fontWeight: 500,
              marginBottom: 20,
            }}
          >
            {bookings.length} lịch đặt • {myReviews.length} đánh giá
          </p>

          {/* ── 3-tab switcher ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 6,
              background: "rgba(255,255,255,0.14)",
              borderRadius: 14,
              padding: 5,
            }}
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedBooking(null);
                  setSubmitSuccess(false);
                }}
                style={{
                  position: "relative",
                  padding: "10px 8px",
                  borderRadius: 10,
                  border: "none",
                  background: activeTab === tab.id ? "white" : "transparent",
                  color:
                    activeTab === tab.id
                      ? tab.id === "reviews"
                        ? "#d97706"
                        : "#0D9D57"
                      : "rgba(255,255,255,0.88)",
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "Nunito, sans-serif",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 5,
                  boxShadow:
                    activeTab === tab.id
                      ? "0 3px 10px rgba(0,0,0,0.18)"
                      : "none",
                  transition: "all 0.22s",
                  whiteSpace: "nowrap",
                }}
              >
                {tab.icon}
                {tab.label}
                {tab.badge > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -4,
                      background: "#ef4444",
                      color: "white",
                      borderRadius: 99,
                      padding: "1px 6px",
                      fontSize: 10,
                      fontWeight: 800,
                      border: "2px solid white",
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div
        style={{
          maxWidth: 800,
          margin: "-24px auto 0",
          padding: "0 16px 48px",
        }}
      >
        {/* ══════════ TAB: LỊCH ĐẶT ══════════ */}
        {activeTab === "bookings" && (
          <>
            {/* Status filter */}
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
                { id: "all", label: "Tất cả", icon: <List size={15} /> },
                {
                  id: "pending",
                  label: "Chờ xác nhận",
                  icon: <Clock size={15} />,
                },
                {
                  id: "confirmed",
                  label: "Đã xác nhận",
                  icon: <CheckCircle size={15} />,
                },
                {
                  id: "cancelled",
                  label: "Đã hủy",
                  icon: <XCircle size={15} />,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  style={{
                    flex: 1,
                    padding: "9px 6px",
                    borderRadius: 10,
                    border: "none",
                    background: filter === tab.id ? "#0D9D57" : "transparent",
                    color:
                      filter === tab.id ? "white" : "var(--text-secondary)",
                    fontWeight: 800,
                    fontSize: 11,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    fontFamily: "Nunito, sans-serif",
                    whiteSpace: "nowrap",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <span style={{ display: "inline-flex" }}>{tab.icon}</span>
                  {tab.label}
                  <span
                    style={{
                      fontSize: 10,
                      background:
                        filter === tab.id
                          ? "rgba(255,255,255,0.25)"
                          : "var(--surface-2)",
                      borderRadius: 99,
                      padding: "1px 7px",
                    }}
                  >
                    {counts[tab.id]}
                  </span>
                </button>
              ))}
            </div>

            {loading ? (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
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
                  <Calendar size={56} style={{ color: "#d1d5db" }} />
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
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {filtered.map((b, idx) => {
                  const s = STATUS_MAP[b.status] || STATUS_MAP.pending;
                  const holdLeft =
                    b.status === "pending"
                      ? getHoldTimeLeft(b.expiresAt)
                      : null;
                  const [sh, sm] = b.startTime.split(":").map(Number);
                  const [eh, em] = b.endTime.split(":").map(Number);
                  const dur = (eh * 60 + em - sh * 60 - sm) / 60;

                  return (
                    <div
                      key={b._id}
                      className="booking-card"
                      style={{
                        animation: `fadeInUp 0.4s ease ${idx * 0.05}s both`,
                      }}
                    >
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
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 6,
                            }}
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
                              <Clock size={11} /> {b.startTime}–{b.endTime} (
                              {dur}h)
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
                          {holdLeft && (
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
                              <Hourglass size={11} /> Giữ chỗ còn {holdLeft}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="booking-card__body">
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
                          {b.priceBreakdown?.length > 0 && (
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
                          {/* Đánh giá (nếu đã chơi xong) */}
                          {b.status === "confirmed" && b.date <= today && (
                            <button
                              onClick={() => {
                                setActiveTab("reviews");
                                setSelectedBooking(b);
                                setSubmitSuccess(false);
                              }}
                              style={{
                                background: "#fff7ed",
                                color: "#d97706",
                                border: "1px solid #fed7aa",
                                padding: "8px 16px",
                                borderRadius: 999,
                                fontSize: 12,
                                fontWeight: 800,
                                cursor: "pointer",
                                fontFamily: "Nunito, sans-serif",
                                transition: "all 0.2s",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <Star size={13} fill="#d97706" color="#d97706" />{" "}
                              Đánh giá ngay
                            </button>
                          )}
                          {b.status !== "cancelled" && b.date > today && (
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

                      {expandedBookings[b._id] &&
                        b.priceBreakdown?.length > 0 && (
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
          </>
        )}

        {/* ══════════ TAB: LỊCH SỬ ══════════ */}
        {activeTab === "history" && (
          <>
            {/* Stats */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 12,
                marginBottom: 20,
              }}
            >
              {[
                {
                  icon: <CheckCircle size={22} color="#0D9D57" />,
                  bg: "#e8f8ef",
                  color: "#0D9D57",
                  label: "Buổi đã chơi",
                  value: completedBookings.length,
                  unit: "buổi",
                },
                {
                  icon: <TrendingUp size={22} color="#2563eb" />,
                  bg: "#eff6ff",
                  color: "#2563eb",
                  label: "Tổng chi tiêu",
                  value: totalSpent.toLocaleString("vi-VN"),
                  unit: "đ",
                },
                {
                  icon: <Zap size={22} color="#d97706" />,
                  bg: "#fff7ed",
                  color: "#d97706",
                  label: "Giờ chơi",
                  value: totalHours.toFixed(1),
                  unit: "giờ",
                },
                {
                  icon: <XCircle size={22} color="#dc2626" />,
                  bg: "#fef2f2",
                  color: "#dc2626",
                  label: "Đã hủy",
                  value: bookings.filter((b) => b.status === "cancelled")
                    .length,
                  unit: "lần",
                },
              ].map((stat, i) => (
                <div
                  key={i}
                  style={{
                    background: "white",
                    borderRadius: 16,
                    border: "1px solid var(--border)",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
                    padding: "16px",
                    animation: `fadeInUp 0.4s ease ${i * 0.06}s both`,
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: stat.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 10,
                    }}
                  >
                    {stat.icon}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--text-muted)",
                      marginBottom: 2,
                    }}
                  >
                    {stat.label}
                  </div>
                  <div
                    style={{ fontSize: 18, fontWeight: 900, color: stat.color }}
                  >
                    {stat.value}
                    <span
                      style={{ fontSize: 12, fontWeight: 600, marginLeft: 2 }}
                    >
                      {stat.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* History list */}
            <div
              style={{
                background: "white",
                borderRadius: 16,
                border: "1px solid var(--border)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid var(--border-light)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <History size={18} color="#0D9D57" />
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: 15,
                    color: "var(--text-primary)",
                  }}
                >
                  Tất Cả Lịch Sử
                </span>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--text-muted)",
                    background: "var(--surface-2)",
                    borderRadius: 99,
                    padding: "3px 10px",
                  }}
                >
                  {historyLoading ? "…" : historyBookings.length} lịch
                </span>
              </div>

              {historyLoading ? (
                <div
                  style={{
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="skeleton"
                      style={{ height: 72, borderRadius: 10 }}
                    />
                  ))}
                </div>
              ) : historyBookings.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 20px" }}>
                  <History
                    size={48}
                    style={{ color: "#d1d5db", marginBottom: 12 }}
                  />
                  <p
                    style={{
                      color: "var(--text-muted)",
                      fontWeight: 600,
                      fontSize: 14,
                    }}
                  >
                    Chưa có lịch sử đặt sân
                  </p>
                </div>
              ) : (
                historyBookings.map((b, idx) => {
                  const isCompleted = b.status === "confirmed";
                  const hasReview = b.review?.rating;
                  const [sh, sm] = b.startTime.split(":").map(Number);
                  const [eh, em] = b.endTime.split(":").map(Number);
                  const dur = (eh * 60 + em - (sh * 60 + sm)) / 60;

                  return (
                    <div
                      key={b._id}
                      style={{
                        padding: "14px 20px",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        borderBottom:
                          idx < historyBookings.length - 1
                            ? "1px solid var(--border-light)"
                            : "none",
                        transition: "background 0.15s",
                        animation: `fadeInUp 0.3s ease ${idx * 0.04}s both`,
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "#fafbfc")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          flexShrink: 0,
                          background: isCompleted ? "#e8f8ef" : "#fef2f2",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {isCompleted ? (
                          <CheckCircle size={20} color="#0D9D57" />
                        ) : (
                          <XCircle size={20} color="#dc2626" />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: 14,
                            color: "var(--text-primary)",
                            marginBottom: 2,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {b.court?.name || "Sân cầu lông"}
                        </div>
                        <div
                          style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              color: "var(--text-muted)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                            }}
                          >
                            <Calendar size={11} />
                            {b.date}
                          </span>
                          <span
                            style={{
                              fontSize: 12,
                              color: "var(--text-muted)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                            }}
                          >
                            <Clock size={11} />
                            {b.startTime}–{b.endTime} ({dur}h)
                          </span>
                          {hasReview && (
                            <StarDisplay value={b.review.rating} size={12} />
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 900,
                            color: isCompleted ? "#0D9D57" : "#dc2626",
                          }}
                        >
                          {b.totalPrice?.toLocaleString("vi-VN")}đ
                        </div>
                        {isCompleted && !hasReview && (
                          <button
                            onClick={() => {
                              setActiveTab("reviews");
                              setSelectedBooking(b);
                              setSubmitSuccess(false);
                            }}
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: "#d97706",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontFamily: "Nunito, sans-serif",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                              marginTop: 2,
                              padding: 0,
                            }}
                          >
                            <Star size={11} fill="#d97706" color="#d97706" />{" "}
                            Đánh giá
                          </button>
                        )}
                        {hasReview && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: "#0D9D57",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                              marginTop: 2,
                            }}
                          >
                            <Award size={11} /> Đã đánh giá
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* ══════════ TAB: ĐÁNH GIÁ ══════════ */}
        {activeTab === "reviews" && (
          <>
            {/* Success banner */}
            {submitSuccess && (
              <div
                style={{
                  background: "linear-gradient(135deg, #e8f8ef, #d1fae5)",
                  borderRadius: 16,
                  border: "1.5px solid #6ee7b7",
                  padding: "18px 20px",
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  animation: "fadeInUp 0.35s ease",
                }}
              >
                <CheckCircle size={28} color="#0D9D57" />
                <div>
                  <div
                    style={{ fontWeight: 800, fontSize: 15, color: "#0D9D57" }}
                  >
                    Gửi đánh giá thành công! 🎉
                  </div>
                  <div style={{ fontSize: 12, color: "#16a34a", marginTop: 2 }}>
                    Cảm ơn bạn đã chia sẻ trải nghiệm.
                  </div>
                </div>
              </div>
            )}

            {/* ── Nếu đã chọn 1 booking để đánh giá ── */}
            {selectedBooking ? (
              <InlineReviewForm
                booking={selectedBooking}
                onSubmitted={handleReviewSubmitted}
                onBack={() => setSelectedBooking(null)}
              />
            ) : (
              <>
                {/* Chờ đánh giá */}
                {reviewLoading ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      marginBottom: 20,
                    }}
                  >
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="skeleton"
                        style={{ height: 72, borderRadius: 14 }}
                      />
                    ))}
                  </div>
                ) : reviewable.length > 0 ? (
                  <div
                    style={{
                      background: "white",
                      borderRadius: 16,
                      border: "1.5px solid #fed7aa",
                      boxShadow: "0 4px 16px rgba(245,158,11,0.12)",
                      overflow: "hidden",
                      marginBottom: 20,
                    }}
                  >
                    <div
                      style={{
                        padding: "14px 18px",
                        background: "linear-gradient(135deg, #fff7ed, #fffbeb)",
                        borderBottom: "1px solid #fde68a",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <ThumbsUp size={18} color="#d97706" />
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: 14,
                          color: "#92400e",
                        }}
                      >
                        Chờ đánh giá
                      </span>
                      <span
                        style={{
                          marginLeft: "auto",
                          background: "#fbbf24",
                          color: "white",
                          borderRadius: 99,
                          padding: "2px 10px",
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {reviewable.length}
                      </span>
                    </div>
                    {reviewable.map((b, idx) => (
                      <button
                        key={b._id}
                        onClick={() => setSelectedBooking(b)}
                        style={{
                          width: "100%",
                          padding: "13px 18px",
                          border: "none",
                          borderBottom:
                            idx < reviewable.length - 1
                              ? "1px solid #fef3c7"
                              : "none",
                          background: "transparent",
                          cursor: "pointer",
                          textAlign: "left",
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          fontFamily: "Nunito, sans-serif",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "#fffbeb")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 12,
                            background: "#fff7ed",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Star size={20} color="#d97706" fill="#d97706" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontWeight: 800,
                              fontSize: 14,
                              color: "#92400e",
                              marginBottom: 2,
                            }}
                          >
                            {b.court?.name || "Sân cầu lông"}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: 10,
                              fontSize: 12,
                              color: "#b45309",
                            }}
                          >
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 3,
                              }}
                            >
                              <Calendar size={11} />
                              {b.date}
                            </span>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 3,
                              }}
                            >
                              <Clock size={11} />
                              {b.startTime}–{b.endTime}
                            </span>
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            color: "#d97706",
                          }}
                        >
                          <span style={{ fontSize: 12, fontWeight: 700 }}>
                            Đánh giá
                          </span>
                          <ChevronRight size={16} />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      background: "linear-gradient(135deg, #e8f8ef, #d1fae5)",
                      borderRadius: 14,
                      border: "1px solid #6ee7b7",
                      padding: "16px 20px",
                      marginBottom: 20,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <CheckCircle size={22} color="#0D9D57" />
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        color: "#065f46",
                      }}
                    >
                      Bạn đã đánh giá tất cả các buổi chơi! 🎉
                    </span>
                  </div>
                )}

                {/* Đánh giá đã gửi */}
                {reviewLoading ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="skeleton"
                        style={{ height: 130, borderRadius: 16 }}
                      />
                    ))}
                  </div>
                ) : myReviews.length > 0 ? (
                  <>
                    {/* Rating summary */}
                    <div
                      style={{
                        background: "white",
                        borderRadius: 16,
                        border: "1px solid var(--border)",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
                        padding: "18px 20px",
                        marginBottom: 16,
                        display: "flex",
                        gap: 20,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ textAlign: "center" }}>
                        <div
                          style={{
                            fontSize: 44,
                            fontWeight: 900,
                            color: "#f59e0b",
                            lineHeight: 1,
                          }}
                        >
                          {avgRating}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: 2,
                            justifyContent: "center",
                            margin: "6px 0 4px",
                          }}
                        >
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={14}
                              fill={
                                s <= Math.round(avgRating) ? "#f59e0b" : "none"
                              }
                              color={
                                s <= Math.round(avgRating)
                                  ? "#f59e0b"
                                  : "#d1d5db"
                              }
                              strokeWidth={1.5}
                            />
                          ))}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--text-muted)",
                            fontWeight: 600,
                          }}
                        >
                          {myReviews.length} đánh giá
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 140 }}>
                        {[5, 4, 3, 2, 1].map((star) => {
                          const cnt = myReviews.filter(
                            (r) => r.rating === star,
                          ).length;
                          return (
                            <div
                              key={star}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                marginBottom: 4,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: "var(--text-muted)",
                                  width: 10,
                                }}
                              >
                                {star}
                              </span>
                              <Star size={10} fill="#f59e0b" color="#f59e0b" />
                              <div
                                style={{
                                  flex: 1,
                                  height: 6,
                                  background: "#f3f4f6",
                                  borderRadius: 99,
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    height: "100%",
                                    borderRadius: 99,
                                    background:
                                      "linear-gradient(90deg,#f59e0b,#d97706)",
                                    width: myReviews.length
                                      ? `${(cnt / myReviews.length) * 100}%`
                                      : "0%",
                                    transition: "width 0.6s ease",
                                  }}
                                />
                              </div>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: "var(--text-secondary)",
                                  width: 14,
                                }}
                              >
                                {cnt}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      {myReviews.map((r, i) => (
                        <ReviewCard key={r._id} review={r} idx={i} />
                      ))}
                    </div>
                  </>
                ) : (
                  <div
                    style={{
                      background: "white",
                      borderRadius: 16,
                      border: "1px solid var(--border)",
                      padding: "48px 20px",
                      textAlign: "center",
                    }}
                  >
                    <Star
                      size={56}
                      style={{ color: "#fbbf24", marginBottom: 14 }}
                    />
                    <h3
                      style={{
                        fontWeight: 800,
                        fontSize: 17,
                        color: "var(--text-primary)",
                        marginBottom: 8,
                      }}
                    >
                      Chưa có đánh giá nào
                    </h3>
                    <p
                      style={{
                        color: "var(--text-muted)",
                        fontSize: 13,
                        maxWidth: 260,
                        margin: "0 auto",
                      }}
                    >
                      Sau khi chơi xong, hãy đánh giá sân để chia sẻ trải
                      nghiệm!
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
