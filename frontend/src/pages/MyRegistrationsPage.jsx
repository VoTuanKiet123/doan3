import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { Trophy, CalendarDays, XCircle, CheckCircle } from "lucide-react";
import { STATE_BADGE, fmtDateTime } from "../utils/events";

export default function MyRegistrationsPage() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    api
      .get("/registrations/mine")
      .then((res) => setItems(res.data.registrations))
      .catch(() => toast.error("Không tải được danh sách đăng ký"))
      .finally();
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Trophy size={24} className="text-amber-500" />
        <h1 className="text-2xl font-bold">Giải đấu của tôi</h1>
      </div>

      {items === null ? (
        <p className="text-gray-500">Đang tải...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">
          Bạn chưa đăng ký giải nào.{" "}
          <Link to="/events" className="text-blue-600">Xem giải đấu →</Link>
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <div key={r._id} className="bg-white rounded-xl border shadow-sm p-4">
              <div className="flex items-start justify-between gap-2">
                <Link to={`/events/${r.event._id}`} className="font-bold hover:text-blue-600">
                  {r.event.name}
                </Link>
                <span className={`shrink-0 text-xs px-2 py-1 rounded-full font-medium ${STATE_BADGE[r.event.state]}`}>
                  {r.event.stateLabel}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                <CalendarDays size={14} className="inline mr-1" />
                {fmtDateTime(r.event.startDate)}
              </p>
              {r.status === "cancelled" ? (
                <p className="mt-2 text-sm text-red-600">
                  <XCircle size={14} className="inline mr-1" />
                  Đăng ký bị hủy{r.cancelNote ? `: ${r.cancelNote}` : ""}
                </p>
              ) : (
                <p className="mt-2 text-sm text-green-600">
                  <CheckCircle size={14} className="inline mr-1" />
                  Đã đăng ký ({fmtDateTime(r.createdAt)})
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
