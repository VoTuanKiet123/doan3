import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, Trophy, CalendarDays, Users, UserCheck, Swords } from "lucide-react";
import api from "../../services/api";
import TournamentManage from "../../components/tournament/TournamentManage";
import { T_STATUS, PLAY_SHORT, fmtRange, unit } from "../../utils/tournament";

// Danh sách giải nhân viên được phân công phụ trách
export function POSTournamentList() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    api
      .get("/tournaments/manage/list")
      .then((res) => alive && setList(res.data.tournaments || []))
      .catch((err) => alive && setError(err.response?.data?.message || "Không tải được danh sách giải"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const active = list.filter((t) => !["completed", "cancelled"].includes(t.status));
  const past = list.filter((t) => ["completed", "cancelled"].includes(t.status));

  const Card = ({ t }) => (
    <Link to={`/pos/tournaments/${t._id}`} className="tm-card tm-card--link">
      <div className="tm-card-top">
        <span className={`tm-badge ${T_STATUS[t.status].badge}`}>{T_STATUS[t.status].label}</span>
        <span className="tm-chip">
          {t.eventType?.name} · {PLAY_SHORT[t.playType]}
        </span>
      </div>
      <h3 className="tm-card-title">{t.name}</h3>
      <ul className="tm-card-facts">
        <li>
          <CalendarDays size={15} aria-hidden="true" /> {fmtRange(t.startDate, t.endDate)}
        </li>
        <li>
          <Users size={15} aria-hidden="true" /> {t.counts.confirmed}/{t.maxParticipants} {unit(t.playType)} đã xác nhận
        </li>
        <li>
          <UserCheck size={15} aria-hidden="true" /> {t.counts.checkedIn} có mặt
        </li>
        <li>
          <Swords size={15} aria-hidden="true" /> {t.matchDone}/{t.matchCount} trận xong
        </li>
      </ul>
      {t.counts.pending > 0 && <p className="tm-pending">{t.counts.pending} đăng ký chờ duyệt</p>}
    </Link>
  );

  return (
    <div className="rsd">
      <div className="rsd-head">
        <div>
          <h1 className="rsd-title">Giải đấu phụ trách</h1>
          <p className="rsd-subtitle">
            Kiểm tra đăng ký, xác nhận lệ phí, điểm danh, xếp lịch và cập nhật tỷ số cho các giải admin phân công.
          </p>
        </div>
      </div>
      {error ? (
        <div className="rs-empty">
          <AlertTriangle size={28} />
          <p>{error}</p>
        </div>
      ) : loading ? (
        <div className="tm-grid">
          {[0, 1].map((i) => (
            <div key={i} className="tm-card tm-card--skeleton" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="rs-empty">
          <Trophy size={28} />
          <p>Bạn chưa được phân công giải nào. Liên hệ admin để được phân công.</p>
        </div>
      ) : (
        <>
          <div className="tm-grid">
            {active.map((t) => (
              <Card key={t._id} t={t} />
            ))}
          </div>
          {past.length > 0 && (
            <>
              <h2 className="rs-section-title tm-past-title">Đã kết thúc</h2>
              <div className="tm-grid">
                {past.map((t) => (
                  <Card key={t._id} t={t} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export function POSTournamentManage() {
  const { id } = useParams();
  return <TournamentManage id={id} isAdmin={false} backTo="/pos/tournaments" />;
}
