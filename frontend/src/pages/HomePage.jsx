import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../services/api';

export default function HomePage() {
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/courts')
      .then(res => {
        setCourts(res.data.courts.slice(0, 3));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="animate-fadeIn">
      {/* Hero Section */}
      <section className="hero-gradient text-white py-24 md:py-32 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-green-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float"></div>
        <div className="absolute -bottom-10 left-10 w-80 h-80 bg-emerald-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-float" style={{ animationDelay: '1.5s' }}></div>
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-white/20 mb-6 animate-fadeInUp">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse-ring"></span>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Hệ Thống Đặt Sân Tự Động</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 animate-fadeInUp leading-tight">
            Nơi Khởi Nguồn Đam Mê <br/>
            <span className="bg-gradient-to-r from-emerald-400 to-green-300 bg-clip-text text-transparent">Cầu Lông Đích Thực</span>
          </h1>
          <p className="text-base md:text-lg text-emerald-100/90 max-w-2xl mx-auto mb-10 leading-relaxed">
            Hệ thống quản lý và đặt sân trực tuyến chuyên nghiệp. Trải nghiệm không gian thi đấu đẳng cấp với hệ thống đèn LED và thảm sàn tiêu chuẩn BWF.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/courts" className="btn btn-primary px-8 py-3.5 text-base w-full sm:w-auto">
              Đặt sân ngay
            </Link>
            <Link to="/register" className="btn btn-outline border-white text-white hover:bg-white/10 px-8 py-3.5 text-base w-full sm:w-auto">
              Tạo tài khoản miễn phí
            </Link>
          </div>
        </div>
      </section>

      {/* Modern Statistics / Features */}
      <section className="py-20 px-4 bg-white relative -mt-8 rounded-t-[32px] z-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-4">Trải Nghiệm Khác Biệt</h2>
            <p className="text-slate-500">Chúng tôi cam kết cung cấp chất lượng sân tập và thi đấu tốt nhất cho mọi lông thủ</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: '⚡', title: 'Đặt Sân Siêu Tốc', desc: 'Chỉ 3 bước thao tác trên màn hình điện thoại hoặc máy tính để hoàn tất lịch đặt.' },
              { icon: '📅', title: 'Quản Lý Lịch Linh Hoạt', desc: 'Dễ dàng theo dõi lịch sử đặt sân, thay đổi hoặc hủy lịch cực kì thuận tiện.' },
              { icon: '💎', title: 'Tiêu Chuẩn BWF Quốc Tế', desc: 'Hệ thống thảm PVC chuyên dụng 5 lớp êm ái cùng dàn đèn LED chống lóa bảo vệ mắt.' },
            ].map((f, i) => (
              <div key={f.title} className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-green-200 transition duration-300 hover:shadow-lg group">
                <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition duration-300">
                  {f.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Courts */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-800">Sân Đang Khả Dụng</h2>
              <p className="text-slate-500 mt-2">Danh sách các sân đang được mở đăng ký trong ngày hôm nay</p>
            </div>
            <Link to="/courts" className="mt-4 sm:mt-0 text-green-600 hover:text-green-700 font-semibold inline-flex items-center gap-1 group">
              Xem tất cả sân <span className="group-hover:translate-x-1 transition">→</span>
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="card overflow-hidden h-[380px] skeleton"></div>
              ))}
            </div>
          ) : courts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-100">
              <div className="text-5xl mb-4">🏸</div>
              <p className="text-slate-500">Chưa có sân nào được tạo. Vui lòng đăng nhập Admin để thêm sân.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {courts.map((court) => (
                <div key={court._id} className="card overflow-hidden flex flex-col group">
                  <div className="court-image-area bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center text-7xl relative">
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition duration-300"></div>
                    <span className="group-hover:scale-110 transition duration-500">🏸</span>
                    {court.status !== 'active' && (
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center">
                        <span className="px-4 py-2 rounded-lg bg-red-500/90 text-white font-bold text-sm tracking-wide">ĐANG BẢO TRÌ</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-lg text-slate-800 group-hover:text-green-600 transition">{court.name}</h3>
                        <span className={`badge ${court.status === 'active' ? 'badge-active' : 'badge-maintenance'}`}>
                          {court.status === 'active' ? '● Sẵn sàng' : '🛠️ Bảo trì'}
                        </span>
                      </div>
                      <p className="text-slate-500 text-sm line-clamp-2 leading-relaxed mb-6">
                        {court.description || 'Sân cầu lông chất lượng cao, chống trơn trượt hiệu quả.'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <div>
                        <span className="price-display">
                          {court.pricePerHour?.toLocaleString('vi-VN')}đ
                        </span>
                        <span className="text-slate-400 text-xs font-medium"> / giờ</span>
                      </div>
                      
                      {court.status === 'active' ? (
                        <Link to={`/book/${court._id}`} className="btn btn-primary px-5 py-2.5 text-sm">
                          Đặt lịch
                        </Link>
                      ) : (
                        <span className="px-4 py-2 rounded-lg bg-slate-100 text-slate-400 text-xs font-semibold cursor-not-allowed">
                          Tạm đóng
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
