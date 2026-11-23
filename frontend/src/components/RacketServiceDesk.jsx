import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Plus,
  Search,
  RefreshCw,
  AlertTriangle,
  Phone,
  User,
  ChevronDown,
  CheckCircle2,
  Ban,
  Copy,
  Wallet,
} from "lucide-react";
import api from "../services/api";
import RacketProgress from "./RacketProgress";
import Drawer from "./Drawer";
import {
  STATUS,
  SERVICE,
  ACTIVE,
  CLOSED,
  fmtDate,
  fmtMoney,
  fmtPhone,
  isOverdue,
  serviceDetail,
  toLocalInput,
} from "../utils/racketService";

// Bước kế tiếp hay dùng nhất cho từng trạng thái
const NEXT = {
  received: { to: "in_progress", label: "Bắt đầu sửa" },
  in_progress: { to: "completed", label: "Đã sửa xong" },
  completed: { to: "picked_up", label: "Khách đã nhận vợt" },
};

const TABS = [
  { key: "active", label: "Đang xử lý", match: (t) => ACTIVE.includes(t.status) },
  { key: "received", label: "Chờ sửa", match: (t) => t.status === "received" },
  { key: "in_progress", label: "Đang sửa", match: (t) => t.status === "in_progress" },
  { key: "completed", label: "Chờ khách lấy", match: (t) => t.status === "completed" },
  { key: "overdue", label: "Quá hẹn", match: isOverdue },
  { key: "closed", label: "Đã trả / huỷ", match: (t) => CLOSED.includes(t.status) },
];

const digits = (s) => String(s || "").replace(/\D/g, "");

// Giờ hẹn mặc định: 3 tiếng nữa, làm tròn lên 30 phút.
// Rơi vào ngoài giờ mở cửa (sau 21h / trước 8h) thì hẹn 10h sáng hôm sau.
const defaultReady = () => {
  const d = new Date(Date.now() + 3 * 3600e3);
  d.setMinutes(d.getMinutes() > 30 ? 60 : 30, 0, 0);
  const h = d.getHours();
  if (h >= 21 || h < 8) {
    if (h >= 21) d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
  }
  return toLocalInput(d);
};

const emptyForm = () => ({
  customerPhone: "",
  customerName: "",
  racketBrand: "",
  racketDescription: "",
  conditionAtReceive: "",
  serviceType: "stringing",
  stringName: "",
  isCustomerString: false,
  tensionLbs: "",
  serviceFee: "",
  materialFee: "",
  estimatedReadyAt: defaultReady(),
  note: "",
});

