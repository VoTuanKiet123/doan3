import { useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Star, X, Send, MessageSquare } from 'lucide-react';

export default function ReviewModal({ booking, onClose, onSuccess }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const courtName = booking?.court?.name || 'Sân cầu lông';

  const handleSubmit = async () => {
    if (!rating) {
      toast.error('Vui lòng chọn số sao đánh giá');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/bookings/${booking._id}/review`, { rating, comment });
      toast.success('Cảm ơn bạn đã đánh giá!');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gửi đánh giá thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  const ratingLabels = ['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Xuất sắc'];
  const activeRating = hoverRating || rating;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(10, 20, 40, 0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 24,
          width: '100%',
          maxWidth: 440,
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
          animation: 'fadeInUp 0.3s ease',
        }}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0D9D57 0%, #1aaf64 100%)',
          padding: '24px 24px 20px',
          position: 'relative',
        }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 16, right: 16,
              background: 'rgba(255,255,255,0.2)', border: 'none',
              borderRadius: '50%', width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'white',
            }}
          >
            <X size={16} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Star size={20} color="white" fill="white" />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 18, color: 'white' }}>Đánh giá sân</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>Chia sẻ trải nghiệm của bạn</div>
            </div>
          </div>
          <div style={{
            marginTop: 12,
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 10, padding: '8px 14px',
            fontSize: 13, color: 'white', fontWeight: 700,
          }}>
            🏸 {courtName} — {booking?.date}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '28px 24px' }}>
          {/* Star Rating */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Bạn đánh giá sân này thế nào?
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: 4, transition: 'transform 0.15s ease',
                    transform: activeRating >= star ? 'scale(1.2)' : 'scale(1)',
                  }}
                >
                  <Star
                    size={36}
                    fill={activeRating >= star ? '#f59e0b' : 'none'}
                    color={activeRating >= star ? '#f59e0b' : '#d1d5db'}
                    strokeWidth={1.5}
                    style={{ transition: 'all 0.15s ease' }}
                  />
                </button>
              ))}
            </div>
            {activeRating > 0 && (
              <div style={{
                fontSize: 14, fontWeight: 800,
                color: activeRating >= 4 ? '#0D9D57' : activeRating >= 3 ? '#d97706' : '#ef4444',
                animation: 'fadeIn 0.2s ease',
              }}>
                {ratingLabels[activeRating]}
              </div>
            )}
          </div>

          {/* Comment */}
          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8,
            }}>
              <MessageSquare size={14} /> Nhận xét của bạn (tuỳ chọn)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Sân sạch sẽ, ánh sáng tốt, nhân viên thân thiện..."
              maxLength={300}
              rows={3}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 12,
                border: '1.5px solid var(--border)',
                fontFamily: 'Nunito, sans-serif',
                fontSize: 13,
                color: 'var(--text-primary)',
                resize: 'none',
                outline: 'none',
                transition: 'border-color 0.2s',
                background: 'var(--surface-2)',
                lineHeight: 1.6,
              }}
              onFocus={(e) => (e.target.style.borderColor = '#0D9D57')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
            <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              {comment.length}/300 ký tự
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1, padding: '12px', borderRadius: 12,
                border: '1.5px solid var(--border)',
                background: 'white', color: 'var(--text-secondary)',
                fontWeight: 800, fontSize: 13, cursor: 'pointer',
                fontFamily: 'Nunito, sans-serif', transition: 'all 0.2s',
              }}
            >
              Huỷ
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !rating}
              style={{
                flex: 2, padding: '12px', borderRadius: 12,
                border: 'none',
                background: rating ? 'linear-gradient(135deg, #0D9D57, #1aaf64)' : '#e5e7eb',
                color: rating ? 'white' : '#9ca3af',
                fontWeight: 800, fontSize: 13, cursor: rating ? 'pointer' : 'not-allowed',
                fontFamily: 'Nunito, sans-serif', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: rating ? '0 4px 12px rgba(13,157,87,0.3)' : 'none',
              }}
            >
              {submitting ? (
                <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                  Đang gửi...
                </span>
              ) : (
                <><Send size={14} /> Gửi đánh giá</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
