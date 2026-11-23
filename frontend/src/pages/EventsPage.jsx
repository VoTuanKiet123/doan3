import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { Trophy, MapPin, Users, Clock } from "lucide-react";
import { STATE_BADGE, fmtDateTime, fmtDate } from "../utils/events";

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/events")
      .then((res) => setEvents(res.data.events))
      .catch(() => toast.error("Không tải được danh sách giải đấu"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Trophy size={28} className="text-amber-500" />
        <h1 className="text-2xl font-bold">Giải đấu & Sự kiện</h1>
      </div>

      {loading ? (
        <p className="text-gray-500">Đang tải...</p>
      ) : events.length === 0 ? (
        <p className="text-gray-500">Chưa có giải đấu nào.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {events.map((ev) => (
            <Link
              key={ev._id}
              to={`/events/${ev._id}`}
              className="block bg-white rounded-xl border shadow-sm p-4 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-bold">{ev.name}</h2>
                <span
                  className={`shrink-0 text-xs px-2 py-1 rounded-full font-medium ${STATE_BADGE[ev.state]}`}
                >
                  {ev.stateLabel}
                </span>
              </div>
              {ev.type?.name && (
                <p className="text-xs text-gray-500 mt-1">{ev.type.name}</p>
              )}
              <div className="mt-3 space-y-1 text-sm text-gray-600">
                <p>
                  <Clock size={14} className="inline mr-1" />
                  {fmtDateTime(ev.startDate)}
                  {ev.endDate ? ` → ${fmtDate(ev.endDate)}` : ""}
                </p>
                <p>
                  <Clock size={14} className="inline mr-1" />
                  Hạn đăng ký: {fmtDateTime(ev.registrationDeadline)}
                </p>
                {ev.court?.name && (
                  <p>
                    <MapPin size={14} className="inline mr-1" />
                    {ev.court.name}
                  </p>
                )}
                <p>
                  <Users size={14} className="inline mr-1" />
                  {ev.registeredCount}/{ev.maxRegistrations || "∞"} người đã đăng
                  ký
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