// ===================================================================
// Form tiếp nhận vợt
// ===================================================================
function CreateDrawer({ onClose, onCreated }) {
  const [f, setF] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) =>
    setF((p) => ({ ...p, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const total =
    (Number(f.serviceFee) || 0) + (f.isCustomerString ? 0 : Number(f.materialFee) || 0);

  const submit = async (e) => {
    e.preventDefault();
    if (digits(f.customerPhone).length < 9) {
      toast.error("Số điện thoại khách chưa đúng");
      return;
    }
    setSaving(true);
    try {
      const body = {
        ...f,
        tensionLbs: f.serviceType === "stringing" && f.tensionLbs ? Number(f.tensionLbs) : undefined,
        stringName: f.serviceType === "stringing" ? f.stringName : "",
        isCustomerString: f.serviceType === "stringing" && f.isCustomerString,
        serviceFee: Number(f.serviceFee) || 0,
        materialFee: Number(f.materialFee) || 0,
        estimatedReadyAt: f.estimatedReadyAt ? new Date(f.estimatedReadyAt).toISOString() : undefined,
      };
      const res = await api.post("/racket-services", body);
      onCreated(res.data.ticket);
    } catch (err) {
      toast.error(err.response?.data?.message || "Không tạo được phiếu");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      title="Tiếp nhận vợt"
      onClose={onClose}
      footer={
        <>
          <span className="rsd-total">
            Tạm tính <strong>{fmtMoney(total)}</strong>
          </span>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Đóng
          </button>
          <button type="submit" form="rsd-create" className="btn btn-primary" disabled={saving}>
            {saving ? "Đang tạo..." : "Tạo phiếu"}
          </button>
        </>
      }
    >
      <form id="rsd-create" className="rsd-form" onSubmit={submit}>
        <fieldset>
          <legend>Khách hàng</legend>
          <div className="rsd-grid2">
            <label>
              <span className="form-label">Số điện thoại *</span>
              <input
                className="form-input"
                type="tel"
                inputMode="tel"
                required
                autoFocus
                value={f.customerPhone}
                onChange={set("customerPhone")}
                placeholder="0912 345 678"
              />
            </label>
            <label>
              <span className="form-label">Tên khách *</span>
              <input
                className="form-input"
                required
                value={f.customerName}
                onChange={set("customerName")}
                placeholder="Nguyễn Văn A"
              />
            </label>
          </div>
          <p className="rsd-hint">
            Nếu SĐT trùng tài khoản khách, phiếu tự hiện trong mục "Sửa vợt" của khách.
          </p>
        </fieldset>

        <fieldset>
          <legend>Vợt</legend>
          <div className="rsd-grid2">
            <label>
              <span className="form-label">Hãng / mẫu vợt *</span>
              <input
                className="form-input"
                required
                value={f.racketBrand}
                onChange={set("racketBrand")}
                placeholder="Yonex Astrox 88D"
              />
            </label>
            <label>
              <span className="form-label">Đặc điểm nhận dạng</span>
              <input
                className="form-input"
                value={f.racketDescription}
                onChange={set("racketDescription")}
                placeholder="Khung đỏ, cán quấn đen"
              />
            </label>
          </div>
          <label>
            <span className="form-label">Tình trạng lúc nhận</span>
            <textarea
              className="form-input"
              rows={2}
              value={f.conditionAtReceive}
              onChange={set("conditionAtReceive")}
              placeholder="Đứt dây chính, khung không nứt..."
            />
          </label>
        </fieldset>

        <fieldset>
          <legend>Dịch vụ</legend>
          <div className="rsd-seg" role="radiogroup" aria-label="Loại dịch vụ">
            {Object.entries(SERVICE).map(([k, label]) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={f.serviceType === k}
                className={`rsd-seg-btn ${f.serviceType === k ? "rsd-seg-btn--on" : ""}`}
                onClick={() => setF((p) => ({ ...p, serviceType: k }))}
              >
                {label}
              </button>
            ))}
          </div>

          {f.serviceType === "stringing" && (
            <>
              <div className="rsd-grid2">
                <label>
                  <span className="form-label">Loại dây</span>
                  <input
                    className="form-input"
                    value={f.stringName}
                    onChange={set("stringName")}
                    placeholder="BG66 Ultimax"
                  />
                </label>
                <label>
                  <span className="form-label">Số lbs</span>
                  <input
                    className="form-input"
                    type="number"
                    min={10}
                    max={40}
                    value={f.tensionLbs}
                    onChange={set("tensionLbs")}
                    placeholder="24"
                  />
                </label>
              </div>
              <label className="rsd-check">
                <input
                  type="checkbox"
                  checked={f.isCustomerString}
                  onChange={set("isCustomerString")}
                />
                Khách tự mang dây (không tính tiền dây)
              </label>
            </>
          )}

          <div className="rsd-grid2">
            <label>
              <span className="form-label">Tiền công (đ)</span>
              <input
                className="form-input"
                type="number"
                min={0}
                step={1000}
                value={f.serviceFee}
                onChange={set("serviceFee")}
                placeholder="50000"
              />
            </label>
            <label>
              <span className="form-label">Tiền vật tư (đ)</span>
              <input
                className="form-input"
                type="number"
                min={0}
                step={1000}
                value={f.isCustomerString ? "" : f.materialFee}
                onChange={set("materialFee")}
                disabled={f.isCustomerString}
                placeholder={f.isCustomerString ? "Khách mang dây" : "120000"}
              />
            </label>
          </div>
          <div className="rsd-grid2">
            <label>
              <span className="form-label">Hẹn trả lúc</span>
              <input
                className="form-input"
                type="datetime-local"
                value={f.estimatedReadyAt}
                onChange={set("estimatedReadyAt")}
              />
            </label>
            <label>
              <span className="form-label">Ghi chú nội bộ</span>
              <input
                className="form-input"
                value={f.note}
                onChange={set("note")}
                placeholder="Khách không xem được"
              />
            </label>
          </div>
        </fieldset>
      </form>
    </Drawer>
  );
}

// ===================================================================
// Chi tiết phiếu + cập nhật trạng thái
// ===================================================================
function DetailDrawer({ ticket: initial, onClose, onChanged }) {
  const [t, setT] = useState(initial);
  const [note, setNote] = useState("");
  const [other, setOther] = useState("");
  const [collectPay, setCollectPay] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [edit, setEdit] = useState(() => ({
    estimatedReadyAt: toLocalInput(initial.estimatedReadyAt),
    serviceFee: initial.serviceFee ?? 0,
    materialFee: initial.materialFee ?? 0,
    note: initial.note || "",
  }));

  // Lấy bản đầy đủ (có tài khoản khách liên kết)
  useEffect(() => {
    let alive = true;
    api
      .get(`/racket-services/${initial._id}`)
      .then((res) => alive && setT(res.data.ticket))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [initial._id]);

  const closed = CLOSED.includes(t.status);
  const next = NEXT[t.status];
  const st = STATUS[t.status];

  const refresh = async () => {
    const res = await api.get(`/racket-services/${t._id}`);
    setT(res.data.ticket);
    onChanged();
  };

  const changeStatus = async (status) => {
    if (status === "cancelled" && !note.trim()) {
      toast.error("Ghi lý do huỷ vào ô ghi chú");
      return;
    }
    setBusy(true);
    try {
      await api.put(`/racket-services/${t._id}/status`, {
        status,
        note: note.trim() || undefined,
      });
      if (status === "picked_up" && collectPay && t.paymentStatus !== "paid") {
        await api.put(`/racket-services/${t._id}`, { paymentStatus: "paid" });
      }
      toast.success(`Đã chuyển sang "${STATUS[status].label}"`);
      setNote("");
      setOther("");
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || "Không cập nhật được trạng thái");
    } finally {
      setBusy(false);
    }
  };

  const addNoteOnly = async () => {
    if (!note.trim()) return;
    setBusy(true);
    try {
      await api.put(`/racket-services/${t._id}/status`, { status: t.status, note: note.trim() });
      toast.success("Đã thêm ghi chú cho khách");
      setNote("");
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thêm được ghi chú");
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put(`/racket-services/${t._id}`, {
        estimatedReadyAt: edit.estimatedReadyAt ? new Date(edit.estimatedReadyAt).toISOString() : null,
        serviceFee: Number(edit.serviceFee) || 0,
        materialFee: t.isCustomerString ? 0 : Number(edit.materialFee) || 0,
        note: edit.note,
      });
      toast.success("Đã lưu thông tin phiếu");
      setEditOpen(false);
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || "Không lưu được");
    } finally {
      setBusy(false);
    }
  };

  const togglePaid = async () => {
    setBusy(true);
    try {
      const paymentStatus = t.paymentStatus === "paid" ? "unpaid" : "paid";
      await api.put(`/racket-services/${t._id}`, { paymentStatus });
      toast.success(paymentStatus === "paid" ? "Đã ghi nhận thu tiền" : "Đã chuyển về chưa thu");
      await refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || "Không cập nhật được thanh toán");
    } finally {
      setBusy(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard?.writeText(t.ticketCode).then(
      () => toast.success("Đã sao chép mã phiếu"),
      () => {}
    );
  };

  return (
    <Drawer title={`Phiếu ${t.ticketCode}`} onClose={onClose}>
      <div className="rsd-detail-head">
        <div style={{ minWidth: 0 }}>
          <h3 className="rs-card-title">{t.racketBrand}</h3>
          <p className="rs-card-sub">{t.racketDescription || "Không ghi đặc điểm"}</p>
        </div>
        <span className={`rs-badge ${st.badge}`}>{st.label}</span>
      </div>

      <RacketProgress status={t.status} />

      {isOverdue(t) && (
        <div className="rs-callout rs-callout--warn">
          <AlertTriangle size={18} />
          <p>Đã quá giờ hẹn trả ({fmtDate(t.estimatedReadyAt)}). Nên dời giờ hẹn hoặc báo khách.</p>
        </div>
      )}

      {/* ---- Cập nhật trạng thái ---- */}
      {!closed && (
        <section className="rsd-panel" aria-label="Cập nhật trạng thái">
          <label>
            <span className="form-label">Ghi chú gửi khách (khách xem được)</span>
            <textarea
              className="form-input"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                t.status === "received"
                  ? "VD: Thợ bắt đầu căng dây"
                  : t.status === "in_progress"
                    ? "VD: Đã căng 25 lbs, mời khách đến lấy"
                    : "VD: Khách đã nhận vợt"
              }
            />
          </label>

          {next?.to === "picked_up" && t.paymentStatus !== "paid" && (
            <label className="rsd-check">
              <input
                type="checkbox"
                checked={collectPay}
                onChange={(e) => setCollectPay(e.target.checked)}
              />
              Thu luôn {fmtMoney(t.totalAmount)} khi trả vợt
            </label>
          )}

          <div className="rsd-actions">
            {next && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={() => changeStatus(next.to)}
              >
                <CheckCircle2 size={16} /> {next.label}
              </button>
            )}
            <button
              type="button"
              className="btn btn-outline"
              disabled={busy || !note.trim()}
              onClick={addNoteOnly}
              title="Giữ nguyên trạng thái, chỉ gửi thêm ghi chú"
            >
              Chỉ thêm ghi chú
            </button>
          </div>

          <div className="rsd-other">
            <label htmlFor="rsd-other">Chuyển sang trạng thái khác</label>
            <div className="rsd-other-row">
              <select
                id="rsd-other"
                className="form-input"
                value={other}
                onChange={(e) => setOther(e.target.value)}
              >
                <option value="">Chọn trạng thái...</option>
                {Object.entries(STATUS)
                  .filter(([k]) => k !== t.status && k !== "cancelled")
                  .map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                className="btn btn-outline"
                disabled={busy || !other}
                onClick={() => changeStatus(other)}
              >
                Chuyển
              </button>
            </div>
          </div>

          <button
            type="button"
            className="rsd-cancel"
            disabled={busy}
            onClick={() => {
              if (window.confirm(`Huỷ phiếu ${t.ticketCode}? Phiếu đã huỷ không mở lại được.`))
                changeStatus("cancelled");
            }}
          >
            <Ban size={14} /> Huỷ phiếu (cần ghi lý do ở ô ghi chú)
          </button>
        </section>
      )}

      {/* ---- Thông tin ---- */}
      <dl className="rs-facts rsd-facts">
        <div>
          <dt>Khách</dt>
          <dd>
            {t.customerName}
            <br />
            <a className="rs-link" href={`tel:${t.customerPhone}`}>
              {fmtPhone(t.customerPhone)}
            </a>
            {t.customer && <span className="rsd-tag">Có tài khoản</span>}
          </dd>
        </div>
        <div>
          <dt>Dịch vụ</dt>
          <dd>{serviceDetail(t)}</dd>
        </div>
        <div>
          <dt>Nhận lúc</dt>
          <dd>
            {fmtDate(t.receivedAt)}
            {t.receivedBy?.name && <span className="rs-muted"> · {t.receivedBy.name}</span>}
          </dd>
        </div>
        <div>
          <dt>{t.status === "picked_up" ? "Đã trả lúc" : "Hẹn trả"}</dt>
          <dd>{fmtDate(t.status === "picked_up" ? t.pickedUpAt : t.estimatedReadyAt)}</dd>
        </div>
        <div>
          <dt>Chi phí</dt>
          <dd>
            {fmtMoney(t.totalAmount)}{" "}
            <span className="rs-muted">
              (công {fmtMoney(t.serviceFee)} + vật tư {fmtMoney(t.materialFee)})
            </span>
          </dd>
        </div>
        <div>
          <dt>Thanh toán</dt>
          <dd className="rsd-pay">
            <span className={t.paymentStatus === "paid" ? "rsd-paid" : "rsd-unpaid"}>
              {t.paymentStatus === "paid" ? "Đã thu" : "Chưa thu"}
            </span>
            {t.status !== "cancelled" && (
              <button type="button" className="rs-link" disabled={busy} onClick={togglePaid}>
                <Wallet size={14} />
                {t.paymentStatus === "paid" ? "Hoàn tác" : "Ghi nhận đã thu"}
              </button>
            )}
          </dd>
        </div>
      </dl>

      {t.conditionAtReceive && (
        <p className="rs-note">
          <span>Tình trạng lúc nhận:</span> {t.conditionAtReceive}
        </p>
      )}
      {t.note && (
        <p className="rs-note">
          <span>Ghi chú nội bộ:</span> {t.note}
        </p>
      )}

      <div className="rsd-inline-actions">
        <button type="button" className="rs-link" onClick={copyCode}>
          <Copy size={14} /> Sao chép mã phiếu
        </button>
        {!closed && (
          <button
            type="button"
            className="rs-link"
            onClick={() => setEditOpen((o) => !o)}
            aria-expanded={editOpen}
          >
            Sửa giá / giờ hẹn
            <ChevronDown size={14} className={editOpen ? "rs-rot" : ""} />
          </button>
        )}
      </div>

      {editOpen && (
        <form className="rsd-panel rsd-form" onSubmit={saveEdit}>
          <div className="rsd-grid2">
            <label>
              <span className="form-label">Tiền công (đ)</span>
              <input
                className="form-input"
                type="number"
                min={0}
                step={1000}
                value={edit.serviceFee}
                onChange={(e) => setEdit((p) => ({ ...p, serviceFee: e.target.value }))}
              />
            </label>
            <label>
              <span className="form-label">Tiền vật tư (đ)</span>
              <input
                className="form-input"
                type="number"
                min={0}
                step={1000}
                disabled={t.isCustomerString}
                value={t.isCustomerString ? 0 : edit.materialFee}
                onChange={(e) => setEdit((p) => ({ ...p, materialFee: e.target.value }))}
              />
            </label>
          </div>
          <label>
            <span className="form-label">Hẹn trả lúc</span>
            <input
              className="form-input"
              type="datetime-local"
              value={edit.estimatedReadyAt}
              onChange={(e) => setEdit((p) => ({ ...p, estimatedReadyAt: e.target.value }))}
            />
          </label>
          <label>
            <span className="form-label">Ghi chú nội bộ</span>
            <input
              className="form-input"
              value={edit.note}
              onChange={(e) => setEdit((p) => ({ ...p, note: e.target.value }))}
            />
          </label>
          <div className="rsd-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              Lưu thay đổi
            </button>
          </div>
        </form>
      )}

      <h4 className="rsd-subhead">Lịch sử cập nhật</h4>
      <ol className="rs-timeline">
        {[...(t.statusHistory || [])].reverse().map((h, i) => (
          <li key={i}>
            <span className="rs-timeline-time">
              {fmtDate(h.changedAt)}
              {h.changedBy?.name ? ` · ${h.changedBy.name}` : ""}
            </span>
            <span className="rs-timeline-status">{STATUS[h.status]?.label}</span>
            {h.note && <span className="rs-timeline-note">{h.note}</span>}
          </li>
        ))}
      </ol>
    </Drawer>
  );
}

// ===================================================================
// Màn hình chính
// ===================================================================
export default function RacketServiceDesk() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [tab, setTab] = useState("active");
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let alive = true;
    api
      .get("/racket-services")
      .then((res) => {
        if (!alive) return;
        setTickets(res.data.tickets || []);
        setError("");
      })
      .catch((err) => {
        if (alive) setError(err.response?.data?.message || "Không tải được danh sách phiếu");
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const reload = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  const counts = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.key, tickets.filter(t.match).length])),
    [tickets]
  );

  const shown = useMemo(() => {
    const m = TABS.find((x) => x.key === tab).match;
    const text = q.trim().toLowerCase();
    const d = digits(q);
    return tickets.filter(
      (t) =>
        m(t) &&
        (!text ||
          t.ticketCode.toLowerCase().includes(text) ||
          t.customerName.toLowerCase().includes(text) ||
          t.racketBrand.toLowerCase().includes(text) ||
          (d.length >= 3 && t.customerPhone.includes(d)))
    );
  }, [tickets, tab, q]);

  const handleCreated = (ticket) => {
    setCreating(false);
    toast.success(`Đã tạo phiếu ${ticket.ticketCode}. Đọc mã này cho khách để tra cứu.`, {
      duration: 6000,
    });
    setTab("active");
    reload();
    setSelected(ticket);
  };

  return (
    <div className="rsd">
      <div className="rsd-head">
        <div>
          <h1 className="rsd-title">Dịch vụ vợt</h1>
          <p className="rsd-subtitle">
            Tiếp nhận vợt, cập nhật tiến độ. Khách xem trạng thái ở mục "Sửa vợt" hoặc tra bằng mã
            phiếu + SĐT.
          </p>
        </div>
        <div className="rsd-head-actions">
          <button type="button" className="btn btn-ghost" onClick={reload} disabled={loading}>
            <RefreshCw size={16} className={loading ? "rs-spin" : ""} /> Làm mới
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            <Plus size={16} /> Tiếp nhận vợt
          </button>
        </div>
      </div>

      <div className="rsd-stats">
        {[
          ["received", "Chờ sửa"],
          ["in_progress", "Đang sửa"],
          ["completed", "Chờ khách lấy"],
          ["overdue", "Quá hẹn"],
        ].map(([k, label]) => (
          <button
            key={k}
            type="button"
            className={`rsd-stat rsd-stat--${k} ${tab === k ? "rsd-stat--on" : ""}`}
            onClick={() => setTab(k)}
          >
            <span className="rsd-stat-num">{counts[k] ?? 0}</span>
            <span className="rsd-stat-label">{label}</span>
          </button>
        ))}
      </div>

      <div className="rsd-toolbar">
        <div className="rs-tabs" role="tablist" aria-label="Lọc phiếu">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={`rs-tab ${tab === t.key ? "rs-tab--on" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              <span className="rs-count">{counts[t.key] ?? 0}</span>
            </button>
          ))}
        </div>
        <label className="rsd-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Mã phiếu, tên, SĐT, vợt..."
            aria-label="Tìm phiếu"
          />
        </label>
      </div>

      {error ? (
        <div className="rs-empty">
          <AlertTriangle size={28} />
          <p>{error}</p>
          <button type="button" className="btn btn-outline" onClick={reload}>
            Thử lại
          </button>
        </div>
      ) : loading && tickets.length === 0 ? (
        <div className="rsd-list">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rsd-row rsd-row--skeleton" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div className="rs-empty">
          <p>
            {q
              ? `Không có phiếu nào khớp "${q}".`
              : tickets.length === 0
                ? "Chưa có phiếu nào. Bấm \"Tiếp nhận vợt\" khi khách gửi vợt."
                : "Không có phiếu trong mục này."}
          </p>
        </div>
      ) : (
        <ul className="rsd-list">
          {shown.map((t) => {
            const st = STATUS[t.status];
            const late = isOverdue(t);
            return (
              <li key={t._id}>
                <button type="button" className="rsd-row" onClick={() => setSelected(t)}>
                  <span className="rsd-cell rsd-cell--code">
                    <strong>{t.ticketCode}</strong>
                    <span className={`rs-badge ${st.badge}`}>{st.label}</span>
                  </span>
                  <span className="rsd-cell">
                    <span className="rsd-line">
                      <User size={14} aria-hidden="true" /> {t.customerName}
                    </span>
                    <span className="rsd-line rs-muted">
                      <Phone size={14} aria-hidden="true" /> {fmtPhone(t.customerPhone)}
                    </span>
                  </span>
                  <span className="rsd-cell">
                    <span className="rsd-line">{t.racketBrand}</span>
                    <span className="rsd-line rs-muted">{serviceDetail(t)}</span>
                  </span>
                  <span className="rsd-cell">
                    <span className="rsd-cell-label">
                      {t.status === "picked_up" ? "Đã trả" : "Hẹn trả"}
                    </span>
                    <span className={`rsd-line ${late ? "rsd-late" : ""}`}>
                      {late && <AlertTriangle size={14} aria-label="Quá hẹn" />}
                      {fmtDate(t.status === "picked_up" ? t.pickedUpAt : t.estimatedReadyAt)}
                    </span>
                  </span>
                  <span className="rsd-cell rsd-cell--money">
                    <strong>{fmtMoney(t.totalAmount)}</strong>
                    <span className={t.paymentStatus === "paid" ? "rsd-paid" : "rsd-unpaid"}>
                      {t.paymentStatus === "paid" ? "Đã thu" : "Chưa thu"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {creating && <CreateDrawer onClose={() => setCreating(false)} onCreated={handleCreated} />}
      {selected && (
        <DetailDrawer
          key={selected._id}
          ticket={selected}
          onClose={() => setSelected(null)}
          onChanged={reload}
        />
      )}
    </div>
  );
}
