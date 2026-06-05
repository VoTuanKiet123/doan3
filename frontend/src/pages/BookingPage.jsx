import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const TIME_SLOTS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
  '21:00', '21:30', '22:00'
];

export default function BookingPage() {
  const { courtId } = useParams();
  const navigate = useNavigate();
  const [court, setCourt] = useState(null);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [bookedSlots, setBookedSlots] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [priceBreakdown, setPriceBreakdown] = useState([]);
  const [hasSpecialPrice, setHasSpecialPrice] = useState(false);
  const [pricingLoading, setPricingLoading] = useState(false);

  // Load court details
  useEffect(() => {
    api.get(`/courts/${courtId}`)
      .then(res => setCourt(res.data.court))
      .catch(() => {
        toast.error('Không tìm thấy sân');
        navigate('/courts');
      });
  }, [courtId]);

  // Load booked slots when date changes
  useEffect(() => {
    if (!date) return;
    api.get('/bookings')
      .then(res => {
        // Filter bookings for this court, this date, and not cancelled
        const dayBookings = res.data.bookings.filter(b => 
          (b.court?._id === courtId || b.court === courtId) && 
          b.date === date && 
          b.status !== 'cancelled'
        );
        setBookedSlots(dayBookings.map(b => ({ start: b.startTime, end: b.endTime })));
      })
      .catch(() => {});
  }, [date, courtId]);

  // Helper tính thời lượng đặt sân chính xác theo số phút (hỗ trợ giờ lẻ như 1.5, 2.5 giờ)
  const getDuration = () => {
    if (!startTime || !endTime) return 0;
    const startParts = startTime.split(':');
    const endParts = endTime.split(':');
    const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
    const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
    return (endMinutes - startMinutes) / 60;
  };

  // Calculate dynamic price via API preview
  useEffect(() => {
    if (startTime && endTime && court && date) {
      const startParts = startTime.split(':');
      const endParts = endTime.split(':');
      const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
      const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
      if (endMinutes <= startMinutes) {
        setTotalPrice(0); setPriceBreakdown([]); setHasSpecialPrice(false);
        return;
      }
      setPricingLoading(true);
      api.post('/pricing/preview', { courtId, date, startTime, endTime })
        .then(res => {
          if (res.data.success) {
            setTotalPrice(res.data.totalPrice);
            setPriceBreakdown(res.data.breakdown || []);
            setHasSpecialPrice(res.data.hasSpecialPrice || false);
          }
        })
        .catch(() => {
          // Fallback: tính đơn giản nếu API lỗi
          const duration = getDuration();
          setTotalPrice(duration > 0 ? duration * court.pricePerHour : 0);
          setPriceBreakdown([]);
        })
        .finally(() => setPricingLoading(false));
    } else {
      setTotalPrice(0);
      setPriceBreakdown([]);
      setHasSpecialPrice(false);
    }
  }, [startTime, endTime, court, date]);

  // Helper to check if a specific hour slot (e.g. 08:00 - 09:00) is already booked
  const isHourBooked = (startHourStr, endHourStr) => {
    if (!startHourStr || !endHourStr) return false;
    
    const startParts = startHourStr.split(':');
    const endParts = endHourStr.split(':');
    const sVal = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
    const eVal = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
    
    return bookedSlots.some(booked => {
      const bStartParts = booked.start.split(':');
      const bEndParts = booked.end.split(':');
      const bStart = parseInt(bStartParts[0]) * 60 + parseInt(bStartParts[1]);
      const bEnd = parseInt(bEndParts[0]) * 60 + parseInt(bEndParts[1]);
      // Overlap logic: start < booked.end AND end > booked.start
      return sVal < bEnd && eVal > bStart;
    });
  };

  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!date || !startTime || !endTime) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }
    const startParts = startTime.split(':');
    const endParts = endTime.split(':');
    const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
    const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
    if (endMinutes <= startMinutes) {
      toast.error('Giờ kết thúc phải sau giờ bắt đầu');
      return;
    }

    // Check overlap one last time on client side
    if (isHourBooked(startTime, endTime)) {
      toast.error('Khung giờ này đã được đặt trước. Vui lòng chọn khung giờ khác.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/bookings', {
        courtId,
        date,
        startTime,
        endTime,
        note
      });
      toast.success('Đặt sân thành công!');
      navigate('/my-bookings');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Đặt sân thất bại');
    } finally {
      setLoading(false);
    }
  };

  if (!court) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 mt-4 text-sm font-medium">Đang tải thông tin sân...</p>
      </div>
    );
  }

  // Filter end slots based on start slot selected
  const availableEndSlots = TIME_SLOTS.filter(t => {
    if (!startTime) return false;
    const startParts = startTime.split(':');
    const endParts = t.split(':');
    const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
    const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
    return endMinutes > startMinutes;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-fadeIn">
      {/* Booking card layout split in 2 columns on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* Left Column: Form & interactive grids */}
        <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-4xl">🏸</span>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Đặt lịch: {court.name}</h1>
              <p className="text-slate-400 text-xs mt-0.5">Tiêu chuẩn: {court.pricePerHour?.toLocaleString('vi-VN')}đ / giờ</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date input */}
            <div>
              <label className="form-label flex items-center gap-1.5">
                📅 Ngày đặt sân
              </label>
              <input
                type="date"
                required
                min={today}
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setStartTime('');
                  setEndTime('');
                }}
                className="form-input text-slate-700 font-medium"
              />
            </div>

            {date && (
              <div className="space-y-6 animate-fadeIn">
                {/* Visual grid for Start Time */}
                <div>
                  <label className="form-label flex items-center gap-1.5">
                    ⏰ Chọn giờ bắt đầu
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 mt-2">
                    {TIME_SLOTS.slice(0, -1).map(slot => {
                      // Try to see if this individual hour slot is booked
                      const nextHour = TIME_SLOTS[TIME_SLOTS.indexOf(slot) + 1];
                      const isBooked = isHourBooked(slot, nextHour);
                      const isSelected = startTime === slot;

                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={isBooked}
                          onClick={() => {
                            setStartTime(slot);
                            setEndTime('');
                          }}
                          className={`time-slot cursor-pointer ${
                            isBooked ? 'time-slot-booked' : isSelected ? 'time-slot-selected' : ''
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Visual grid for End Time */}
                {startTime && (
                  <div className="animate-fadeIn">
                    <label className="form-label flex items-center gap-1.5">
                      ⏰ Chọn giờ kết thúc
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 mt-2">
                      {availableEndSlots.map(slot => {
                        // Check if booking from startTime to this slot overlaps any already booked interval
                        const isBooked = isHourBooked(startTime, slot);
                        const isSelected = endTime === slot;

                        return (
                          <button
                            key={slot}
                            type="button"
                            disabled={isBooked}
                            onClick={() => setEndTime(slot)}
                            className={`time-slot cursor-pointer ${
                              isBooked ? 'time-slot-booked' : isSelected ? 'time-slot-selected' : ''
                            }`}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Note */}
            <div>
              <label className="form-label flex items-center gap-1.5">
                📝 Ghi chú (tùy chọn)
              </label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="form-input resize-none"
                placeholder="Ví dụ: Cần mượn thêm vợt, mua nước lọc..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4 border-t border-slate-50">
              <button
                type="button"
                onClick={() => navigate('/courts')}
                className="btn btn-ghost border border-slate-200 hover:border-slate-300 flex-1 py-3 text-sm rounded-xl font-bold cursor-pointer"
              >
                Quay lại
              </button>
              <button
                type="submit"
                disabled={loading || !date || !startTime || !endTime}
                className="btn btn-primary flex-1 py-3 text-sm rounded-xl font-extrabold cursor-pointer"
              >
                {loading ? 'Đang tạo lịch...' : 'Xác nhận đặt'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Dynamic Price Summary Sticky Box */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sân details brief */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-3 text-base">Thông tin sân đấu</h3>
            <p className="text-slate-500 text-sm leading-relaxed mb-4">
              {court.description || 'Sân cầu lông tiêu chuẩn quốc tế, trang bị thảm PVC êm ái chống sốc.'}
            </p>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-500">
                <span>Hệ thống sàn</span>
                <span className="text-green-700">PVC Thảm 5.0mm</span>
              </div>
              <div className="flex justify-between text-xs font-semibold text-slate-500">
                <span>Hệ thống đèn</span>
                <span className="text-green-700">LED Chống lóa BWF</span>
              </div>
              <div className="flex justify-between text-xs font-semibold text-slate-500">
                <span>Dịch vụ kèm</span>
                <span className="text-green-700">Nước uống & Cho thuê vợt</span>
              </div>
            </div>
          </div>

          {/* Pricing detail card */}
          <div className="bg-gradient-to-br from-green-900 to-emerald-950 text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full filter blur-xl"></div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 className="font-bold text-base text-emerald-300">Hóa Đơn Tạm Tính</h3>
              {hasSpecialPrice && (
                <span style={{
                  background: 'rgba(245,158,11,0.25)', color: '#fcd34d',
                  fontSize: '10px', fontWeight: 800, padding: '3px 8px',
                  borderRadius: '8px', border: '1px solid rgba(245,158,11,0.4)',
                  letterSpacing: '0.3px',
                }}>
                  ⚡ GIỜ CAO ĐIỂM
                </span>
              )}
            </div>

            {pricingLoading ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'rgba(167,243,208,0.6)', fontSize: '13px' }}>
                <div style={{ width: '24px', height: '24px', border: '2px solid rgba(167,243,208,0.3)', borderTopColor: '#6ee7b7', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 8px' }} />
                Đang tính giá...
              </div>
            ) : totalPrice > 0 ? (
              <div>
                {/* Thông tin chung */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'rgba(167,243,208,0.8)' }}>
                    <span>Ngày:</span>
                    <span style={{ fontWeight: 700, color: '#fff' }}>{date}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'rgba(167,243,208,0.8)' }}>
                    <span>Khung giờ:</span>
                    <span style={{ fontWeight: 700, color: '#fff' }}>{startTime} – {endTime} ({getDuration()} giờ)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'rgba(167,243,208,0.8)' }}>
                    <span>Giá gốc/giờ:</span>
                    <span style={{ fontWeight: 600, color: '#a7f3d0' }}>{court.pricePerHour?.toLocaleString('vi-VN')}đ</span>
                  </div>
                </div>

                {/* Chi tiết từng segment */}
                {priceBreakdown.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(167,243,208,0.5)', letterSpacing: '0.8px', marginBottom: '6px', textTransform: 'uppercase' }}>
                      Chi tiết từng khung giờ
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '180px', overflowY: 'auto' }}>
                      {priceBreakdown.map((seg, idx) => {
                        const isNormal = seg.ruleType === 'normal';
                        const isPeak = seg.ruleType === 'peak';
                        const isWeekend = seg.ruleType === 'weekend';
                        const isHoliday = seg.ruleType === 'holiday';
                        const dotColor = isNormal ? '#6ee7b7' : isPeak ? '#fbbf24' : isWeekend ? '#f87171' : '#c084fc';
                        const tagBg = isNormal ? 'rgba(110,231,183,0.1)' : isPeak ? 'rgba(251,191,36,0.15)' : isWeekend ? 'rgba(248,113,113,0.15)' : 'rgba(192,132,252,0.15)';
                        return (
                          <div key={idx} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '5px 8px', borderRadius: '8px',
                            background: tagBg, border: `1px solid ${dotColor}20`,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: dotColor, display: 'inline-block', flexShrink: 0 }} />
                              <span style={{ fontSize: '12px', color: '#d1fae5', fontWeight: 600 }}>{seg.timeSlot}</span>
                              {seg.ruleName && (
                                <span style={{ fontSize: '10px', color: dotColor, fontWeight: 700, opacity: 0.85 }}>
                                  ×{seg.multiplier}
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 800, color: isNormal ? '#6ee7b7' : dotColor }}>
                              {seg.price.toLocaleString('vi-VN')}đ
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tổng */}
                <div style={{ borderTop: '1px solid rgba(16,185,129,0.3)', paddingTop: '12px' }}>
                  {/* Legend màu sắc */}
                  {priceBreakdown.some(s => s.ruleType !== 'normal') && (
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      {priceBreakdown.some(s => s.ruleType === 'normal') && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6ee7b7', display: 'inline-block' }} />
                          <span style={{ fontSize: '10px', color: 'rgba(167,243,208,0.6)' }}>Giá thường</span>
                        </div>
                      )}
                      {priceBreakdown.some(s => s.ruleType === 'peak') && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fbbf24', display: 'inline-block' }} />
                          <span style={{ fontSize: '10px', color: 'rgba(167,243,208,0.6)' }}>Giờ vàng</span>
                        </div>
                      )}
                      {priceBreakdown.some(s => s.ruleType === 'weekend') && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f87171', display: 'inline-block' }} />
                          <span style={{ fontSize: '10px', color: 'rgba(167,243,208,0.6)' }}>Cuối tuần</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#a7f3d0' }}>TỔNG CỘNG</span>
                    <span style={{ fontSize: '24px', fontWeight: 900, color: '#86efac' }}>
                      {totalPrice.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(167,243,208,0.4)', fontSize: '13px' }}>
                💡 Vui lòng chọn ngày và giờ để hiển thị hóa đơn tạm tính.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
