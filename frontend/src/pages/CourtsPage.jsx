import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function CourtsPage() {
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'maintenance'
  const { user } = useAuth();

  useEffect(() => {
    api.get('/courts')
      .then(res => {
        setCourts(res.data.courts);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = courts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || 
                          (c.description && c.description.toLowerCase().includes(search.toLowerCase()));
    
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 animate-fadeIn">
      {/* Page Header */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-3xl md:text-5xl font-extrabold text-slate-800 tracking-tight mb-3">
          Danh Sách Sân Cầu Lông
        </h1>
        <p className="text-slate-500 text-base">
          Tìm kiếm và chọn sân phù hợp với lịch tập của bạn. Sân thi đấu tiêu chuẩn 100%.
        </p>
      </div>

      {/* Control Panel (Search & Filter Tags) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 text-lg">
            🔍
          </span>
          <input
            type="text"
            placeholder="Tìm tên sân hoặc loại sân..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-sm transition"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-2">Trạng thái:</span>
          {[
            { id: 'all', label: 'Tất cả sân' },
            { id: 'active', label: 'Sân trống' },
            { id: 'maintenance', label: 'Đang bảo trì' }
          ].map(tag => (
            <button
              key={tag.id}
              onClick={() => setFilterStatus(tag.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide border transition cursor-pointer ${
                filterStatus === tag.id
                  ? 'bg-green-600 text-white border-green-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="card overflow-hidden h-[400px] skeleton"></div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <div className="text-6xl mb-4 animate-bounce">🏸</div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Không tìm thấy sân phù hợp</h3>
          <p className="text-slate-400 text-sm max-w-xs mx-auto">
            Vui lòng thử tìm kiếm với từ khóa khác hoặc chuyển bộ lọc trạng thái.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((court) => {
            const isAvailable = court.status === 'active';
            return (
              <div key={court._id} className="card overflow-hidden flex flex-col group">
                {/* Visual Header */}
                <div className="court-image-area bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center text-7xl relative">
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition duration-300"></div>
                  <span className="group-hover:scale-110 transition duration-500">🏸</span>
                  
                  {/* Status Overlay */}
                  {!isAvailable && (
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center">
                      <span className="px-4 py-2 rounded-xl bg-amber-500 text-white font-bold text-xs tracking-wider uppercase shadow-md">
                        🛠️ Đang bảo trì
                      </span>
                    </div>
                  )}
                </div>

                {/* Body Content */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-lg font-bold text-slate-800 group-hover:text-green-600 transition">
                        {court.name}
                      </h2>
                      <span className={`badge ${isAvailable ? 'badge-active' : 'badge-maintenance'}`}>
                        {isAvailable ? '● Hoạt động' : '🛠️ Bảo trì'}
                      </span>
                    </div>
                    
                    <p className="text-slate-500 text-sm leading-relaxed mb-6 line-clamp-3">
                      {court.description || 'Sân cầu lông tiêu chuẩn quốc tế, trang bị ánh sáng và sàn chống chấn thương khớp.'}
                    </p>
                  </div>

                  {/* Actions & Pricing */}
                  <div className="flex items-center justify-between pt-5 border-t border-slate-100">
                    <div>
                      <span className="price-display">
                        {court.pricePerHour?.toLocaleString('vi-VN')}đ
                      </span>
                      <span className="text-slate-400 text-xs font-semibold"> / giờ</span>
                    </div>

                    {isAvailable ? (
                      user ? (
                        <Link to={`/book/${court._id}`} className="btn btn-primary px-5 py-2.5 text-xs font-bold">
                          Đặt Sân Ngay
                        </Link>
                      ) : (
                        <Link to="/login" className="btn btn-outline border-green-600 text-green-700 hover:bg-green-50 px-4 py-2.5 text-xs font-semibold">
                          Đăng Nhập Đặt
                        </Link>
                      )
                    ) : (
                      <span className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-400 text-xs font-bold cursor-not-allowed">
                        Tạm Đóng Cửa
                      </span>
                    )}
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
