import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  Trophy,
  MapPin,
  Users,
  Clock,
  Search,
  RotateCcw,
} from "lucide-react";
import { STATE_BADGE, fmtDateTime, fmtDate } from "../utils/events";

const STATE_TABS = [
  { key: "all", label: "Tất cả" },
  { key: "open", label: "Đang mở đăng ký" },
  { key: "closed", label: "Hết hạn / Đủ suất" },
  { key: "finished", label: "Đã kết thúc" },
];

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedState, setSelectedState] = useState("all");

  useEffect(() => {
    Promise.all([api.get("/events"), api.get("/event-types")])
      .then(([evRes, tyRes]) => {
        setEvents(evRes.data.events || []);
        setTypes(tyRes.data.types || []);
      })
      .catch(() => toast.error("Không tải được danh sách giải đấu"))
      .finally(() => setLoading(false));
  }, []);

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((ev) => {
      if (selectedType && ev.type?._id !== selectedType) return false;

      if (selectedState === "open" && ev.state !== "open") return false;
      if (
        selectedState === "closed" &&
        ev.state !== "closed_deadline" &&
        ev.state !== "closed_full"
      )
        return false;
      if (selectedState === "finished" && ev.state !== "finished") return false;

      if (q) {
        const haystack = [
          ev.name,
          ev.type?.name,
          ev.court?.name,
          ev.description,
          ...(ev.sponsors || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [events, search, selectedType, selectedState]);

  const hasFilter =
    search.trim() !== "" || selectedType !== "" || selectedState !== "all";

  const resetFilters = () => {
    setSearch("");
    setSelectedType("");
    setSelectedState("all");
  };

  return (
    <div className="min-h-[70vh] bg-[#f8faf8]">
      {/* Banner xanh lá đồng bộ với Sân cầu lông & Lịch của tôi */}
      <div className="bg-gradient-to-r from-[#2d5a3d] to-[#3f7d58] text-white">
        <div className="max-w-5xl mx-auto px-4 py-8 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-white/15 px-3 py-1 rounded-full mb-2">
              <Trophy size={13} /> Hoạt động cộng đồng BadmintonHub
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold">Giải đấu &amp; Sự kiện</h1>
            <p className="text-sm text-white/80 mt-1">
              Khám phá các giải đấu phong trào, giao hữu và đăng ký thi đấu trực tuyến
            </p>
          </div>
          {!loading && (
            <p className="text-sm text-white/90 bg-white/10 px-3 py-1.5 rounded-lg">
              Hiển thị <span className="font-bold">{filteredEvents.length}</span> /{" "}
              {events.length} giải đấu
            </p>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Thanh tìm kiếm & bộ lọc */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6 space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo tên giải, địa điểm sân, nhà tài trợ..."
                className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Tất cả loại sự kiện</option>
              {types.map((ty) => (
                <option key={ty._id} value={ty._id}>
                  {ty.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {STATE_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedState(tab.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    selectedState === tab.key
                      ? "bg-[#2d5a3d] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {hasFilter && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-emerald-700 font-medium"
              >
                <RotateCcw size={13} /> Xóa bộ lọc
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500">Đang tải...</p>
        ) : filteredEvents.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500">
              {hasFilter
                ? "Không tìm thấy giải đấu nào khớp bộ lọc hiện tại."
                : "Chưa có giải đấu nào."}
            </p>
            {hasFilter && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-3 px-4 py-2 rounded-lg bg-[#2d5a3d] hover:bg-[#234730] text-white text-sm font-medium"
              >
                Xem tất cả giải đấu
              </button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-5">
            {filteredEvents.map((ev) => (
              <Link
                key={ev._id}
                to={`/events/${ev._id}`}
                className="flex flex-col h-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md hover:border-emerald-400 transition"
              >
                {ev.posterUrl ? (
                  <div className="h-48 w-full bg-gray-100 overflow-hidden shrink-0">
                    <img
                      src={ev.posterUrl}
                      alt={ev.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-48 w-full bg-gradient-to-br from-emerald-50 via-green-50 to-amber-50 flex flex-col items-center justify-center gap-2 border-b border-gray-100 shrink-0">
                    <Trophy size={40} className="text-emerald-600/40" />
                    <span className="text-xs font-medium text-emerald-800/50">
                      BadmintonHub Tournament
                    </span>
                  </div>
                )}

                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-bold text-gray-900">{ev.name}</h2>
                    <span
                      className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${STATE_BADGE[ev.state]}`}
                    >
                      {ev.stateLabel}
                    </span>
                  </div>
                  {ev.type?.name && (
                    <span className="inline-block w-fit mt-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      {ev.type.name}
                    </span>
                  )}
                  <div className="mt-3 space-y-1.5 text-sm text-gray-600 flex-1">
                    <p>
                      <Clock size={14} className="inline mr-1.5 text-gray-400" />
                      {fmtDateTime(ev.startDate)}
                      {ev.endDate ? ` → ${fmtDate(ev.endDate)}` : ""}
                    </p>
                    <p>
                      <Clock size={14} className="inline mr-1.5 text-gray-400" />
                      Hạn đăng ký: {fmtDateTime(ev.registrationDeadline)}
                    </p>
                    {ev.court?.name && (
                      <p>
                        <MapPin size={14} className="inline mr-1.5 text-gray-400" />
                        {ev.court.name}
                      </p>
                    )}
                    <p>
                      <Users size={14} className="inline mr-1.5 text-gray-400" />
                      {ev.registeredCount}/{ev.maxRegistrations || "∞"} người đã đăng ký
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}