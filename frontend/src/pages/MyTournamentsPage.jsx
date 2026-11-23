import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { AlertTriangle, Trophy, Wallet, Clock, CalendarDays, RefreshCw, Medal } from "lucide-react";
import api from "../services/api";
import RegProgress from "../components/tournament/RegProgress";
import {
  T_STATUS,
  REG_STATUS,
  RANK_LABEL,
  MATCH_STATUS,
  fmtRange,
  fmtFee,
  fmtDateTime,
} from "../utils/tournament";

const ACTIVE = ["pending", "confirmed"];
const isActive = (r) =>
  ACTIVE.includes(r.status) && !["completed", "cancelled"].includes(r.tournament?.status);

function RegCard({ r, onCancel }) {
  const t = r.tournament || {};
  const st = REG_STATUS[r.status];
  const matches = (r.matches || []).filter((m) => !m.isBye);
  const canCancel = ACTIVE.includes(r.status) && ["open", "closed"].includes(t.status) && matches.length === 0;
  return (
    <article className="rs-card">
      <header className="rs-card-head">
        <div style={{ minWidth: 0 }}>
          <h3 className="rs-card-title">
            <Link to={`/tournaments/${t._id}`} className="tm-title-link">
              {t.name || "Giải đã bị xoá"}
            </Link>
          </h3>
          <p className="rs-card-sub">
            {r.code} · <CalendarDays size={14} aria-hidden="true" /> {fmtRange(t.startDate, t.endDate)}
            {t.status && ` · ${T_STATUS[t.status]?.label}`}
          </p>
        </div>
        <span className={`tm-badge ${st.badge}`}>{st.label}</span>
      </header>

      <p className="tm-myreg-name">{r.displayName}</p>
      <RegProgress reg={r} />

      {r.myRank && (
        <div className="rs-callout rs-callout--ready">
          {r.myRank === 1 ? <Trophy size={18} /> : <Medal size={18} />}
          <p>
            Chúc mừng! Bạn đạt <strong>{RANK_LABEL[r.myRank] || `hạng ${r.myRank}`}</strong>.
          </p>
        </div>
      )}
      {r.status === "pending" && r.paymentStatus !== "paid" && (
        <div className="rs-callout rs-callout--ready">
          <Wallet size={18} />
          <p>
            Chờ nộp lệ phí <strong>{fmtFee(r.fee)}</strong> tại quầy hoặc chuyển khoản ghi <strong>{r.code}</strong>.
          </p>
        </div>
      )}
      {r.status === "pending" && r.paymentStatus === "paid" && (
        <div className="rs-callout rs-callout--muted">
          <Clock size={18} />
          <p>Đã nhận lệ phí, ban tổ chức đang kiểm tra thông tin.</p>
        </div>
      )}
      {r.status === "rejected" && (
        <div className="rs-callout rs-callout--warn">
          <AlertTriangle size={18} />
          <p>Bị từ chối: {r.rejectReason}</p>
        </div>
      )}

      {matches.length > 0 && (
        <div>
          <h4 className="rsd-subhead">Trận đấu của bạn</h4>
          <ul className="tm-mymatches">
            {matches.map((m) => {
              const meA = String(m.entryA?._id) === String(r._id);
              const opp = meA ? m.entryB : m.entryA;
              const won = m.winner && String(m.winner) === String(r._id);
              const lost = m.winner && !won;
              return (
                <li key={m._id}>
                  <div>
                    <strong>{m.roundName}</strong> · gặp {opp?.displayName || "đối thủ chờ xác định"}
                    <p className="rs-muted">
                      {fmtDateTime(m.scheduledAt)}
                      {m.court?.name ? ` · ${m.court.name}` : ""}
                    </p>
                  </div>
                  <span className={won ? "tm-win" : lost ? "tm-lose" : "rs-muted"}>
                    {won ? "Thắng" : lost ? "Thua" : MATCH_STATUS[m.status]}
                    {m.sets?.length > 0 &&
                      ` · ${m.sets.map((s) => (meA ? `${s.a}-${s.b}` : `${s.b}-${s.a}`)).join(", ")}`}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {canCancel && (
        <button type="button" className="rsd-cancel" onClick={() => onCancel(r)}>
          Huỷ đăng ký
        </button>
      )}
    </article>
  );
}

export default function MyTournamentsPage() {
  const [regs, setRegs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [tab, setTab] = useState("active");

  useEffect(() => {
    let alive = true;
    api
      .get("/tournaments/my/registrations")
      .then((res) => {
        if (!alive) return;
        setRegs(res.data.registrations || []);
        setError("");
      })
      .catch((err) => alive && setError(err.response?.data?.message || "Không tải được đăng ký"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const reload = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  const shown = useMemo(() => regs.filter((r) => (tab === "active" ? isActive(r) : !isActive(r))), [regs, tab]);
  const activeCount = regs.filter(isActive).length;

  const cancel = async (r) => {
    if (!window.confirm(`Huỷ đăng ký ${r.code}?`)) return;
    try {
      const res = await api.put(`/tournaments/registrations/${r._id}/cancel`);
      toast.success(res.data.message);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || "Không huỷ được");
    }
  };

  return (
    <div className="rs-page tm-page tm-narrow">
      <header className="rs-header">
        <div>
          <h1 className="rs-title">Đăng ký giải đấu của tôi</h1>
          <p className="rs-subtitle">Theo dõi trạng thái đăng ký, lịch thi đấu và kết quả.</p>
        </div>
        <div className="rsd-head-actions">
          <button type="button" className="btn btn-ghost" onClick={reload} disabled={loading}>
            <RefreshCw size={16} className={loading ? "rs-spin" : ""} /> Làm mới
          </button>
          <Link to="/tournaments" className="btn btn-outline">
            <Trophy size={16} /> Xem giải đấu
          </Link>
        </div>
      </header>

      <div className="rs-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "active"}
          className={`rs-tab ${tab === "active" ? "rs-tab--on" : ""}`}
          onClick={() => setTab("active")}
        >
          Đang tham gia <span className="rs-count">{activeCount}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "past"}
          className={`rs-tab ${tab === "past" ? "rs-tab--on" : ""}`}
          onClick={() => setTab("past")}
        >
          Đã kết thúc / huỷ <span className="rs-count">{regs.length - activeCount}</span>
        </button>
      </div>

      {error ? (
        <div className="rs-empty">
          <AlertTriangle size={28} />
          <p>{error}</p>
          <button type="button" className="btn btn-outline" onClick={reload}>
            Thử lại
          </button>
        </div>
      ) : loading && regs.length === 0 ? (
        <div className="tm-card tm-card--skeleton" style={{ height: 200 }} />
      ) : shown.length === 0 ? (
        <div className="rs-empty">
          <p>
            {tab === "active" ? "Bạn chưa đăng ký giải nào đang diễn ra." : "Chưa có đăng ký nào trong mục này."}
          </p>
          {tab === "active" && (
            <Link to="/tournaments" className="btn btn-primary">
              Tìm giải để đăng ký
            </Link>
          )}
        </div>
      ) : (
        <div className="rs-list">
          {shown.map((r) => (
            <RegCard key={r._id} r={r} onCancel={cancel} />
          ))}
        </div>
      )}
    </div>
  );
}
