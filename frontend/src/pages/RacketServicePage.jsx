import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  RefreshCw,
  Search,
  PackageCheck,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
  Ticket,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import RacketProgress from "../components/RacketProgress";
import {
  STATUS,
  ACTIVE,
  fmtDate,
  fmtMoney,
  isOverdue,
  serviceDetail,
} from "../utils/racketService";

// ===== Thẻ một phiếu =====
function TicketCard({ t }) {
  const [open, setOpen] = useState(false);
  const st = STATUS[t.status] || STATUS.received;
  const overdue = isOverdue(t);
  const detail = serviceDetail(t);

  return (
    <article className="rs-card">
      <header className="rs-card-head">
        <div style={{ minWidth: 0 }}>
          <h3 className="rs-card-title">{t.racketBrand}</h3>
          <p className="rs-card-sub">
            <Ticket size={14} /> {t.ticketCode}
            {t.racketDescription ? ` · ${t.racketDescription}` : ""}
          </p>
        </div>
        <span className={`rs-badge ${st.badge}`}>{st.label}</span>
      </header>

      <RacketProgress status={t.status} />

      {t.status === "completed" && (
        <div className="rs-callout rs-callout--ready">
          <PackageCheck size={18} />
          <p>
            Vợt đã sửa xong. Mời bạn đến quầy nhận vợt, đọc mã phiếu{" "}
            <strong>{t.ticketCode}</strong>. Thanh toán {fmtMoney(t.totalAmount)} khi nhận.
          </p>
        </div>
      )}
      {overdue && (
        <div className="rs-callout rs-callout--warn">
          <AlertTriangle size={18} />
          <p>Đã quá giờ hẹn trả. Sân đang xử lý và sẽ báo bạn khi xong.</p>
        </div>
      )}
      {t.status === "cancelled" && (
        <div className="rs-callout rs-callout--muted">
          <XCircle size={18} />
          <p>Phiếu đã huỷ. Nếu vợt vẫn còn ở sân, vui lòng liên hệ quầy để nhận lại.</p>
        </div>
      )}

      <dl className="rs-facts">
        <div>
          <dt>Dịch vụ</dt>
          <dd>{detail}</dd>
        </div>
        <div>
          <dt>Ngày nhận</dt>
          <dd>{fmtDate(t.receivedAt)}</dd>
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
              {t.paymentStatus === "paid" ? "(đã thanh toán)" : "(trả khi nhận vợt)"}
            </span>
          </dd>
        </div>
      </dl>

      {t.conditionAtReceive && (
        <p className="rs-note">
          <span>Tình trạng lúc nhận:</span> {t.conditionAtReceive}
        </p>
      )}

      {t.statusHistory?.length > 0 && (
        <div className="rs-history">
          <button
            type="button"
            className="rs-history-toggle"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
          >
            Lịch sử cập nhật ({t.statusHistory.length})
            <ChevronDown size={16} className={open ? "rs-rot" : ""} />
          </button>
          {open && (
            <ol className="rs-timeline">
              {[...t.statusHistory].reverse().map((h, i) => (
                <li key={i}>
                  <span className="rs-timeline-time">{fmtDate(h.changedAt)}</span>
                  <span className="rs-timeline-status">{STATUS[h.status]?.label}</span>
                  {h.note && <span className="rs-timeline-note">{h.note}</span>}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </article>
  );
}

// ===== Trang =====
export default function RacketServicePage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(!!user);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("active");

  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState("");
  const [lookingUp, setLookingUp] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user) return undefined;
    let alive = true;
    api
      .get("/racket-services/my")
      .then((res) => {
        if (!alive) return;
        setTickets(res.data.tickets || []);
        setError("");
      })
      .catch((err) => {
        if (alive) setError(err.response?.data?.message || "Không tải được danh sách phiếu vợt");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [user, reloadKey]);

  const fetchMine = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  const handleLookup = async (e) => {
    e.preventDefault();
    setLookingUp(true);
    setLookupError("");
    setLookupResult(null);
    try {
      const res = await api.get("/racket-services/lookup", {
        params: { code: code.trim(), phone: phone.trim() },
      });
      setLookupResult(res.data.ticket);
    } catch (err) {
      setLookupError(err.response?.data?.message || "Không tra cứu được phiếu");
    } finally {
      setLookingUp(false);
    }
  };

  const activeList = tickets.filter((t) => ACTIVE.includes(t.status));
  const doneList = tickets.filter((t) => !ACTIVE.includes(t.status));
  const shown = tab === "active" ? activeList : doneList;
  const readyCount = tickets.filter((t) => t.status === "completed").length;

  return (
    <div className="animate-fadeIn has-bottom-nav">
      <div className="rs-page">
        <header className="rs-header">
          <div>
            <h1 className="rs-title">Theo dõi sửa vợt</h1>
            <p className="rs-subtitle">
              Xem vợt bạn gửi sân đang ở bước nào: đã nhận, đang sửa, đã xong hay đã trả.
            </p>
          </div>
          {user && (
            <button type="button" className="btn btn-outline" onClick={fetchMine} disabled={loading}>
              <RefreshCw size={16} className={loading ? "rs-spin" : ""} /> Làm mới
            </button>
          )}
        </header>

        <div className={`rs-layout ${user ? "" : "rs-layout--guest"}`}>
          {/* ===== Danh sách phiếu của tôi ===== */}
          <section className="rs-main" aria-labelledby="rs-mine">
            <h2 id="rs-mine" className="rs-section-title">
              Vợt của tôi
            </h2>

            {!user ? (
              <>
                <div className="rs-empty">
                  <p>
                    <Link to="/login" className="rs-link">Đăng nhập</Link> để xem tất cả vợt bạn đã
                    gửi sân. Hoặc tra cứu nhanh bằng mã phiếu ở bên cạnh.
                  </p>
                </div>
                {lookupResult && (
                  <div className="rs-list" style={{ marginTop: 14 }}>
                    <TicketCard t={lookupResult} />
                  </div>
                )}
              </>
            ) : (
              <>
                {readyCount > 0 && (
                  <div className="rs-callout rs-callout--ready rs-summary">
                    <PackageCheck size={18} />
                    <p>
                      Bạn có <strong>{readyCount} vợt đã sửa xong</strong>, mời đến quầy nhận.
                    </p>
                  </div>
                )}

                <div className="rs-tabs" role="tablist">
                  <button
                    role="tab"
                    aria-selected={tab === "active"}
                    className={`rs-tab ${tab === "active" ? "rs-tab--on" : ""}`}
                    onClick={() => setTab("active")}
                  >
                    Đang xử lý <span className="rs-count">{activeList.length}</span>
                  </button>
                  <button
                    role="tab"
                    aria-selected={tab === "done"}
                    className={`rs-tab ${tab === "done" ? "rs-tab--on" : ""}`}
                    onClick={() => setTab("done")}
                  >
                    Đã trả / Đã huỷ <span className="rs-count">{doneList.length}</span>
                  </button>
                </div>

                {loading ? (
                  <div className="rs-list">
                    {[1, 2].map((i) => (
                      <div key={i} className="skeleton" style={{ height: 220, borderRadius: 12 }} />
                    ))}
                  </div>
                ) : error ? (
                  <div className="rs-empty">
                    <p>{error}</p>
                    <button type="button" className="btn btn-outline" onClick={fetchMine}>
                      Thử lại
                    </button>
                  </div>
                ) : shown.length === 0 ? (
                  <div className="rs-empty">
                    <Clock size={28} />
                    <p>
                      {tab === "active"
                        ? "Hiện không có vợt nào đang sửa."
                        : "Chưa có phiếu nào đã trả hoặc đã huỷ."}
                    </p>
                    <p className="rs-muted">
                      Phiếu do nhân viên quầy tạo khi bạn gửi vợt sẽ hiện ở đây nếu trùng số điện
                      thoại tài khoản{user.phone ? ` (${user.phone})` : ""}.
                    </p>
                  </div>
                ) : (
                  <div className="rs-list">
                    {shown.map((t) => (
                      <TicketCard key={t._id} t={t} />
                    ))}
                  </div>
                )}
              </>
            )}
          </section>

          {/* ===== Tra cứu bằng mã phiếu ===== */}
          <aside className="rs-side" aria-labelledby="rs-lookup">
            <h2 id="rs-lookup" className="rs-section-title">
              Tra cứu bằng mã phiếu
            </h2>
            <form className="rs-lookup" onSubmit={handleLookup}>
              <div>
                <label className="form-label" htmlFor="rs-code">
                  Mã phiếu
                </label>
                <input
                  id="rs-code"
                  className="form-input"
                  placeholder="VD: SV-261120-001"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  required
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="form-label" htmlFor="rs-phone">
                  Số điện thoại khi gửi vợt
                </label>
                <input
                  id="rs-phone"
                  className="form-input"
                  inputMode="tel"
                  placeholder="VD: 0901234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={lookingUp}>
                <Search size={16} /> {lookingUp ? "Đang tìm..." : "Tra cứu"}
              </button>
              <p className="rs-muted rs-hint">
                Mã phiếu in trên giấy biên nhận nhân viên đưa khi bạn gửi vợt.
              </p>
            </form>

            {lookupError && (
              <div className="rs-callout rs-callout--warn" role="alert">
                <AlertTriangle size={18} />
                <p>{lookupError}</p>
              </div>
            )}
            {/* Khách đã đăng nhập: kết quả tra cứu hiện ngay dưới form */}
            {user && lookupResult && <TicketCard t={lookupResult} />}
          </aside>
        </div>
      </div>
    </div>
  );
}
