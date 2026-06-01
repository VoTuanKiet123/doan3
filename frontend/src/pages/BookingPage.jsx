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
  const [bookedSlots, setBookedSlots] = useState([]); // List of {start, end} for selected date
  const [totalPrice, setTotalPrice] = useState(0);

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

  // Calculate dynamic price
  useEffect(() => {
    if (startTime && endTime && court) {
      const duration = getDuration();
      setTotalPrice(duration > 0 ? duration * court.pricePerHour : 0);
    } else {
      setTotalPrice(0);
    }
  }, [startTime, endTime, court]);

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
            
            <h3 className="font-bold mb-4 text-base text-emerald-300">Hóa Đơn Tạm Tính</h3>

            {totalPrice > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-between text-sm text-emerald-100">
                  <span>Ngày chọn:</span>
                  <span className="font-bold text-white">{date}</span>
                </div>
                <div className="flex justify-between text-sm text-emerald-100">
                  <span>Khung giờ:</span>
                  <span className="font-bold text-white">
                    {startTime} - {endTime} ({getDuration()} giờ)
                  </span>
                </div>
                <div className="flex justify-between text-sm text-emerald-100">
                  <span>Đơn giá:</span>
                  <span className="font-bold text-white">{court.pricePerHour?.toLocaleString('vi-VN')}đ / giờ</span>
                </div>
                
                <div className="border-t border-emerald-800/60 pt-4 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-emerald-300">TỔNG CỘNG</span>
                    <span className="text-2xl font-extrabold text-green-300">
                      {totalPrice.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-emerald-200/60 text-sm">
                💡 Vui lòng chọn ngày và giờ để hiển thị hóa đơn tạm tính.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
