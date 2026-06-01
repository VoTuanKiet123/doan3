import { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const STATUS_MAP = {
  pending: { text: 'Chờ Xác Nhận', cls: 'badge-pending' },
  confirmed: { text: 'Đã Xác Nhận', cls: 'badge-confirmed' },
  cancelled: { text: 'Đã Hủy Lịch', cls: 'badge-cancelled' },
};

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = () => {
    api.get('/bookings')
      .then(res => {
        setBookings(res.data.bookings);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchBookings(); }, []);

  const handleCancel = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy lịch đặt sân này? Lịch sẽ chuyển sang trạng thái đã hủy.')) return;
    try {
      await api.delete(`/bookings/${id}`);
      toast.success('Hủy lịch thành công');
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Hủy thất bại');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-fadeIn">
      {/* Header */}
      <div className="mb-10 text-center md:text-left">
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-2">Lịch Đặt Của Tôi</h1>
        <p className="text-slate-500">Quản lý và xem lịch sử đặt sân đấu của bạn.</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 rounded-3xl skeleton"></div>
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <div className="text-6xl mb-4 animate-float">📅</div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Bạn chưa đặt lịch nào</h3>
          <p className="text-slate-400 text-sm max-w-xs mx-auto mb-8">
            Hãy bắt đầu trải nghiệm thi đấu cầu lông đỉnh cao ngay hôm nay bằng cách đăng ký một sân đấu trống!
          </p>
          <Link to="/courts" className="btn btn-primary px-6 py-3 cursor-pointer">
            Đặt sân ngay
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const s = STATUS_MAP[b.status] || STATUS_MAP.pending;
            const startParts = b.startTime.split(':');
            const endParts = b.endTime.split(':');
            const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
            const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
            const duration = (endMinutes - startMinutes) / 60;

            return (
              <div key={b._id} className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 shadow-sm hover:shadow-md transition duration-300">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  
                  {/* Left part: Sân, Ngày, Giờ, Note */}
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-3xl shrink-0 border border-green-100">
                      🏸
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg group-hover:text-green-600 transition">
                        {b.court?.name || 'Sân cầu lông'}
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-sm text-slate-500 font-medium">
                        <span className="flex items-center gap-1">
                          📅 {b.date}
                        </span>
                        <span className="hidden md:inline text-slate-300">|</span>
                        <span className="flex items-center gap-1 text-slate-700">
                          ⏰ {b.startTime} - {b.endTime} ({duration} giờ)
                        </span>
                      </div>
                      
                      {b.note && (
                        <p className="text-slate-400 text-xs mt-3 flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 inline-block">
                          📝 <span className="font-semibold text-slate-500">Ghi chú:</span> {b.note}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right part: Price, Status, Cancel button */}
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 pt-4 md:pt-0 border-t border-slate-100 md:border-t-0">
                    <div className="text-left md:text-right">
                      <span className="text-xs font-semibold text-slate-400 block">Tổng tiền</span>
                      <span className="text-xl font-extrabold text-green-700">
                        {b.totalPrice?.toLocaleString('vi-VN')}đ
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`badge ${s.cls}`}>
                        {s.text}
                      </span>
                      
                      {b.status !== 'cancelled' && (
                        <button
                          onClick={() => handleCancel(b._id)}
                          className="btn btn-ghost border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 px-3 py-1.5 text-xs font-bold rounded-xl cursor-pointer"
                        >
                          Hủy lịch
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
