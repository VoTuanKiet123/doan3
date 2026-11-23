import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  MapPin,
  Trophy,
  Users,
} from "lucide-react";
import { STATE_BADGE, fmtDateTime, fmtDate } from "../utils/events";

const MEDALS = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ev, setEv] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);

  const fetchEvent = () =>
    api
      .get(`/events/${id}`)
      .then((res) => setEv(res.data.event))
      .catch(() => setNotFound(true));

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const handleRegister = async () => {
    if (!user) return navigate("/login");
    setBusy(true);
    try {
      await api.post(`/events/${id}/register`);
      toast.success("Đăng ký thành công!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Không đăng ký được");
    } finally {
      setBusy(false);
      fetchEvent(); // đọc lại state thật từ server (kể cả 400 hết hạn/đầy)
    }
  };

  if (notFound)
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-center">
        <p className="text-gray-500 mb-4">Không tìm thấy sự kiện (hoặc chưa mở).</p>
        <Link to="/events" className="text-blue-600">← Về danh sách giải đấu</Link>
      </div>
    );

  if (!ev)
    return <p className="max-w-3xl mx-auto px-4 py-10 text-gray-500">Đang tải...</p>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to="/events" className="inline-flex items-center gap-1 text-sm text-gray-500 mb-4">
        <ArrowLeft size={14} /> Danh sách giải đấu
      </Link>

      <div className="bg-white rounded-xl border shadow-sm p-5">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold">{ev.name}</h1>
          <span className={`shrink-0 text-xs px-2 py-1 rounded-full font-medium ${STATE_BADGE[ev.state]}`}>
            {ev.stateLabel}
          </span>
        </div>
        {ev.type?.name && <p className="text-sm text-gray-500 mt-1">{ev.type.name}</p>}
        {ev.description && <p className="mt-3 text-gray-700 whitespace-pre-line">{ev.description}</p>}

        <div className="mt-4 grid sm:grid-cols-2 gap-2 text-sm text-gray-600">
          <p><CalendarDays size={14} className="inline mr-1" />{fmtDateTime(ev.startDate)}{ev.endDate ? ` → ${fmtDate(ev.endDate)}` : ""}</p>
          <p><Clock size={14} className="inline mr-1" />Hạn đăng ký: {fmtDateTime(ev.registrationDeadline)}</p>
          {ev.court?.name && <p><MapPin size={14} className="inline mr-1" />{ev.court.name}</p>}
          <p><Users size={14} className="inline mr-1" />{ev.registeredCount}/{ev.maxRegistrations || "∞"} suất</p>
        </div>

        {!!ev.sponsors?.length && (
          <div className="mt-4">
            <p className="text-xs text-gray-500 mb-1">Nhà tài trợ</p>
            <div className="flex flex-wrap gap-2">
              {ev.sponsors.map((s) => (
                <span key={s} className="text-xs bg-gray-100 rounded-full px-2 py-1">{s}</span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5">
          {ev.state === "open" ? (
            <button
              onClick={handleRegister}
              disabled={busy}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-lg transition disabled:opacity-60"
            >
              {!user ? "Đăng nhập để đăng ký" : busy ? "Đang gửi..." : "Đăng ký tham gia"}
            </button>
          ) : (
            <p className="text-center text-sm text-gray-500 py-2">{ev.stateLabel}</p>
          )}
        </div>
      </div>

      {!!ev.results?.length && (
        <div className="bg-white rounded-xl border shadow-sm p-5 mt-4">
          <h2 className="font-bold flex items-center gap-2 mb-3">
            <Trophy size={18} className="text-amber-500" /> Kết quả chung cuộc
          </h2>
          {ev.results.map((r) => (
            <div key={r.rank} className="flex items-center gap-3 py-1.5 border-b last:border-0">
              <span className="w-8 text-lg">{MEDALS[r.rank] || r.rank}</span>
              <span className="font-medium">{r.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
