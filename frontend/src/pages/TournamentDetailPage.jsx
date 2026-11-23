import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Wallet,
  Users,
  Clock,
  Trophy,
  Medal,
  AlertTriangle,
  Info,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import BracketView from "../components/tournament/BracketView";
import SponsorCard from "../components/tournament/SponsorCard";
import RegProgress from "../components/tournament/RegProgress";
import {
  T_STATUS,
  REG_STATUS,
  PLAY_TYPE,
  RANK_LABEL,
  fmtRange,
  fmtDay,
  fmtDateTime,
  fmtFee,
  unit,
  canRegister,
} from "../utils/tournament";

const ACTIVE = ["pending", "confirmed"];

// ===== Form đăng ký =====
function RegisterForm({ t, user, onDone }) {
  const pair = t.playType === "pair";
  const [f, setF] = useState({
    p1name: user.name || "",
    p1phone: user.phone || "",
    p1year: "",
    teamName: "",
    p2name: "",
    p2phone: "",
    p2year: "",
    note: "",
    agree: false,
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) =>
    setF((p) => ({ ...p, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!f.agree) {
      toast.error("Vui lòng đồng ý với điều lệ giải");
      return;
    }
    setSaving(true);
    try {
      const res = await api.post(`/tournaments/${t._id}/register`, {
        player1: { name: f.p1name, phone: f.p1phone, birthYear: f.p1year || undefined },
        ...(pair && {
          teamName: f.teamName,
          player2: { name: f.p2name, phone: f.p2phone, birthYear: f.p2year || undefined },
        }),
        note: f.note,
      });
      toast.success(res.data.message, { duration: 6000 });
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || "Đăng ký không thành công");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="rsd-form tm-reg-form" onSubmit={submit}>
      <fieldset>
        <legend>{pair ? "Vận động viên 1 (bạn)" : "Vận động viên"}</legend>
        <label>
          <span className="form-label">Họ tên *</span>
          <input className="form-input" required value={f.p1name} onChange={set("p1name")} />
        </label>
        <div className="rsd-grid2">
          <label>
            <span className="form-label">Số điện thoại *</span>
            <input className="form-input" type="tel" required value={f.p1phone} onChange={set("p1phone")} />
          </label>
          <label>
            <span className="form-label">Năm sinh</span>
            <input className="form-input" type="number" min={1930} max={2025} value={f.p1year} onChange={set("p1year")} />
          </label>
        </div>
      </fieldset>

      {pair && (
        <fieldset>
          <legend>Vận động viên 2 (đồng đội)</legend>
          <label>
            <span className="form-label">Họ tên *</span>
            <input className="form-input" required value={f.p2name} onChange={set("p2name")} />
          </label>
          <div className="rsd-grid2">
            <label>
              <span className="form-label">Số điện thoại *</span>
              <input className="form-input" type="tel" required value={f.p2phone} onChange={set("p2phone")} />
            </label>
            <label>
              <span className="form-label">Năm sinh</span>
              <input className="form-input" type="number" min={1930} max={2025} value={f.p2year} onChange={set("p2year")} />
            </label>
          </div>
          <label>
            <span className="form-label">Tên đội (không bắt buộc)</span>
            <input className="form-input" value={f.teamName} onChange={set("teamName")} placeholder="VD: Song Kiếm" />
          </label>
        </fieldset>
      )}

      <label>
        <span className="form-label">Ghi chú cho ban tổ chức</span>
        <input className="form-input" value={f.note} onChange={set("note")} placeholder="Trình độ, khung giờ bận..." />
      </label>

      <label className="rsd-check">
        <input type="checkbox" checked={f.agree} onChange={set("agree")} />
        Tôi đã đọc điều lệ và đồng ý tham gia
      </label>

      <p className="rsd-hint">
        Lệ phí <strong>{fmtFee(t.entryFee)}</strong>
        {t.entryFee > 0 && " — nộp tại quầy hoặc chuyển khoản ghi mã đăng ký. Ban tổ chức xác nhận sau khi nhận lệ phí."}
      </p>

      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? "Đang gửi..." : pair ? "Đăng ký cặp đấu" : "Đăng ký tham gia"}
      </button>
    </form>
  );
}

// ===== Trạng thái đăng ký của tôi =====
function MyRegCard({ reg, onCancel }) {
  const st = REG_STATUS[reg.status];
  return (
    <div className="tm-myreg">
      <div className="rs-card-head">
        <div>
          <p className="rs-muted">Mã đăng ký</p>
          <p className="tm-code">{reg.code}</p>
        </div>
        <span className={`tm-badge ${st.badge}`}>{st.label}</span>
      </div>
      <p className="tm-myreg-name">{reg.displayName}</p>
      <RegProgress reg={reg} />
      {reg.status === "pending" && reg.paymentStatus !== "paid" && (
        <div className="rs-callout rs-callout--ready">
          <Wallet size={18} />
          <p>
            Vui lòng nộp lệ phí <strong>{fmtFee(reg.fee)}</strong> tại quầy hoặc chuyển khoản, ghi nội dung{" "}
            <strong>{reg.code}</strong>.
          </p>
        </div>
      )}
      {reg.status === "pending" && reg.paymentStatus === "paid" && (
        <div className="rs-callout rs-callout--muted">
          <Clock size={18} />
          <p>Đã nhận lệ phí. Ban tổ chức đang kiểm tra thông tin của bạn.</p>
        </div>
      )}
      {reg.status === "rejected" && (
        <div className="rs-callout rs-callout--warn">
          <AlertTriangle size={18} />
          <p>Lý do: {reg.rejectReason}</p>
        </div>
      )}
      <div className="rsd-inline-actions">
        <Link to="/my-tournaments" className="rs-link">
          Xem tất cả đăng ký
        </Link>
        {ACTIVE.includes(reg.status) && onCancel && (
          <button type="button" className="rsd-cancel" onClick={onCancel}>
            Huỷ đăng ký
          </button>
        )}
      </div>
    </div>
  );
}

// ===== Trang =====
export default function TournamentDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [tab, setTab] = useState("info");

  useEffect(() => {
    let alive = true;
    Promise.all([api.get(`/tournaments/${id}`), api.get(`/tournaments/${id}/matches`)])
      .then(([d, m]) => {
        if (!alive) return;
        setData(d.data);
        setMatches(m.data.matches || []);
        setError("");
      })
      .catch((err) => alive && setError(err.response?.data?.message || "Không tải được giải đấu"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id, reloadKey, user]);

  const reload = () => setReloadKey((k) => k + 1);
  const myReg = data?.myRegistration;
  const myIds = useMemo(() => (myReg ? [String(myReg._id)] : []), [myReg]);
  const myMatches = useMemo(
    () =>
      myReg?.status === "confirmed"
        ? matches.filter(
            (m) => !m.isBye && [String(m.entryA?._id), String(m.entryB?._id)].includes(String(myReg._id))
          )
        : [],
    [matches, myReg]
  );

  if (loading) {
    return (
      <div className="rs-page">
        <div className="tm-card tm-card--skeleton" style={{ height: 220 }} />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="rs-page">
        <div className="rs-empty">
          <AlertTriangle size={28} />
          <p>{error || "Không tìm thấy giải đấu"}</p>
          <Link to="/tournaments" className="btn btn-outline">
            Về danh sách giải
          </Link>
        </div>
      </div>
    );
  }

  const t = data.tournament;
  const st = T_STATUS[t.status];
  const hasActiveReg = myReg && ACTIVE.includes(myReg.status);
  const open = canRegister(t);

  const cancelReg = async () => {
    if (!window.confirm(`Huỷ đăng ký ${myReg.code}?`)) return;
    try {
      const res = await api.put(`/tournaments/registrations/${myReg._id}/cancel`);
      toast.success(res.data.message);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || "Không huỷ được");
    }
  };

  const TABS = [
    { key: "info", label: "Giới thiệu" },
    { key: "players", label: "Người tham gia", count: data.participants.length },
    { key: "schedule", label: "Lịch thi đấu", count: matches.filter((m) => !m.isBye).length },
    { key: "results", label: "Kết quả" },
  ];

  return (
    <div className="rs-page tm-page">
      <Link to="/tournaments" className="tm-back">
        <ArrowLeft size={16} /> Tất cả giải đấu
      </Link>

      <header className="tm-hero">
        <div className="tm-card-top">
          <span className={`tm-badge ${st.badge}`}>{st.label}</span>
          <span className="tm-chip">{t.eventType?.name}</span>
          <span className="tm-chip">{PLAY_TYPE[t.playType]}</span>
        </div>
        <h1 className="rs-title">{t.name}</h1>
        <dl className="tm-hero-facts">
          <div>
            <dt>
              <CalendarDays size={15} aria-hidden="true" /> Thời gian
            </dt>
            <dd>{fmtRange(t.startDate, t.endDate)}</dd>
          </div>
          <div>
            <dt>
              <MapPin size={15} aria-hidden="true" /> Địa điểm
            </dt>
            <dd>{t.location}</dd>
          </div>
          <div>
            <dt>
              <Wallet size={15} aria-hidden="true" /> Lệ phí
            </dt>
            <dd>
              {fmtFee(t.entryFee)}
              {t.entryFee > 0 && t.playType === "pair" ? " / cặp" : ""}
            </dd>
          </div>
          <div>
            <dt>
              <Users size={15} aria-hidden="true" /> Số suất
            </dt>
            <dd>
              {t.registeredCount}/{t.maxParticipants} {unit(t.playType)} đã đăng ký
            </dd>
          </div>
          <div>
            <dt>
              <Clock size={15} aria-hidden="true" /> Hạn đăng ký
            </dt>
            <dd>{fmtDay(t.registrationDeadline)}</dd>
          </div>
        </dl>
      </header>

      <div className="rs-layout">
        <main>
          <div className="rs-tabs tm-tabs" role="tablist" aria-label="Nội dung giải">
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
                {x.count !== undefined && <span className="rs-count">{x.count}</span>}
              </button>
            ))}
          </div>

          {tab === "info" && (
            <div className="tm-info">
              {t.description && (
                <section>
                  <h2 className="tm-h2">Giới thiệu</h2>
                  <p className="tm-prose">{t.description}</p>
                </section>
              )}
              {t.prizes && (
                <section>
                  <h2 className="tm-h2">Giải thưởng</h2>
                  <p className="tm-prose">{t.prizes}</p>
                </section>
              )}
              {t.rules && (
                <section>
                  <h2 className="tm-h2">Điều lệ</h2>
                  <p className="tm-prose">{t.rules}</p>
                </section>
              )}
              {t.sponsors?.length > 0 && (
                <section>
                  <h2 className="tm-h2">Nhà tài trợ</h2>
                  <div className="tm-sponsor-grid">
                    {t.sponsors.map((s) => (
                      <SponsorCard key={s._id} s={s} />
                    ))}
                  </div>
                </section>
              )}
              {!t.description && !t.prizes && !t.rules && !t.sponsors?.length && (
                <div className="rs-empty">Ban tổ chức chưa cập nhật thông tin chi tiết.</div>
              )}
            </div>
          )}

          {tab === "players" &&
            (data.participants.length === 0 ? (
              <div className="rs-empty">Chưa có {unit(t.playType)} nào được xác nhận.</div>
            ) : (
              <ol className="tm-players">
                {data.participants.map((p, i) => (
                  <li key={p._id} className={String(p._id) === String(myReg?._id) ? "tm-players-me" : ""}>
                    <span className="tm-players-no">{i + 1}</span>
                    {p.displayName}
                  </li>
                ))}
              </ol>
            ))}

          {tab === "schedule" && (
            <BracketView
              matches={matches}
              highlightIds={myIds}
              emptyText="Lịch thi đấu sẽ được công bố sau khi bốc thăm."
            />
          )}

          {tab === "results" &&
            (t.resultsPublished && t.results?.length ? (
              <ol className="tm-podium">
                {t.results.map((r) => (
                  <li key={`${r.rank}-${r.registration}`} className={`tm-podium-item tm-podium--${r.rank}`}>
                    <span className="tm-podium-icon">
                      {r.rank === 1 ? <Trophy size={22} /> : <Medal size={22} />}
                    </span>
                    <div>
                      <p className="tm-podium-rank">{RANK_LABEL[r.rank] || `Hạng ${r.rank}`}</p>
                      <p className="tm-podium-name">{r.displayName}</p>
                      {r.prize && <p className="rs-muted">{r.prize}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="rs-empty">
                <Info size={24} />
                <p>Kết quả sẽ được công bố khi giải kết thúc.</p>
              </div>
            ))}
        </main>

        <aside className="rs-side">
          <div className="rs-card">
            <h2 className="rs-section-title">Đăng ký thi đấu</h2>
            {!user ? (
              <>
                <p className="rs-muted">Đăng nhập để đăng ký và theo dõi trạng thái.</p>
                <Link
                  to={`/login?redirect=${encodeURIComponent(location.pathname)}`}
                  className="btn btn-primary"
                >
                  Đăng nhập để đăng ký
                </Link>
              </>
            ) : myReg && (hasActiveReg || !open) ? (
              <MyRegCard reg={myReg} onCancel={["open", "closed"].includes(t.status) ? cancelReg : null} />
            ) : user.role !== "user" ? (
              <p className="rs-muted">Tài khoản quản trị / nhân viên không đăng ký thi đấu.</p>
            ) : open ? (
              <>
                {myReg && (
                  <p className="rs-muted">
                    Đăng ký trước ({myReg.code}) {REG_STATUS[myReg.status].label.toLowerCase()}. Bạn có thể đăng ký lại.
                  </p>
                )}
                <RegisterForm t={t} user={user} onDone={reload} />
              </>
            ) : (
              <p className="rs-muted">
                {t.status === "open" && t.registeredCount >= t.maxParticipants
                  ? "Giải đã đủ số lượng đăng ký."
                  : t.status === "open"
                    ? "Đã hết hạn đăng ký."
                    : "Giải không còn nhận đăng ký."}
              </p>
            )}
          </div>

          {myMatches.length > 0 && (
            <div className="rs-card">
              <h2 className="rs-section-title">Trận của bạn</h2>
              {myMatches.map((m) => (
                <p key={m._id} className="tm-mymatch">
                  <strong>{m.roundName}</strong> · {fmtDateTime(m.scheduledAt)}
                  {m.court?.name ? ` · ${m.court.name}` : ""}
                </p>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
