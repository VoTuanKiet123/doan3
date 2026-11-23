import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Search,
  RefreshCw,
  Shuffle,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  UserCheck,
  Wallet,
  Trophy,
  Medal,
  AlertTriangle,
  Phone,
  ExternalLink,
} from "lucide-react";
import api from "../../services/api";
import Drawer from "../Drawer";
import BracketView from "./BracketView";
import RegProgress from "./RegProgress";
import {
  T_STATUS,
  REG_STATUS,
  PLAY_TYPE,
  RANK_LABEL,
  fmtRange,
  fmtFee,
  fmtDateTime,
  unit,
  toLocalInput,
} from "../../utils/tournament";

const REG_TABS = [
  { key: "pending", label: "Chờ duyệt" },
  { key: "confirmed", label: "Đã xác nhận" },
  { key: "rejected", label: "Từ chối" },
  { key: "cancelled", label: "Khách huỷ" },
  { key: "all", label: "Tất cả" },
];

const fmtPhone = (p) => String(p || "").replace(/^(\d{4})(\d{3})(\d+)$/, "$1 $2 $3");

// =====================================================================
// Chi tiết một đăng ký: kiểm tra thông tin, lệ phí, duyệt, điểm danh
// =====================================================================
function RegDrawer({ reg, t, onClose, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [method, setMethod] = useState("cash");

  const call = async (path, body, okMsg) => {
    setBusy(true);
    try {
      const res = await api.put(`/tournaments/registrations/${reg._id}/${path}`, body);
      toast.success(okMsg || res.data.message);
      await onChanged();
      if (path === "review") onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Thao tác không thành công");
    } finally {
      setBusy(false);
    }
  };

  const st = REG_STATUS[reg.status];
  const needPay = reg.fee > 0 && reg.paymentStatus !== "paid";
  const players = [reg.player1, reg.player2].filter(Boolean);

  return (
    <Drawer title={`Đăng ký ${reg.code}`} onClose={onClose}>
      <div className="rsd-detail-head">
        <div style={{ minWidth: 0 }}>
          <h3 className="rs-card-title">{reg.displayName}</h3>
          <p className="rs-card-sub">Gửi lúc {fmtDateTime(reg.createdAt)}</p>
        </div>
        <span className={`tm-badge ${st.badge}`}>{st.label}</span>
      </div>

      <RegProgress reg={reg} />

      <section>
        <h4 className="rsd-subhead">Thông tin vận động viên</h4>
        <div className="tm-player-grid">
          {players.map((p, i) => (
            <div key={i} className="tm-player">
              <p className="rs-muted">VĐV {i + 1}</p>
              <p className="tm-player-name">{p.name}</p>
              <a href={`tel:${p.phone}`} className="rs-link">
                <Phone size={13} aria-hidden="true" /> {fmtPhone(p.phone)}
              </a>
              {p.birthYear && <p className="rs-muted">Năm sinh {p.birthYear}</p>}
              {p.email && <p className="rs-muted">{p.email}</p>}
            </div>
          ))}
        </div>
        <p className="rs-note">
          <span>Tài khoản đăng ký:</span> {reg.user?.name} ({reg.user?.email})
        </p>
        {reg.note && (
          <p className="rs-note">
            <span>Ghi chú của khách:</span> {reg.note}
          </p>
        )}
        {reg.rejectReason && (
          <p className="rs-note">
            <span>Lý do từ chối:</span> {reg.rejectReason}
          </p>
        )}
      </section>

      {/* Lệ phí */}
      {reg.status !== "cancelled" && (
        <section className="rsd-panel">
          <h4 className="rsd-subhead" style={{ marginTop: 0 }}>
            <Wallet size={16} aria-hidden="true" /> Lệ phí {fmtFee(reg.fee)}
          </h4>
          {reg.fee === 0 ? (
            <p className="rs-muted">Giải miễn phí.</p>
          ) : reg.paymentStatus === "paid" ? (
            <div className="tm-row-between">
              <span className="rsd-paid">
                Đã thu ({reg.paymentMethod === "transfer" ? "chuyển khoản" : "tiền mặt"}) · {fmtDateTime(reg.paidAt)}
                {reg.paymentConfirmedBy?.name ? ` · ${reg.paymentConfirmedBy.name}` : ""}
              </span>
              {reg.status !== "confirmed" && (
                <button
                  type="button"
                  className="rs-link tm-linkbtn"
                  disabled={busy}
                  onClick={() => call("payment", { paid: false }, "Đã chuyển về chưa thu")}
                >
                  Hoàn tác
                </button>
              )}
            </div>
          ) : (
            <div className="tm-row-between">
              <div className="rsd-seg tm-seg2" role="radiogroup" aria-label="Hình thức thanh toán">
                {[
                  ["cash", "Tiền mặt"],
                  ["transfer", "Chuyển khoản"],
                ].map(([k, l]) => (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={method === k}
                    className={`rsd-seg-btn ${method === k ? "rsd-seg-btn--on" : ""}`}
                    onClick={() => setMethod(k)}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="btn btn-outline"
                disabled={busy}
                onClick={() => call("payment", { paid: true, method })}
              >
                <Wallet size={16} /> Xác nhận đã thu
              </button>
            </div>
          )}
        </section>
      )}

      {/* Duyệt */}
      {["pending", "rejected"].includes(reg.status) && (
        <section className="rsd-panel">
          <h4 className="rsd-subhead" style={{ marginTop: 0 }}>
            Kiểm tra & xác nhận
          </h4>
          {needPay && (
            <div className="rs-callout rs-callout--warn">
              <AlertTriangle size={18} />
              <p>Cần xác nhận đã thu lệ phí trước khi duyệt.</p>
            </div>
          )}
          <div className="rsd-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || needPay}
              onClick={() => call("review", { action: "confirm" })}
            >
              <CheckCircle2 size={16} /> Xác nhận đăng ký
            </button>
          </div>
          {reg.status === "pending" && (
            <>
              <label>
                <span className="form-label">Lý do từ chối (khách xem được)</span>
                <input
                  className="form-input"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="VD: Sai thông tin năm sinh, không đúng nội dung thi đấu..."
                />
              </label>
              <button
                type="button"
                className="rsd-cancel"
                disabled={busy || !reason.trim()}
                onClick={() => call("review", { action: "reject", reason })}
              >
                <XCircle size={14} /> Từ chối đăng ký
              </button>
            </>
          )}
        </section>
      )}

      {/* Điểm danh */}
      {reg.status === "confirmed" && (
        <section className="rsd-panel">
          <h4 className="rsd-subhead" style={{ marginTop: 0 }}>
            <UserCheck size={16} aria-hidden="true" /> Điểm danh
          </h4>
          {reg.checkedIn ? (
            <div className="tm-row-between">
              <span className="rsd-paid">
                Đã có mặt lúc {fmtDateTime(reg.checkedInAt)}
                {reg.checkedInBy?.name ? ` · ${reg.checkedInBy.name}` : ""}
              </span>
              <button
                type="button"
                className="rs-link tm-linkbtn"
                disabled={busy}
                onClick={() => call("checkin", { checkedIn: false })}
              >
                Bỏ điểm danh
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || ["completed", "cancelled"].includes(t.status)}
              onClick={() => call("checkin", { checkedIn: true })}
            >
              <UserCheck size={16} /> Xác nhận có mặt
            </button>
          )}
          {reg.reviewedBy?.name && (
            <p className="rs-muted">Duyệt bởi {reg.reviewedBy.name} · {fmtDateTime(reg.reviewedAt)}</p>
          )}
        </section>
      )}
    </Drawer>
  );
}

// =====================================================================
// Bốc thăm & xếp lịch
// =====================================================================
function GenerateDrawer({ t, courts, confirmed, checkedIn, onClose, onDone }) {
  const d = new Date(t.startDate);
  d.setHours(8, 0, 0, 0);
  const [f, setF] = useState({
    onlyCheckedIn: false,
    startAt: toLocalInput(d),
    matchMinutes: 30,
    courtIds: courts.filter((c) => c.status === "active").slice(0, 2).map((c) => c._id),
  });
  const [busy, setBusy] = useState(false);
  const n = f.onlyCheckedIn ? checkedIn : confirmed;

  const toggleCourt = (id) =>
    setF((p) => ({
      ...p,
      courtIds: p.courtIds.includes(id) ? p.courtIds.filter((x) => x !== id) : [...p.courtIds, id],
    }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.post(`/tournaments/${t._id}/matches/generate`, {
        ...f,
        startAt: f.startAt ? new Date(f.startAt).toISOString() : undefined,
      });
      toast.success(res.data.message, { duration: 5000 });
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || "Không xếp được lịch");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      title="Bốc thăm & xếp lịch"
      onClose={onClose}
      footer={
        <>
          <span className="rsd-total">
            <strong>{n}</strong> {unit(t.playType)} vào sơ đồ
          </span>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Đóng
          </button>
          <button type="submit" form="tm-gen" className="btn btn-primary" disabled={busy || n < 2}>
            <Shuffle size={16} /> {busy ? "Đang bốc thăm..." : "Bốc thăm"}
          </button>
        </>
      }
    >
      <form id="tm-gen" className="rsd-form" onSubmit={submit}>
        <p className="rsd-hint">
          Hệ thống bốc thăm ngẫu nhiên các {unit(t.playType)} đã xác nhận vào sơ đồ loại trực tiếp. Nếu số lượng
          không tròn (4, 8, 16...), một số {unit(t.playType)} được miễn đấu vòng 1. Bốc thăm lại sẽ xoá lịch cũ (chỉ
          khi chưa có trận nào diễn ra).
        </p>
        <label className="rsd-check">
          <input
            type="checkbox"
            checked={f.onlyCheckedIn}
            onChange={(e) => setF((p) => ({ ...p, onlyCheckedIn: e.target.checked }))}
          />
          Chỉ xếp {unit(t.playType)} đã điểm danh có mặt ({checkedIn}/{confirmed})
        </label>
        <fieldset>
          <legend>Xếp giờ & sân</legend>
          <div className="rsd-grid2">
            <label>
              <span className="form-label">Giờ bắt đầu trận đầu</span>
              <input
                className="form-input"
                type="datetime-local"
                value={f.startAt}
                onChange={(e) => setF((p) => ({ ...p, startAt: e.target.value }))}
              />
            </label>
            <label>
              <span className="form-label">Mỗi trận (phút)</span>
              <input
                className="form-input"
                type="number"
                min={10}
                max={180}
                step={5}
                value={f.matchMinutes}
                onChange={(e) => setF((p) => ({ ...p, matchMinutes: e.target.value }))}
              />
            </label>
          </div>
          <span className="form-label">Sân sử dụng (các trận chia đều, chạy song song)</span>
          <div className="tm-court-pick">
            {courts.map((c) => (
              <label key={c._id} className="rsd-check">
                <input type="checkbox" checked={f.courtIds.includes(c._id)} onChange={() => toggleCourt(c._id)} />
                {c.name}
                {c.status !== "active" && (
                  <span className="rs-muted"> ({c.status === "maintenance" ? "đang bảo trì" : "tạm ngưng"})</span>
                )}
              </label>
            ))}
          </div>
          <p className="rsd-hint">Bỏ trống giờ bắt đầu nếu muốn xếp giờ từng trận sau.</p>
        </fieldset>
      </form>
    </Drawer>
  );
}

// =====================================================================
// Thêm trận phụ (tranh hạng 3, giao hữu...)
// =====================================================================
function AddMatchDrawer({ t, courts, regs, onClose, onDone }) {
  const [f, setF] = useState({ entryA: "", entryB: "", roundName: "Tranh hạng ba", court: "", scheduledAt: "" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/tournaments/${t._id}/matches`, {
        ...f,
        scheduledAt: f.scheduledAt ? new Date(f.scheduledAt).toISOString() : undefined,
      });
      toast.success("Đã thêm trận");
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thêm được trận");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Drawer
      title="Thêm trận phụ"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Đóng
          </button>
          <button type="submit" form="tm-add" className="btn btn-primary" disabled={busy}>
            Thêm trận
          </button>
        </>
      }
    >
      <form id="tm-add" className="rsd-form" onSubmit={submit}>
        <label>
          <span className="form-label">Tên trận *</span>
          <input className="form-input" required value={f.roundName} onChange={set("roundName")} />
        </label>
        <div className="rsd-grid2">
          {["entryA", "entryB"].map((k, i) => (
            <label key={k}>
              <span className="form-label">Bên {i === 0 ? "A" : "B"} *</span>
              <select className="form-input" required value={f[k]} onChange={set(k)}>
                <option value="">Chọn...</option>
                {regs.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.displayName}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <div className="rsd-grid2">
          <label>
            <span className="form-label">Sân</span>
            <select className="form-input" value={f.court} onChange={set("court")}>
              <option value="">Chưa xếp sân</option>
              {courts.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="form-label">Giờ thi đấu</span>
            <input className="form-input" type="datetime-local" value={f.scheduledAt} onChange={set("scheduledAt")} />
          </label>
        </div>
      </form>
    </Drawer>
  );
}

// =====================================================================
// Cập nhật một trận: lịch + tỷ số
// =====================================================================
function MatchDrawer({ m, courts, locked, onClose, onDone }) {
  const [sched, setSched] = useState({
    court: m.court?._id || "",
    scheduledAt: toLocalInput(m.scheduledAt),
    note: m.note || "",
  });
  const initSets = m.sets?.length ? m.sets.map((s) => ({ a: String(s.a), b: String(s.b) })) : [];
  while (initSets.length < 3) initSets.push({ a: "", b: "" });
  const [sets, setSets] = useState(initSets);
  const [wo, setWo] = useState("");
  const [busy, setBusy] = useState(false);
  const ready = m.entryA && m.entryB;

  const save = async (body, msg) => {
    setBusy(true);
    try {
      await api.put(`/tournaments/matches/${m._id}`, body);
      toast.success(msg);
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || "Không cập nhật được");
    } finally {
      setBusy(false);
    }
  };

  const filled = sets.filter((s) => s.a !== "" && s.b !== "");
  const wa = filled.filter((s) => Number(s.a) > Number(s.b)).length;
  const wb = filled.filter((s) => Number(s.b) > Number(s.a)).length;

  return (
    <Drawer title={`${m.roundName} · trận ${m.position + 1}`} onClose={onClose}>
      {locked && (
        <div className="rs-callout rs-callout--muted">
          <AlertTriangle size={18} />
          <p>Kết quả giải đã công bố, không thể sửa trận.</p>
        </div>
      )}
      <div className="tm-vs">
        <span className={m.winner && String(m.winner._id) === String(m.entryA?._id) ? "tm-vs-win" : ""}>
          {m.entryA?.displayName || "Chờ xác định"}
        </span>
        <span className="tm-vs-x">vs</span>
        <span className={m.winner && String(m.winner._id) === String(m.entryB?._id) ? "tm-vs-win" : ""}>
          {m.entryB?.displayName || "Chờ xác định"}
        </span>
      </div>

      <section className="rsd-panel">
        <h4 className="rsd-subhead" style={{ marginTop: 0 }}>
          Lịch thi đấu
        </h4>
        <div className="rsd-grid2">
          <label>
            <span className="form-label">Sân</span>
            <select
              className="form-input"
              value={sched.court}
              onChange={(e) => setSched((p) => ({ ...p, court: e.target.value }))}
            >
              <option value="">Chưa xếp sân</option>
              {courts.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="form-label">Giờ thi đấu</span>
            <input
              className="form-input"
              type="datetime-local"
              value={sched.scheduledAt}
              onChange={(e) => setSched((p) => ({ ...p, scheduledAt: e.target.value }))}
            />
          </label>
        </div>
        <label>
          <span className="form-label">Ghi chú (hiển thị công khai)</span>
          <input
            className="form-input"
            value={sched.note}
            onChange={(e) => setSched((p) => ({ ...p, note: e.target.value }))}
          />
        </label>
        <div className="rsd-actions">
          <button
            type="button"
            className="btn btn-outline"
            disabled={busy || locked}
            onClick={() =>
              save(
                {
                  court: sched.court || null,
                  scheduledAt: sched.scheduledAt ? new Date(sched.scheduledAt).toISOString() : null,
                  note: sched.note,
                },
                "Đã lưu lịch trận"
              )
            }
          >
            Lưu lịch
          </button>
        </div>
      </section>

      <section className="rsd-panel">
        <h4 className="rsd-subhead" style={{ marginTop: 0 }}>
          Tỷ số
        </h4>
        {!ready ? (
          <p className="rs-muted">Trận chưa đủ hai đối thủ (chờ kết quả vòng trước).</p>
        ) : (
          <>
            <div className="tm-sets">
              <span />
              <span className="tm-sets-head">A</span>
              <span className="tm-sets-head">B</span>
              {sets.map((s, i) => (
                <div key={i} className="tm-sets-row">
                  <span className="rs-muted">Séc {i + 1}</span>
                  {["a", "b"].map((k) => (
                    <input
                      key={k}
                      className="form-input"
                      type="number"
                      min={0}
                      max={99}
                      inputMode="numeric"
                      aria-label={`Séc ${i + 1} bên ${k.toUpperCase()}`}
                      value={s[k]}
                      onChange={(e) =>
                        setSets((p) => p.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))
                      }
                    />
                  ))}
                </div>
              ))}
            </div>
            <p className="rsd-hint">
              Số séc thắng: A {wa} – {wb} B
              {wa !== wb && filled.length > 0 && (
                <>
                  {" "}
                  → <strong>{wa > wb ? m.entryA.displayName : m.entryB.displayName}</strong> thắng
                </>
              )}
            </p>
            <div className="rsd-actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || locked || !filled.length || wa === wb}
                onClick={() => save({ status: "finished", sets: filled }, "Đã lưu kết quả trận")}
              >
                <CheckCircle2 size={16} /> Kết thúc trận
              </button>
              <button
                type="button"
                className="btn btn-outline"
                disabled={busy || locked || m.status === "playing"}
                onClick={() => save({ status: "playing", sets: filled }, "Trận đang diễn ra")}
              >
                Đang đấu
              </button>
              {m.status !== "scheduled" && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busy || locked}
                  onClick={() => save({ status: "scheduled" }, "Đã đặt lại trận")}
                >
                  Đặt lại
                </button>
              )}
            </div>
            <div className="rsd-other">
              <label htmlFor="tm-wo">Xử thắng (đối thủ vắng mặt / bỏ cuộc)</label>
              <div className="rsd-other-row">
                <select id="tm-wo" className="form-input" value={wo} onChange={(e) => setWo(e.target.value)}>
                  <option value="">Chọn bên được xử thắng...</option>
                  <option value={m.entryA._id}>{m.entryA.displayName}</option>
                  <option value={m.entryB._id}>{m.entryB.displayName}</option>
                </select>
                <button
                  type="button"
                  className="btn btn-outline"
                  disabled={busy || locked || !wo}
                  onClick={() => save({ status: "walkover", winner: wo, note: sched.note || "Đối thủ vắng mặt" }, "Đã xử thắng")}
                >
                  Xử thắng
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </Drawer>
  );
}

// =====================================================================
// Màn hình chính
// =====================================================================
export default function TournamentManage({ id, isAdmin, backTo }) {
  const [t, setT] = useState(null);
  const [regs, setRegs] = useState([]);
  const [matches, setMatches] = useState([]);
  const [courts, setCourts] = useState([]);
  const [suggest, setSuggest] = useState(null);
  const [prizes, setPrizes] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [tab, setTab] = useState("regs");
  const [regTab, setRegTab] = useState("pending");
  const [q, setQ] = useState("");
  const [selReg, setSelReg] = useState(null);
  const [selMatch, setSelMatch] = useState(null);
  const [genOpen, setGenOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([
      api.get(`/tournaments/${id}`),
      api.get(`/tournaments/${id}/registrations`),
      api.get(`/tournaments/${id}/matches`),
      api.get(`/tournaments/${id}/results/suggest`),
      api.get("/courts"),
    ])
      .then(([a, b, c, d, e]) => {
        if (!alive) return;
        setT(a.data.tournament);
        setRegs(b.data.registrations || []);
        setMatches(c.data.matches || []);
        setSuggest(d.data);
        setCourts(e.data.courts || []);
        setError("");
      })
      .catch((err) => alive && setError(err.response?.data?.message || "Không tải được giải đấu"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id, reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);
  // reload và chờ xong (để drawer cập nhật dữ liệu mới)
  const reloadRegs = async () => {
    const res = await api.get(`/tournaments/${id}/registrations`);
    setRegs(res.data.registrations || []);
    setSelReg((cur) => (cur ? res.data.registrations.find((r) => r._id === cur._id) || null : null));
    reload();
  };

  const counts = useMemo(() => {
    const c = { all: regs.length, pending: 0, confirmed: 0, rejected: 0, cancelled: 0, checkedIn: 0, unpaid: 0 };
    for (const r of regs) {
      c[r.status]++;
      if (r.status === "confirmed" && r.checkedIn) c.checkedIn++;
      if (r.status === "pending" && r.fee > 0 && r.paymentStatus !== "paid") c.unpaid++;
    }
    return c;
  }, [regs]);

  const shownRegs = useMemo(() => {
    const text = q.trim().toLowerCase();
    const d = q.replace(/\D/g, "");
    return regs.filter(
      (r) =>
        (regTab === "all" || r.status === regTab) &&
        (!text ||
          r.code.toLowerCase().includes(text) ||
          r.displayName.toLowerCase().includes(text) ||
          (d.length >= 3 && [r.player1?.phone, r.player2?.phone].some((p) => String(p || "").replace(/\D/g, "").includes(d))))
    );
  }, [regs, regTab, q]);

  if (loading && !t) return <div className="tm-card tm-card--skeleton" style={{ height: 240 }} />;
  if (error || !t) {
    return (
      <div className="rs-empty">
        <AlertTriangle size={28} />
        <p>{error || "Không tìm thấy giải đấu"}</p>
        <Link to={backTo} className="btn btn-outline">
          Quay lại
        </Link>
      </div>
    );
  }

  const st = T_STATUS[t.status];
  const realMatches = matches.filter((m) => !m.isBye);
  const done = realMatches.filter((m) => ["finished", "walkover"].includes(m.status)).length;
  const confirmedRegs = regs.filter((r) => r.status === "confirmed");
  const locked = t.resultsPublished;

  const quickCheckIn = async (r) => {
    try {
      const res = await api.put(`/tournaments/registrations/${r._id}/checkin`, { checkedIn: !r.checkedIn });
      toast.success(res.data.message);
      reloadRegs();
    } catch (err) {
      toast.error(err.response?.data?.message || "Không điểm danh được");
    }
  };

  const resetSchedule = async () => {
    if (!window.confirm("Xoá toàn bộ lịch thi đấu và tỷ số đã nhập?")) return;
    try {
      const res = await api.delete(`/tournaments/${t._id}/matches`);
      toast.success(res.data.message);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || "Không xoá được lịch");
    }
  };

  const publish = async () => {
    if (!window.confirm("Công bố kết quả? Giải sẽ chuyển sang 'Đã kết thúc' và khách xem được kết quả.")) return;
    setBusy(true);
    try {
      const res = await api.post(`/tournaments/${t._id}/results/publish`, {
        results: suggest.results.map((r) => ({
          rank: r.rank,
          registration: r.registration,
          prize: prizes[`${r.rank}-${r.registration}`] || "",
        })),
      });
      toast.success(res.data.message);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || "Không công bố được");
    } finally {
      setBusy(false);
    }
  };

  const unpublish = async () => {
    if (!window.confirm("Gỡ công bố kết quả để sửa tỷ số?")) return;
    try {
      const res = await api.put(`/tournaments/${t._id}/results/unpublish`);
      toast.success(res.data.message);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.message || "Không gỡ được");
    }
  };

  const TABS = [
    { key: "regs", label: "Đăng ký", count: counts.pending },
    { key: "schedule", label: "Lịch thi đấu", count: realMatches.length },
    { key: "results", label: "Kết quả" },
  ];

  return (
    <div className="rsd tm-manage">
      <Link to={backTo} className="tm-back">
        <ArrowLeft size={16} /> Danh sách giải
      </Link>
      <div className="rsd-head">
        <div style={{ minWidth: 0 }}>
          <div className="tm-card-top">
            <span className={`tm-badge ${st.badge}`}>{st.label}</span>
            <span className="tm-chip">
              {t.eventType?.name} · {PLAY_TYPE[t.playType]}
            </span>
          </div>
          <h1 className="rsd-title">{t.name}</h1>
          <p className="rsd-subtitle">
            {fmtRange(t.startDate, t.endDate)} · {t.location} · Lệ phí {fmtFee(t.entryFee)}
            {t.staff?.length ? ` · Phụ trách: ${t.staff.map((s) => s.name).join(", ")}` : ""}
          </p>
        </div>
        <div className="rsd-head-actions">
          {t.status !== "draft" && (
            <a href={`/tournaments/${t._id}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
              <ExternalLink size={16} /> Trang khách
            </a>
          )}
          <button type="button" className="btn btn-ghost" onClick={reload} disabled={loading}>
            <RefreshCw size={16} className={loading ? "rs-spin" : ""} /> Làm mới
          </button>
        </div>
      </div>

      <div className="rsd-stats">
        <button type="button" className="rsd-stat rsd-stat--received" onClick={() => { setTab("regs"); setRegTab("pending"); }}>
          <span className="rsd-stat-num">{counts.pending}</span>
          <span className="rsd-stat-label">Chờ duyệt ({counts.unpaid} chưa nộp phí)</span>
        </button>
        <button type="button" className="rsd-stat rsd-stat--completed" onClick={() => { setTab("regs"); setRegTab("confirmed"); }}>
          <span className="rsd-stat-num">
            {counts.confirmed}/{t.maxParticipants}
          </span>
          <span className="rsd-stat-label">Đã xác nhận ({unit(t.playType)})</span>
        </button>
        <button type="button" className="rsd-stat rsd-stat--in_progress" onClick={() => { setTab("regs"); setRegTab("confirmed"); }}>
          <span className="rsd-stat-num">
            {counts.checkedIn}/{counts.confirmed}
          </span>
          <span className="rsd-stat-label">Đã có mặt</span>
        </button>
        <button type="button" className="rsd-stat rsd-stat--done" onClick={() => setTab("schedule")}>
          <span className="rsd-stat-num">
            {done}/{realMatches.length}
          </span>
          <span className="rsd-stat-label">Trận đã xong</span>
        </button>
      </div>

      <div className="rs-tabs tm-tabs" role="tablist" aria-label="Quản lý giải">
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

      {/* ============ ĐĂNG KÝ ============ */}
      {tab === "regs" && (
        <>
          <div className="rsd-toolbar">
            <div className="rs-tabs" role="tablist" aria-label="Lọc đăng ký">
              {REG_TABS.map((x) => (
                <button
                  key={x.key}
                  type="button"
                  role="tab"
                  aria-selected={regTab === x.key}
                  className={`rs-tab ${regTab === x.key ? "rs-tab--on" : ""}`}
                  onClick={() => setRegTab(x.key)}
                >
                  {x.label}
                  <span className="rs-count">{counts[x.key]}</span>
                </button>
              ))}
            </div>
            <label className="rsd-search">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Mã, tên, SĐT..."
                aria-label="Tìm đăng ký"
              />
            </label>
          </div>
          {shownRegs.length === 0 ? (
            <div className="rs-empty">{q ? `Không có đăng ký khớp "${q}".` : "Không có đăng ký trong mục này."}</div>
          ) : (
            <ul className="rsd-list">
              {shownRegs.map((r) => {
                const rs = REG_STATUS[r.status];
                return (
                  <li key={r._id} className="tm-reg-li">
                    <button type="button" className="rsd-row tm-reg-row" onClick={() => setSelReg(r)}>
                      <span className="rsd-cell rsd-cell--code">
                        <strong>{r.code}</strong>
                        <span className={`tm-badge ${rs.badge}`}>{rs.label}</span>
                      </span>
                      <span className="rsd-cell">
                        <span className="rsd-line">{r.displayName}</span>
                        <span className="rsd-line rs-muted">
                          <Phone size={13} aria-hidden="true" /> {fmtPhone(r.player1?.phone)}
                        </span>
                      </span>
                      <span className="rsd-cell">
                        <span className="rsd-cell-label">Lệ phí</span>
                        <span className={r.fee === 0 || r.paymentStatus === "paid" ? "rsd-paid" : "rsd-unpaid"}>
                          {r.fee === 0 ? "Miễn phí" : r.paymentStatus === "paid" ? "Đã thu" : "Chưa thu"}
                        </span>
                      </span>
                      <span className="rsd-cell">
                        <span className="rsd-cell-label">Gửi lúc</span>
                        <span className="rsd-line">{fmtDateTime(r.createdAt)}</span>
                      </span>
                    </button>
                    {r.status === "confirmed" && (
                      <button
                        type="button"
                        className={`tm-checkin ${r.checkedIn ? "tm-checkin--on" : ""}`}
                        onClick={() => quickCheckIn(r)}
                        aria-pressed={!!r.checkedIn}
                        disabled={["completed", "cancelled"].includes(t.status)}
                      >
                        <UserCheck size={16} /> {r.checkedIn ? "Có mặt" : "Điểm danh"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {/* ============ LỊCH THI ĐẤU ============ */}
      {tab === "schedule" && (
        <>
          <div className="rsd-actions tm-schedule-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setGenOpen(true)}
              disabled={locked || ["draft", "completed", "cancelled"].includes(t.status)}
            >
              <Shuffle size={16} /> {matches.length ? "Bốc thăm lại" : "Bốc thăm & xếp lịch"}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setAddOpen(true)}
              disabled={locked || confirmedRegs.length < 2}
            >
              <Plus size={16} /> Thêm trận phụ
            </button>
            {isAdmin && matches.length > 0 && (
              <button type="button" className="btn btn-ghost tm-danger" onClick={resetSchedule} disabled={locked}>
                <Trash2 size={16} /> Xoá lịch
              </button>
            )}
          </div>
          {t.status === "draft" && (
            <div className="rs-callout rs-callout--muted">
              <AlertTriangle size={18} />
              <p>Giải đang ở bản nháp. Mở đăng ký trước khi xếp lịch.</p>
            </div>
          )}
          <p className="rsd-hint">Bấm vào một trận để xếp sân, đổi giờ hoặc nhập tỷ số.</p>
          <BracketView
            matches={matches}
            onSelect={locked ? undefined : setSelMatch}
            emptyText={`Chưa có lịch. Cần ít nhất 2 ${unit(t.playType)} đã xác nhận để bốc thăm.`}
          />
        </>
      )}

      {/* ============ KẾT QUẢ ============ */}
      {tab === "results" && (
        <div className="rs-card tm-results-card">
          {locked ? (
            <>
              <div className="tm-row-between">
                <h2 className="rs-section-title">Kết quả đã công bố</h2>
                {isAdmin && (
                  <button type="button" className="btn btn-ghost" onClick={unpublish}>
                    Gỡ công bố
                  </button>
                )}
              </div>
              <ol className="tm-podium">
                {t.results.map((r) => (
                  <li key={`${r.rank}-${r.registration}`} className={`tm-podium-item tm-podium--${r.rank}`}>
                    <span className="tm-podium-icon">{r.rank === 1 ? <Trophy size={22} /> : <Medal size={22} />}</span>
                    <div>
                      <p className="tm-podium-rank">{RANK_LABEL[r.rank] || `Hạng ${r.rank}`}</p>
                      <p className="tm-podium-name">{r.displayName}</p>
                      {r.prize && <p className="rs-muted">{r.prize}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </>
          ) : !suggest?.ready ? (
            <div className="rs-empty">
              <AlertTriangle size={24} />
              <p>{suggest?.message || "Chưa đủ dữ liệu để xếp hạng"}. Hoàn tất các trận để có kết quả.</p>
            </div>
          ) : (
            <>
              <h2 className="rs-section-title">Kết quả theo sơ đồ thi đấu</h2>
              <p className="rs-muted">
                {isAdmin
                  ? "Kiểm tra thứ hạng, nhập giải thưởng rồi công bố. Khách chỉ thấy kết quả sau khi công bố."
                  : "Admin sẽ kiểm tra và công bố kết quả này."}
              </p>
              <ol className="tm-podium">
                {suggest.results.map((r) => {
                  const k = `${r.rank}-${r.registration}`;
                  return (
                    <li key={k} className={`tm-podium-item tm-podium--${r.rank}`}>
                      <span className="tm-podium-icon">{r.rank === 1 ? <Trophy size={22} /> : <Medal size={22} />}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="tm-podium-rank">{RANK_LABEL[r.rank]}</p>
                        <p className="tm-podium-name">{r.displayName}</p>
                        {isAdmin && (
                          <input
                            className="form-input tm-prize-input"
                            placeholder="Giải thưởng (VD: 2.000.000đ + cúp)"
                            aria-label={`Giải thưởng ${RANK_LABEL[r.rank]}`}
                            value={prizes[k] || ""}
                            onChange={(e) => setPrizes((p) => ({ ...p, [k]: e.target.value }))}
                          />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
              {isAdmin && (
                <div className="rsd-actions">
                  <button type="button" className="btn btn-primary" onClick={publish} disabled={busy}>
                    <Trophy size={16} /> Công bố kết quả
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {selReg && <RegDrawer key={selReg._id} reg={selReg} t={t} onClose={() => setSelReg(null)} onChanged={reloadRegs} />}
      {genOpen && (
        <GenerateDrawer
          t={t}
          courts={courts}
          confirmed={counts.confirmed}
          checkedIn={counts.checkedIn}
          onClose={() => setGenOpen(false)}
          onDone={() => {
            setGenOpen(false);
            setTab("schedule");
            reload();
          }}
        />
      )}
      {addOpen && (
        <AddMatchDrawer
          t={t}
          courts={courts}
          regs={confirmedRegs}
          onClose={() => setAddOpen(false)}
          onDone={() => {
            setAddOpen(false);
            reload();
          }}
        />
      )}
      {selMatch && (
        <MatchDrawer
          key={selMatch._id}
          m={selMatch}
          courts={courts}
          locked={locked}
          onClose={() => setSelMatch(null)}
          onDone={() => {
            setSelMatch(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
