import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Trophy,
  CalendarDays,
  MapPin,
  Users,
  Wallet,
  AlertTriangle,
  ClipboardList,
  Handshake,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import SponsorCard from "../components/tournament/SponsorCard";
import {
  T_STATUS,
  PLAY_SHORT,
  fmtRange,
  fmtDay,
  fmtFee,
  unit,
  canRegister,
} from "../utils/tournament";

const TABS = [
  { key: "upcoming", label: "Sắp diễn ra", match: (t) => ["open", "closed", "ongoing"].includes(t.status) },
  { key: "completed", label: "Đã kết thúc", match: (t) => t.status === "completed" },
  { key: "all", label: "Tất cả", match: () => true },
];

function TournamentCard({ t }) {
  const st = T_STATUS[t.status];
  const pct = Math.min(100, Math.round(((t.registeredCount || 0) / t.maxParticipants) * 100));
  const open = canRegister(t);
  return (
    <article className="tm-card">
      <div className="tm-card-top">
        <span className={`tm-badge ${st.badge}`}>{st.label}</span>
        <span className="tm-chip">
          {t.eventType?.name} · {PLAY_SHORT[t.playType]}
        </span>
      </div>
      <h3 className="tm-card-title">
        <Link to={`/tournaments/${t._id}`}>{t.name}</Link>
      </h3>
      <ul className="tm-card-facts">
        <li>
          <CalendarDays size={15} aria-hidden="true" /> {fmtRange(t.startDate, t.endDate)}
        </li>
        <li>
          <MapPin size={15} aria-hidden="true" /> {t.location}
        </li>
        <li>
          <Wallet size={15} aria-hidden="true" /> Lệ phí {fmtFee(t.entryFee)}
          {t.entryFee > 0 && t.playType === "pair" ? " / cặp" : ""}
        </li>
      </ul>

      <div className="tm-slots">
        <div className="tm-slots-text">
          <span>
            <Users size={14} aria-hidden="true" /> {t.registeredCount}/{t.maxParticipants} {unit(t.playType)}
          </span>
          {t.status === "open" && <span className="rs-muted">Hạn đăng ký {fmtDay(t.registrationDeadline)}</span>}
        </div>
        <div className="tm-bar" aria-hidden="true">
          <span style={{ width: `${pct}%` }} />
        </div>
      </div>

      {t.sponsors?.length > 0 && (
        <p className="tm-card-sponsors">
          Tài trợ: {t.sponsors.map((s) => s.name).join(", ")}
        </p>
      )}

      <Link to={`/tournaments/${t._id}`} className={`btn ${open ? "btn-primary" : "btn-outline"} tm-card-cta`}>
        {open ? "Xem & đăng ký" : t.status === "completed" ? "Xem kết quả" : "Xem chi tiết"}
      </Link>
    </article>
  );
}

export default function TournamentsPage() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [tab, setTab] = useState("upcoming");
  const [type, setType] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.all([
      api.get("/tournaments"),
      api.get("/tournaments/sponsors"),
      api.get("/tournaments/event-types"),
    ])
      .then(([t, s, e]) => {
        if (!alive) return;
        setTournaments(t.data.tournaments || []);
        setSponsors(s.data.sponsors || []);
        setTypes(e.data.eventTypes || []);
        setError("");
      })
      .catch((err) => alive && setError(err.response?.data?.message || "Không tải được danh sách giải đấu"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const shown = useMemo(() => {
    const m = TABS.find((x) => x.key === tab).match;
    return tournaments.filter((t) => m(t) && (!type || t.eventType?._id === type));
  }, [tournaments, tab, type]);

  const counts = useMemo(
    () => Object.fromEntries(TABS.map((x) => [x.key, tournaments.filter(x.match).length])),
    [tournaments]
  );

  return (
    <div className="rs-page tm-page">
      <header className="rs-header">
        <div>
          <h1 className="rs-title">Giải đấu</h1>
          <p className="rs-subtitle">
            Đăng ký thi đấu cá nhân hoặc theo cặp, theo dõi lịch và kết quả ngay tại đây.
          </p>
        </div>
        {user && (
          <Link to="/my-tournaments" className="btn btn-outline">
            <ClipboardList size={16} /> Đăng ký của tôi
          </Link>
        )}
      </header>

      <div className="tm-toolbar">
        <div className="rs-tabs" role="tablist" aria-label="Lọc giải đấu">
          {TABS.map((x) => (
            <button
              key={x.key}
              type="button"
              role="tab"
              aria-selected={tab === x.key}
              className={`rs-tab ${tab === x.key ? "rs-tab--on" : ""}`}
              onClick={() => setTab(x.key)}
            >
              {x.label}
              <span className="rs-count">{counts[x.key] ?? 0}</span>
            </button>
          ))}
        </div>
        <select
          className="form-input tm-select"
          value={type}
          onChange={(e) => setType(e.target.value)}
          aria-label="Lọc theo nội dung"
        >
          <option value="">Mọi nội dung</option>
          {types.map((e) => (
            <option key={e._id} value={e._id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <div className="rs-empty">
          <AlertTriangle size={28} />
          <p>{error}</p>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              setLoading(true);
              setReloadKey((k) => k + 1);
            }}
          >
            Thử lại
          </button>
        </div>
      ) : loading ? (
        <div className="tm-grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="tm-card tm-card--skeleton" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div className="rs-empty">
          <Trophy size={28} />
          <p>
            {tab === "upcoming"
              ? "Hiện chưa có giải nào sắp diễn ra. Hãy quay lại sau nhé."
              : "Không có giải nào trong mục này."}
          </p>
        </div>
      ) : (
        <div className="tm-grid">
          {shown.map((t) => (
            <TournamentCard key={t._id} t={t} />
          ))}
        </div>
      )}

      {sponsors.length > 0 && (
        <section className="tm-sponsors" aria-labelledby="tm-sponsors-title">
          <h2 id="tm-sponsors-title" className="rs-section-title">
            <Handshake size={20} aria-hidden="true" /> Nhà tài trợ
          </h2>
          <div className="tm-sponsor-grid">
            {sponsors.map((s) => (
              <SponsorCard key={s._id} s={s} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
