import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  Star, MessageSquare, Send, CheckCircle, Award,
  Calendar, Clock, ChevronRight, Sparkles, ThumbsUp,
  ArrowLeft,
} from 'lucide-react';

/* ──────────────────────────────────────────── */
/*  Star picker component                        */
/* ──────────────────────────────────────────── */
function StarPicker({ value, onChange, size = 36 }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  const labels = ['', 'Tệ', 'Không tốt', 'Bình thường', 'Tốt', 'Tuyệt vời'];
  const colors = ['', '#dc2626', '#f97316', '#f59e0b', '#84cc16', '#0D9D57'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {[1, 2, 3, 4, 5].map(s => (
          <button
            key={s}
            onClick={() => onChange(s)}
            onMouseEnter={() => setHovered(s)}
            onMouseLeave={() => setHovered(0)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, transition: 'transform 0.15s' }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.9)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1.15)'}
          >
            <Star
              size={size}
              fill={s <= display ? (colors[display] || '#f59e0b') : 'none'}
              color={s <= display ? (colors[display] || '#f59e0b') : '#d1d5db'}
              style={{ transition: 'all 0.2s', transform: s <= display ? 'scale(1.1)' : 'scale(1)' }}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>
      <span style={{
        fontSize: 14, fontWeight: 800, color: display ? (colors[display] || '#f59e0b') : 'var(--text-muted)',
        minHeight: 20, transition: 'color 0.2s',
      }}>
        {display ? labels[display] : 'Chọn số sao'}
      </span>
    </div>
  );
}

/* ──────────────────────────────────────────── */
/*  Review card (already submitted)             */
/* ──────────────────────────────────────────── */
function ReviewCard({ review, idx }) {
  const starColor = ['', '#dc2626', '#f97316', '#f59e0b', '#84cc16', '#0D9D57'][review.rating] || '#f59e0b';
  const labels = ['', 'Tệ', 'Không tốt', 'Bình thường', 'Tốt', 'Tuyệt vời'];

  return (
    <div
      style={{
        background: 'white', borderRadius: 16, border: '1px solid var(--border)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)', padding: '18px 20px',
        animation: `fadeInUp 0.4s ease ${idx * 0.06}s both`,
        transition: 'box-shadow 0.2s, transform 0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'; }}
    >
      {/* Court name + date */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 8 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)', marginBottom: 4 }}>
            {review.court?.name || 'Sân cầu lông'}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <Calendar size={11} /> {review.date}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <Clock size={11} /> {review.startTime} – {review.endTime}
            </span>
          </div>
        </div>
        <div style={{ background: starColor + '15', borderRadius: 10, padding: '6px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          <span style={{ fontSize: 20, fontWeight: 900, color: starColor }}>{review.rating}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: starColor }}>{labels[review.rating]}</span>
        </div>
      </div>

      {/* Stars */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 10 }}>
        {[1,2,3,4,5].map(s => (
          <Star key={s} size={16} fill={s <= review.rating ? starColor : 'none'} color={s <= review.rating ? starColor : '#d1d5db'} strokeWidth={1.5} />
        ))}
      </div>

      {/* Comment */}
      {review.comment ? (
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', background: 'var(--surface-2)', borderRadius: 10, padding: '10px 14px', lineHeight: 1.6, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <MessageSquare size={14} style={{ flexShrink: 0, marginTop: 1, color: '#9ba6bb' }} />
          <span>"{review.comment}"</span>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Không có nhận xét</div>
      )}

      {/* Timestamp */}
      {review.createdAt && (
        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <CheckCircle size={11} color="#0D9D57" />
          Đánh giá lúc: {new Date(review.createdAt).toLocaleString('vi-VN')}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────── */
/*  Review submit form                           */
/* ──────────────────────────────────────────── */
function ReviewForm({ booking, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) { toast.error('Vui lòng chọn số sao đánh giá!'); return; }
    setSubmitting(true);
    try {
      await api.post(`/bookings/${booking._id}/review`, { rating, comment });
      toast.success('Cảm ơn bạn đã đánh giá! ⭐');
      onSubmitted();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gửi đánh giá thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Court info */}
      <div style={{ background: '#e8f8ef', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: '#0D9D57', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={20} color="white" />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#0D9D57' }}>{booking.court?.name}</div>
          <div style={{ fontSize: 12, color: '#16a34a', display: 'flex', gap: 8 }}>
            <span><Calendar size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 2 }} />{booking.date}</span>
            <span><Clock size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 2 }} />{booking.startTime}–{booking.endTime}</span>
          </div>
        </div>
      </div>

      {/* Star rating */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>
          Chất lượng sân và dịch vụ:
        </div>
        <StarPicker value={rating} onChange={setRating} />
      </div>

      {/* Comment */}
      <div>
        <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
          Nhận xét của bạn (không bắt buộc):
        </label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Chia sẻ trải nghiệm của bạn về sân, dịch vụ, môi trường... để giúp người khác lựa chọn tốt hơn!"
          rows={4}
          style={{
            width: '100%', padding: '12px 14px', borderRadius: 12,
            border: '1.5px solid var(--border)', outline: 'none',
            fontFamily: 'Nunito, sans-serif', fontSize: 13, resize: 'vertical',
            color: 'var(--text-primary)', transition: 'border-color 0.2s',
            background: 'var(--surface-2)', lineHeight: 1.6,
          }}
          onFocus={e => e.target.style.borderColor = '#0D9D57'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
          maxLength={500}
        />
        <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', marginTop: 4 }}>
          {comment.length}/500
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting || !rating}
        style={{
          background: rating ? 'linear-gradient(135deg, #f59e0b, #d97706)' : '#e5e7eb',
          color: rating ? 'white' : '#9ca3af',
          border: 'none', borderRadius: 999, padding: '14px',
          fontWeight: 800, fontSize: 15, cursor: rating ? 'pointer' : 'not-allowed',
          fontFamily: 'Nunito, sans-serif', transition: 'all 0.25s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: rating ? '0 6px 20px rgba(245,158,11,0.35)' : 'none',
        }}
      >
        {submitting ? (
          <span style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
        ) : (
          <><Send size={16} /> Gửi đánh giá</>
        )}
      </button>
    </form>
  );
}

/* ──────────────────────────────────────────── */
/*  Main page                                   */
/* ──────────────────────────────────────────── */
export default function ReviewPage() {
  const location = useLocation();
  const preselectedBookingId = location.state?.bookingId || null;

  const [activeTab, setActiveTab] = useState(preselectedBookingId ? 'write' : 'my');
  const [myReviews, setMyReviews] = useState([]);
  const [reviewable, setReviewable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [myRes, ableRes] = await Promise.all([
        api.get('/bookings/my-reviews'),
        api.get('/bookings/reviewable'),
      ]);
      setMyReviews(myRes.data.reviews || []);
      setReviewable(ableRes.data.bookings || []);

      // Nếu có booking được chọn sẵn từ state
      if (preselectedBookingId && ableRes.data.bookings) {
        const found = ableRes.data.bookings.find(b => b._id === preselectedBookingId);
        if (found) { setSelectedBooking(found); setActiveTab('write'); }
      }
    } catch {
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmitted = () => {
    setSubmitted(true);
    setSelectedBooking(null);
    fetchData();
    setActiveTab('my');
  };

  // Avg rating
  const avgRating = myReviews.length
    ? (myReviews.reduce((s, r) => s + r.rating, 0) / myReviews.length).toFixed(1)
    : 0;

  const ratingDist = [5,4,3,2,1].map(star => ({
    star,
    count: myReviews.filter(r => r.rating === star).length,
  }));

  return (
    <div className="animate-fadeIn has-bottom-nav">
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%)', padding: '28px 16px 56px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <Link to="/my-bookings" style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
            <ArrowLeft size={14} /> Quay lại
          </Link>
          <h1 style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 900, color: 'white', marginBottom: 6, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Star size={24} fill="white" /> Đánh Giá Sân
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
            Chia sẻ trải nghiệm để giúp cộng đồng
          </p>

          {/* Summary chips */}
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 99, padding: '6px 14px', color: 'white', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Award size={14} /> {myReviews.length} đánh giá
            </div>
            {myReviews.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 99, padding: '6px 14px', color: 'white', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Star size={14} fill="white" /> Trung bình {avgRating} ⭐
              </div>
            )}
            {reviewable.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 99, padding: '6px 14px', color: 'white', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <ThumbsUp size={14} /> {reviewable.length} chờ đánh giá
              </div>
            )}
          </div>

          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: 8, marginTop: 20, background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 4 }}>
            {[
              { id: 'write', label: 'Viết đánh giá', icon: <Send size={14} /> },
              { id: 'my',    label: 'Đánh giá của tôi', icon: <Star size={14} /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSubmitted(false); setSelectedBooking(null); }}
                style={{
                  flex: 1, padding: '9px 12px', borderRadius: 9, border: 'none',
                  background: activeTab === tab.id ? 'white' : 'transparent',
                  color: activeTab === tab.id ? '#d97706' : 'rgba(255,255,255,0.9)',
                  fontWeight: 800, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s',
                  fontFamily: 'Nunito, sans-serif', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 6,
                  boxShadow: activeTab === tab.id ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '-24px auto 0', padding: '0 16px 48px' }}>

        {/* =========== TAB: VIẾT ĐÁNH GIÁ =========== */}
        {activeTab === 'write' && (
          <>
            {/* Success state */}
            {submitted && (
              <div style={{ background: 'linear-gradient(135deg, #e8f8ef, #d1fae5)', borderRadius: 16, border: '1.5px solid #6ee7b7', padding: '24px', textAlign: 'center', marginBottom: 16, animation: 'fadeInUp 0.4s ease' }}>
                <CheckCircle size={48} color="#0D9D57" style={{ marginBottom: 12 }} />
                <h3 style={{ fontWeight: 900, fontSize: 18, color: '#0D9D57', marginBottom: 6 }}>Cảm ơn bạn đã đánh giá! 🎉</h3>
                <p style={{ fontSize: 13, color: '#16a34a' }}>Đánh giá của bạn sẽ giúp ích rất nhiều cho cộng đồng.</p>
              </div>
            )}

            {/* Form card */}
            {selectedBooking ? (
              <div style={{ background: 'white', borderRadius: 20, border: '1px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.08)', padding: '24px', animation: 'fadeInUp 0.4s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Star size={18} color="#f59e0b" fill="#f59e0b" /> Đánh giá sân
                  </div>
                  <button onClick={() => setSelectedBooking(null)} style={{ background: 'var(--surface-2)', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'Nunito, sans-serif' }}>
                    ← Đổi sân
                  </button>
                </div>
                <ReviewForm booking={selectedBooking} onSubmitted={handleSubmitted} />
              </div>
            ) : (
              /* Pick a booking */
              <div>
                <div style={{ background: 'white', borderRadius: 16, border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: 12 }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ThumbsUp size={18} color="#d97706" />
                    <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>Chọn buổi chơi để đánh giá</span>
                    {reviewable.length > 0 && (
                      <span style={{ marginLeft: 'auto', background: '#fff7ed', color: '#d97706', borderRadius: 99, padding: '3px 10px', fontSize: 12, fontWeight: 800 }}>
                        {reviewable.length} chờ
                      </span>
                    )}
                  </div>

                  {loading ? (
                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 10 }} />)}
                    </div>
                  ) : reviewable.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                      <ThumbsUp size={48} style={{ color: '#d1d5db', marginBottom: 12 }} />
                      <p style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)', marginBottom: 6 }}>Không có buổi chơi nào chờ đánh giá</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Bạn đã đánh giá tất cả các buổi chơi rồi! 🎉</p>
                    </div>
                  ) : (
                    reviewable.map((b, idx) => (
                      <button
                        key={b._id}
                        onClick={() => setSelectedBooking(b)}
                        style={{
                          width: '100%', padding: '14px 20px', border: 'none',
                          borderBottom: idx < reviewable.length - 1 ? '1px solid var(--border-light)' : 'none',
                          background: 'transparent', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 14,
                          transition: 'background 0.15s', fontFamily: 'Nunito, sans-serif',
                          textAlign: 'left',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fffbeb'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ width: 42, height: 42, borderRadius: 12, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Star size={20} color="#d97706" fill="#d97706" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)', marginBottom: 2 }}>
                            {b.court?.name || 'Sân cầu lông'}
                          </div>
                          <div style={{ display: 'flex', gap: 10 }}>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              <Calendar size={11} />{b.date}
                            </span>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              <Clock size={11} />{b.startTime}–{b.endTime}
                            </span>
                          </div>
                        </div>
                        <ChevronRight size={18} color="#d1d5db" />
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* =========== TAB: ĐÁNH GIÁ CỦA TÔI =========== */}
        {activeTab === 'my' && (
          <>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 16 }} />)}
              </div>
            ) : myReviews.length === 0 ? (
              <div style={{ background: 'white', borderRadius: 20, border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', padding: '56px 20px', textAlign: 'center' }}>
                <Star size={64} style={{ color: '#fbbf24', marginBottom: 16 }} />
                <h3 style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-primary)', marginBottom: 8 }}>Bạn chưa có đánh giá nào</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 280, margin: '0 auto 24px' }}>
                  Hãy đánh giá sau khi chơi xong để chia sẻ trải nghiệm của bạn!
                </p>
                <button
                  onClick={() => setActiveTab('write')}
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: 'white', border: 'none', borderRadius: 999, padding: '12px 28px',
                    fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'Nunito, sans-serif',
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    boxShadow: '0 6px 20px rgba(245,158,11,0.35)',
                  }}
                >
                  <Send size={16} /> Viết đánh giá ngay
                </button>
              </div>
            ) : (
              <>
                {/* Rating overview */}
                <div style={{ background: 'white', borderRadius: 20, border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', padding: '20px', marginBottom: 16, display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Big avg */}
                  <div style={{ textAlign: 'center', minWidth: 80 }}>
                    <div style={{ fontSize: 48, fontWeight: 900, color: '#f59e0b', lineHeight: 1 }}>{avgRating}</div>
                    <div style={{ display: 'flex', gap: 2, justifyContent: 'center', margin: '6px 0' }}>
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={14} fill={s <= Math.round(avgRating) ? '#f59e0b' : 'none'} color={s <= Math.round(avgRating) ? '#f59e0b' : '#d1d5db'} strokeWidth={1.5} />
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{myReviews.length} đánh giá</div>
                  </div>

                  {/* Distribution */}
                  <div style={{ flex: 1, minWidth: 160 }}>
                    {ratingDist.map(({ star, count }) => (
                      <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', width: 12, textAlign: 'right' }}>{star}</span>
                        <Star size={11} fill="#f59e0b" color="#f59e0b" strokeWidth={1.5} />
                        <div style={{ flex: 1, height: 6, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 99,
                            background: 'linear-gradient(90deg, #f59e0b, #d97706)',
                            width: myReviews.length ? `${(count / myReviews.length) * 100}%` : '0%',
                            transition: 'width 0.6s ease',
                          }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', width: 16 }}>{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reviews list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {myReviews.map((r, idx) => (
                    <ReviewCard key={r._id} review={r} idx={idx} />
                  ))}
                </div>
              </>
            )}
          </>
        )}

      </div>
    </div>
  );
}
