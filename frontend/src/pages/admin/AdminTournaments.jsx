import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Settings2,
  AlertTriangle,
  RefreshCw,
  Trophy,
  Users,
  Wallet,
  Swords,
  UserCheck,
} from "lucide-react";
import api from "../../services/api";
import Drawer from "../../components/Drawer";
import TournamentManage from "../../components/tournament/TournamentManage";
import {
  T_STATUS,
  PLAY_SHORT,
  PLAY_TYPE,
  TIER,
  fmtRange,
  fmtDay,
  unit,
  toLocalInput,
  toDateInput,
} from "../../utils/tournament";

const money = (n) => `${(n || 0).toLocaleString("vi-VN")}đ`;
const errMsg = (err, fb) => err.response?.data?.message || fb;

// =====================================================================
// Form giải đấu (tạo / sửa + phân công + nhà tài trợ)
// =====================================================================
function TournamentForm({ initial, eventTypes, sponsors, staffOptions, onClose, onSaved }) {
  const editing = !!initial?._id;
  const day = 86400e3;
  const [f, setF] = useState(() => ({
    name: initial?.name || "",
    eventType: initial?.eventType?._id || initial?.eventType || eventTypes.find((e) => e.isActive)?._id || "",
    status: initial?.status || "draft",
    startDate: toDateInput(initial?.startDate || new Date(Date.now() + 14 * day)),
    endDate: toDateInput(initial?.endDate || new Date(Date.now() + 15 * day)),
    registrationDeadline: toLocalInput(
      initial?.registrationDeadline || new Date(new Date(Date.now() + 12 * day).setHours(22, 0, 0, 0))
    ),
    entryFee: initial?.entryFee ?? 100000,
    maxParticipants: initial?.maxParticipants ?? 16,
    location: initial?.location || "BadmintonHub",
    description: initial?.description || "",
    prizes: initial?.prizes || "",
    rules: initial?.rules || "",
    sponsors: (initial?.sponsors || []).map((s) => s._id || s),
    staff: (initial?.staff || []).map((s) => s._id || s),
  }));
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const toggle = (k, id) =>
    setF((p) => ({ ...p, [k]: p[k].includes(id) ? p[k].filter((x) => x !== id) : [...p[k], id] }));
  const et = eventTypes.find((e) => e._id === f.eventType);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        ...f,
        startDate: new Date(`${f.startDate}T07:00`).toISOString(),
        endDate: new Date(`${f.endDate}T21:00`).toISOString(),
        registrationDeadline: new Date(f.registrationDeadline).toISOString(),
        entryFee: Number(f.entryFee) || 0,
        maxParticipants: Number(f.maxParticipants),
      };
      if (editing) {
        await api.put(`/tournaments/${initial._id}`, body);
        await api.put(`/tournaments/${initial._id}/staff`, { staff: f.staff });
      } else {
        await api.post("/tournaments", body);
      }
      toast.success(editing ? "Đã cập nhật giải đấu" : "Đã tạo giải đấu");
      onSaved();
    } catch (err) {
      toast.error(errMsg(err, "Không lưu được giải đấu"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      wide
      title={editing ? "Sửa giải đấu" : "Tạo giải đấu"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Đóng
          </button>
          <button type="submit" form="tm-tform" className="btn btn-primary" disabled={saving}>
            {saving ? "Đang lưu..." : editing ? "Lưu thay đổi" : "Tạo giải"}
          </button>
        </>
      }
    >
      <form id="tm-tform" className="rsd-form" onSubmit={submit}>
        <fieldset>
          <legend>Thông tin chung</legend>
          <label>
            <span className="form-label">Tên giải *</span>
            <input className="form-input" required value={f.name} onChange={set("name")} placeholder="Giải Đơn Nam Mở Rộng" />
          </label>
          <div className="rsd-grid2">
            <label>
              <span className="form-label">Loại giải *</span>
              <select className="form-input" required value={f.eventType} onChange={set("eventType")}>
                <option value="">Chọn loại...</option>
                {eventTypes
                  .filter((e) => e.isActive || e._id === f.eventType)
                  .map((e) => (
                    <option key={e._id} value={e._id}>
                      {e.name} ({PLAY_SHORT[e.playType]})
                    </option>
                  ))}
              </select>
            </label>
            <label>
              <span className="form-label">Trạng thái</span>
              <select className="form-input" value={f.status} onChange={set("status")}>
                {Object.entries(T_STATUS)
                  .filter(([k]) => k !== "completed" || f.status === "completed")
                  .map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          {et && <p className="rsd-hint">Hình thức đăng ký: {PLAY_TYPE[et.playType]}.</p>}
          <label>
            <span className="form-label">Địa điểm</span>
            <input className="form-input" value={f.location} onChange={set("location")} />
          </label>
        </fieldset>

        <fieldset>
          <legend>Thời gian, lệ phí, số lượng</legend>
          <div className="rsd-grid2">
            <label>
              <span className="form-label">Ngày bắt đầu *</span>
              <input className="form-input" type="date" required value={f.startDate} onChange={set("startDate")} />
            </label>
            <label>
              <span className="form-label">Ngày kết thúc *</span>
              <input className="form-input" type="date" required value={f.endDate} onChange={set("endDate")} />
            </label>
          </div>
          <label>
            <span className="form-label">Hạn đăng ký *</span>
            <input
              className="form-input"
              type="datetime-local"
              required
              value={f.registrationDeadline}
              onChange={set("registrationDeadline")}
            />
          </label>
          <div className="rsd-grid2">
            <label>
              <span className="form-label">Lệ phí (đ / {et?.playType === "pair" ? "cặp" : "người"})</span>
              <input className="form-input" type="number" min={0} step={10000} value={f.entryFee} onChange={set("entryFee")} />
            </label>
            <label>
              <span className="form-label">Số suất tối đa ({unit(et?.playType)}) *</span>
              <input
                className="form-input"
                type="number"
                min={2}
                max={256}
                required
                value={f.maxParticipants}
                onChange={set("maxParticipants")}
              />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Nội dung hiển thị cho khách</legend>
          <label>
            <span className="form-label">Giới thiệu</span>
            <textarea className="form-input" rows={3} value={f.description} onChange={set("description")} />
          </label>
          <label>
            <span className="form-label">Giải thưởng</span>
            <textarea
              className="form-input"
              rows={2}
              value={f.prizes}
              onChange={set("prizes")}
              placeholder="Vô địch: 2.000.000đ + cúp; Á quân: 1.000.000đ..."
            />
          </label>
          <label>
            <span className="form-label">Điều lệ</span>
            <textarea className="form-input" rows={3} value={f.rules} onChange={set("rules")} placeholder="Thi đấu 3 séc 21 điểm..." />
          </label>
        </fieldset>

        <fieldset>
          <legend>Nhà tài trợ</legend>
          {sponsors.length === 0 ? (
            <p className="rsd-hint">Chưa có nhà tài trợ. Thêm ở tab "Nhà tài trợ".</p>
          ) : (
            <div className="tm-court-pick">
              {sponsors.map((s) => (
                <label key={s._id} className="rsd-check">
                  <input type="checkbox" checked={f.sponsors.includes(s._id)} onChange={() => toggle("sponsors", s._id)} />
                  {s.name} <span className="rs-muted">({TIER[s.tier]})</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend>Nhân viên phụ trách</legend>
          {staffOptions.length === 0 ? (
            <p className="rsd-hint">Chưa có tài khoản nhân viên.</p>
          ) : (
            <div className="tm-court-pick">
              {staffOptions.map((s) => (
                <label key={s._id} className="rsd-check">
                  <input type="checkbox" checked={f.staff.includes(s._id)} onChange={() => toggle("staff", s._id)} />
                  {s.name} <span className="rs-muted">({s.email})</span>
                </label>
              ))}
            </div>
          )}
          <p className="rsd-hint">Nhân viên chỉ thấy và xử lý các giải được phân công.</p>
        </fieldset>
      </form>
    </Drawer>
  );
}

// =====================================================================
// Form loại sự kiện
// =====================================================================
function EventTypeForm({ initial, onClose, onSaved }) {
  const [f, setF] = useState({
    name: initial?.name || "",
    playType: initial?.playType || "single",
    description: initial?.description || "",
    isActive: initial?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (initial?._id) await api.put(`/tournaments/event-types/${initial._id}`, f);
      else await api.post("/tournaments/event-types", f);
      toast.success("Đã lưu loại sự kiện");
      onSaved();
    } catch (err) {
      toast.error(errMsg(err, "Không lưu được"));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Drawer
      title={initial?._id ? "Sửa loại sự kiện" : "Thêm loại sự kiện"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Đóng
          </button>
          <button type="submit" form="tm-etform" className="btn btn-primary" disabled={saving}>
            Lưu
          </button>
        </>
      }
    >
      <form id="tm-etform" className="rsd-form" onSubmit={submit}>
        <label>
          <span className="form-label">Tên loại *</span>
          <input
            className="form-input"
            required
            value={f.name}
            onChange={(e) => setF((p) => ({ ...p, name: e.target.value }))}
            placeholder="VD: Đôi nam trung niên"
          />
        </label>
        <div>
          <span className="form-label">Hình thức đăng ký</span>
          <div className="rsd-seg tm-seg2" role="radiogroup" aria-label="Hình thức">
            {Object.entries(PLAY_TYPE).map(([k, l]) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={f.playType === k}
                className={`rsd-seg-btn ${f.playType === k ? "rsd-seg-btn--on" : ""}`}
                onClick={() => setF((p) => ({ ...p, playType: k }))}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <label>
          <span className="form-label">Mô tả</span>
          <textarea
            className="form-input"
            rows={2}
            value={f.description}
            onChange={(e) => setF((p) => ({ ...p, description: e.target.value }))}
          />
        </label>
        <label className="rsd-check">
          <input type="checkbox" checked={f.isActive} onChange={(e) => setF((p) => ({ ...p, isActive: e.target.checked }))} />
          Đang sử dụng (hiện khi tạo giải và cho khách lọc)
        </label>
      </form>
    </Drawer>
  );
}

// =====================================================================
// Form nhà tài trợ
// =====================================================================
function SponsorForm({ initial, onClose, onSaved }) {
  const [f, setF] = useState({
    name: initial?.name || "",
    tier: initial?.tier || "partner",
    logoUrl: initial?.logoUrl || "",
    website: initial?.website || "",
    description: initial?.description || "",
    contactName: initial?.contactName || "",
    contactPhone: initial?.contactPhone || "",
    isActive: initial?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (initial?._id) await api.put(`/tournaments/sponsors/${initial._id}`, f);
      else await api.post("/tournaments/sponsors", f);
      toast.success("Đã lưu nhà tài trợ");
      onSaved();
    } catch (err) {
      toast.error(errMsg(err, "Không lưu được"));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Drawer
      title={initial?._id ? "Sửa nhà tài trợ" : "Thêm nhà tài trợ"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Đóng
          </button>
          <button type="submit" form="tm-spform" className="btn btn-primary" disabled={saving}>
            Lưu
          </button>
        </>
      }
    >
      <form id="tm-spform" className="rsd-form" onSubmit={submit}>
        <div className="rsd-grid2">
          <label>
            <span className="form-label">Tên nhà tài trợ *</span>
            <input className="form-input" required value={f.name} onChange={set("name")} />
          </label>
          <label>
            <span className="form-label">Hạng tài trợ</span>
            <select className="form-input" value={f.tier} onChange={set("tier")}>
              {Object.entries(TIER).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          <span className="form-label">Đường dẫn logo (URL ảnh)</span>
          <input className="form-input" type="url" value={f.logoUrl} onChange={set("logoUrl")} placeholder="https://..." />
        </label>
        <label>
          <span className="form-label">Website</span>
          <input className="form-input" type="url" value={f.website} onChange={set("website")} placeholder="https://..." />
        </label>
        <label>
          <span className="form-label">Giới thiệu (khách xem được)</span>
          <textarea className="form-input" rows={2} value={f.description} onChange={set("description")} />
        </label>
        <div className="rsd-grid2">
          <label>
            <span className="form-label">Người liên hệ (nội bộ)</span>
            <input className="form-input" value={f.contactName} onChange={set("contactName")} />
          </label>
          <label>
            <span className="form-label">SĐT liên hệ (nội bộ)</span>
            <input className="form-input" type="tel" value={f.contactPhone} onChange={set("contactPhone")} />
          </label>
        </div>
        <label className="rsd-check">
          <input type="checkbox" checked={f.isActive} onChange={(e) => setF((p) => ({ ...p, isActive: e.target.checked }))} />
          Hiển thị cho khách
        </label>
      </form>
    </Drawer>
  );
}

// =====================================================================
// Thống kê
// =====================================================================
function StatsTab() {
  const [s, setS] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    api
      .get("/tournaments/manage/stats")
      .then((res) => alive && setS(res.data))
      .catch((err) => alive && setError(errMsg(err, "Không tải được thống kê")));
    return () => {
      alive = false;
    };
  }, []);
  if (error) return <div className="rs-empty">{error}</div>;
  if (!s) return <div className="tm-card tm-card--skeleton" style={{ height: 200 }} />;
  const tiles = [
    { icon: Trophy, label: "Giải đã tổ chức", value: s.totals.tournaments, sub: `${s.totals.completed} đã kết thúc` },
    { icon: Users, label: "VĐV tham gia", value: s.totals.players, sub: `${s.totals.registrations} lượt đăng ký` },
    { icon: UserCheck, label: "Lượt có mặt", value: s.totals.checkedIn, sub: `/${s.totals.confirmed} suất xác nhận` },
    { icon: Swords, label: "Trận đã đấu", value: s.totals.matchesDone, sub: `/${s.totals.matches} trận` },
    { icon: Wallet, label: "Lệ phí đã thu", value: money(s.totals.revenue), sub: "không tính đơn huỷ / từ chối" },
  ];
  const maxPlayers = Math.max(1, ...s.byEventType.map((b) => b.players));
  return (
    <div className="tm-stats">
      <div className="tm-tiles">
        {tiles.map((x) => (
          <div key={x.label} className="tm-tile">
            <x.icon size={18} aria-hidden="true" />
            <p className="tm-tile-label">{x.label}</p>
            <p className="tm-tile-value">{x.value}</p>
            <p className="rs-muted">{x.sub}</p>
          </div>
        ))}
      </div>

      {s.byEventType.length > 0 && (
        <section className="rs-card">
          <h2 className="rs-section-title">VĐV theo loại sự kiện</h2>
          <ul className="tm-bars">
            {s.byEventType.map((b) => (
              <li key={b.eventType}>
                <span className="tm-bars-label">{b.eventType}</span>
                <span className="tm-bars-track">
                  <span style={{ width: `${(b.players / maxPlayers) * 100}%` }} />
                </span>
                <span className="tm-bars-value">
                  {b.players} VĐV · {b.tournaments} giải
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rs-card">
        <h2 className="rs-section-title">Chi tiết từng giải</h2>
        <div className="tm-table-wrap">
          <table className="tm-table">
            <thead>
              <tr>
                <th>Giải</th>
                <th>Trạng thái</th>
                <th className="num">Đăng ký</th>
                <th className="num">Xác nhận</th>
                <th className="num">VĐV</th>
                <th className="num">Có mặt</th>
                <th className="num">Trận</th>
                <th className="num">Lệ phí</th>
                <th>Vô địch</th>
              </tr>
            </thead>
            <tbody>
              {s.tournaments.map((r) => (
                <tr key={r._id}>
                  <td>
                    <Link to={`/admin/tournaments/${r._id}`} className="rs-link">
                      {r.name}
                    </Link>
                    <div className="rs-muted">
                      {r.eventType} · {fmtDay(r.startDate)}
                    </div>
                  </td>
                  <td>
                    <span className={`tm-badge ${T_STATUS[r.status].badge}`}>{T_STATUS[r.status].label}</span>
                  </td>
                  <td className="num">{r.registrations}</td>
                  <td className="num">
                    {r.confirmed}/{r.maxParticipants}
                  </td>
                  <td className="num">{r.players}</td>
                  <td className="num">{r.checkedIn}</td>
                  <td className="num">
                    {r.matchesDone}/{r.matches}
                  </td>
                  <td className="num">{money(r.revenue)}</td>
                  <td>{r.champion || <span className="rs-muted">{r.resultsPublished ? "—" : "Chưa công bố"}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// =====================================================================
// Trang chính
// =====================================================================
const TABS = [
  { key: "tournaments", label: "Giải đấu" },
  { key: "types", label: "Loại sự kiện" },
  { key: "sponsors", label: "Nhà tài trợ" },
  { key: "stats", label: "Thống kê" },
];

export default function AdminTournaments() {
  const [tab, setTab] = useState("tournaments");
  const [list, setList] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [sponsors, setSponsors] = useState([]);
  const [staffOptions, setStaffOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [form, setForm] = useState(null); // { kind: "t"|"et"|"sp", item }
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.all([
      api.get("/tournaments/manage/list"),
      api.get("/tournaments/event-types"),
      api.get("/tournaments/sponsors"),
      api.get("/tournaments/manage/staff"),
    ])
      .then(([a, b, c, d]) => {
        if (!alive) return;
        setList(a.data.tournaments || []);
        setEventTypes(b.data.eventTypes || []);
        setSponsors(c.data.sponsors || []);
        setStaffOptions(d.data.staff || []);
        setError("");
      })
      .catch((err) => alive && setError(errMsg(err, "Không tải được dữ liệu giải đấu")))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);
  const saved = () => {
    setForm(null);
    reload();
  };

  const shown = useMemo(() => list.filter((t) => !statusFilter || t.status === statusFilter), [list, statusFilter]);

  const del = async (url, confirmText) => {
    if (!window.confirm(confirmText)) return;
    try {
      const res = await api.delete(url);
      toast.success(res.data.message);
      reload();
    } catch (err) {
      toast.error(errMsg(err, "Không xoá được"));
    }
  };

  const etCount = (id) => list.filter((t) => (t.eventType?._id || t.eventType) === id).length;

  return (
    <div className="rsd tm-admin">
      <div className="rsd-head">
        <div>
          <h1 className="rsd-title">Quản lý giải đấu</h1>
          <p className="rsd-subtitle">
            Tạo giải, phân công nhân viên phụ trách, quản lý nhà tài trợ và công bố kết quả.
          </p>
        </div>
        <div className="rsd-head-actions">
          <button type="button" className="btn btn-ghost" onClick={reload} disabled={loading}>
            <RefreshCw size={16} className={loading ? "rs-spin" : ""} /> Làm mới
          </button>
          {tab === "tournaments" && (
            <button type="button" className="btn btn-primary" onClick={() => setForm({ kind: "t" })}>
              <Plus size={16} /> Tạo giải đấu
            </button>
          )}
          {tab === "types" && (
            <button type="button" className="btn btn-primary" onClick={() => setForm({ kind: "et" })}>
              <Plus size={16} /> Thêm loại
            </button>
          )}
          {tab === "sponsors" && (
            <button type="button" className="btn btn-primary" onClick={() => setForm({ kind: "sp" })}>
              <Plus size={16} /> Thêm nhà tài trợ
            </button>
          )}
        </div>
      </div>

      <div className="rs-tabs tm-tabs" role="tablist" aria-label="Quản lý giải đấu">
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
          </button>
        ))}
      </div>

      {error && tab !== "stats" ? (
        <div className="rs-empty">
          <AlertTriangle size={28} />
          <p>{error}</p>
          <button type="button" className="btn btn-outline" onClick={reload}>
            Thử lại
          </button>
        </div>
      ) : loading && list.length === 0 && tab !== "stats" ? (
        <div className="tm-card tm-card--skeleton" style={{ height: 200 }} />
      ) : (
        <>
          {/* ===== Giải đấu ===== */}
          {tab === "tournaments" && (
            <>
              <div className="tm-toolbar">
                <select
                  className="form-input tm-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  aria-label="Lọc trạng thái"
                >
                  <option value="">Mọi trạng thái ({list.length})</option>
                  {Object.entries(T_STATUS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label} ({list.filter((t) => t.status === k).length})
                    </option>
                  ))}
                </select>
              </div>
              {shown.length === 0 ? (
                <div className="rs-empty">
                  <Trophy size={28} />
                  <p>Chưa có giải đấu nào. Bấm "Tạo giải đấu" để bắt đầu.</p>
                </div>
              ) : (
                <ul className="rsd-list">
                  {shown.map((t) => (
                    <li key={t._id} className="tm-admin-row">
                      <div className="tm-admin-main">
                        <div className="tm-card-top">
                          <span className={`tm-badge ${T_STATUS[t.status].badge}`}>{T_STATUS[t.status].label}</span>
                          <span className="tm-chip">
                            {t.eventType?.name} · {PLAY_SHORT[t.playType]}
                          </span>
                          {t.counts.pending > 0 && <span className="tm-pending">{t.counts.pending} chờ duyệt</span>}
                        </div>
                        <Link to={`/admin/tournaments/${t._id}`} className="tm-admin-name">
                          {t.name}
                        </Link>
                        <p className="rs-muted">
                          {fmtRange(t.startDate, t.endDate)} · {t.counts.confirmed}/{t.maxParticipants} {unit(t.playType)} ·{" "}
                          {t.matchDone}/{t.matchCount} trận ·{" "}
                          {t.staff?.length ? (
                            `Phụ trách: ${t.staff.map((s) => s.name).join(", ")}`
                          ) : (
                            <span className="rsd-unpaid">Chưa phân công nhân viên</span>
                          )}
                        </p>
                      </div>
                      <div className="tm-admin-actions">
                        <Link to={`/admin/tournaments/${t._id}`} className="btn btn-outline">
                          <Settings2 size={16} /> Quản lý
                        </Link>
                        <button
                          type="button"
                          className="rsd-icon-btn"
                          onClick={() => setForm({ kind: "t", item: t })}
                          aria-label={`Sửa ${t.name}`}
                          title="Sửa"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          type="button"
                          className="rsd-icon-btn tm-danger"
                          onClick={() =>
                            del(
                              `/tournaments/${t._id}`,
                              `Xoá giải "${t.name}"? Toàn bộ đăng ký và lịch thi đấu của giải sẽ bị xoá.`
                            )
                          }
                          aria-label={`Xoá ${t.name}`}
                          title="Xoá"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {/* ===== Loại sự kiện ===== */}
          {tab === "types" && (
            <ul className="rsd-list">
              {eventTypes.map((e) => (
                <li key={e._id} className="tm-admin-row">
                  <div className="tm-admin-main">
                    <p className="tm-admin-name">
                      {e.name}{" "}
                      {!e.isActive && <span className="tm-badge tm-badge--cancelled">Đang ẩn</span>}
                    </p>
                    <p className="rs-muted">
                      {PLAY_TYPE[e.playType]} · {etCount(e._id)} giải
                      {e.description ? ` · ${e.description}` : ""}
                    </p>
                  </div>
                  <div className="tm-admin-actions">
                    <button
                      type="button"
                      className="rsd-icon-btn"
                      onClick={() => setForm({ kind: "et", item: e })}
                      aria-label={`Sửa ${e.name}`}
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      type="button"
                      className="rsd-icon-btn tm-danger"
                      onClick={() => del(`/tournaments/event-types/${e._id}`, `Xoá loại "${e.name}"?`)}
                      aria-label={`Xoá ${e.name}`}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* ===== Nhà tài trợ ===== */}
          {tab === "sponsors" &&
            (sponsors.length === 0 ? (
              <div className="rs-empty">Chưa có nhà tài trợ.</div>
            ) : (
              <ul className="rsd-list">
                {sponsors.map((s) => (
                  <li key={s._id} className="tm-admin-row">
                    <div className="tm-admin-main">
                      <p className="tm-admin-name">
                        {s.name} <span className={`tm-chip tm-tier--${s.tier}`}>{TIER[s.tier]}</span>{" "}
                        {!s.isActive && <span className="tm-badge tm-badge--cancelled">Đang ẩn</span>}
                      </p>
                      <p className="rs-muted">
                        Đồng hành {s.tournamentCount} giải
                        {s.contactName ? ` · Liên hệ: ${s.contactName}` : ""}
                        {s.contactPhone ? ` (${s.contactPhone})` : ""}
                      </p>
                    </div>
                    <div className="tm-admin-actions">
                      <button
                        type="button"
                        className="rsd-icon-btn"
                        onClick={() => setForm({ kind: "sp", item: s })}
                        aria-label={`Sửa ${s.name}`}
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        type="button"
                        className="rsd-icon-btn tm-danger"
                        onClick={() =>
                          del(`/tournaments/sponsors/${s._id}`, `Xoá nhà tài trợ "${s.name}"? Sẽ gỡ khỏi các giải đang gắn.`)
                        }
                        aria-label={`Xoá ${s.name}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ))}
        </>
      )}

      {tab === "stats" && <StatsTab key={reloadKey} />}

      {form?.kind === "t" && (
        <TournamentForm
          initial={form.item}
          eventTypes={eventTypes}
          sponsors={sponsors}
          staffOptions={staffOptions}
          onClose={() => setForm(null)}
          onSaved={saved}
        />
      )}
      {form?.kind === "et" && <EventTypeForm initial={form.item} onClose={() => setForm(null)} onSaved={saved} />}
      {form?.kind === "sp" && <SponsorForm initial={form.item} onClose={() => setForm(null)} onSaved={saved} />}
    </div>
  );
}

export function AdminTournamentManage() {
  const { id } = useParams();
  return <TournamentManage id={id} isAdmin backTo="/admin/tournaments" />;
}
