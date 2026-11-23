import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle,
  Clock,
  MapPin,
  Pencil,
  Trophy,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { STATE_BADGE, fmtDateTime, fmtDate } from "../utils/events";

const MEDALS = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ev, setEv] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [myReg, setMyReg] = useState(null);

  // Modal form đăng ký / chỉnh sửa phiếu đăng ký
  const [showRegModal, setShowRegModal] = useState(false);
  const [isEditingReg, setIsEditingReg] = useState(false);
  const [busy, setBusy] = useState(false);
  const [regForm, setRegForm] = useState({
    name: "",
    phone: "",
    gender: "Nam",
    skillLevel: "Phong trào",
    partnerOrTeamName: "",
    note: "",
  });

  // Modal tự hủy đăng ký
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const fetchEvent = () =>
    api
      .get(`/events/${id}`)
      .then((res) => setEv(res.data.event))
      .catch(() => setNotFound(true));

  const fetchMyRegistration = () => {
    if (!user) {
      setMyReg(null);
      return;
    }
    api
      .get("/registrations/mine")
      .then((res) => {
        const found = (res.data.registrations || []).find(
          (r) => r.event?._id === id && r.status === "registered",
        );
        setMyReg(found || null);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchEvent();
    fetchMyRegistration();
  }, [id, user]);

  const isTeamOrDouble = /đôi|đội/i.test(ev?.type?.name || "");

  const canModifyBeforeDeadline = (() => {
    if (!myReg || !ev || ev.status !== "published") return false;
    const now = new Date();
    if (ev.registrationDeadline && now > new Date(ev.registrationDeadline))
      return false;
    if (ev.startDate && now > new Date(ev.startDate)) return false;
    return true;
  })();

  const openRegisterModal = () => {
    if (!user) return navigate("/login");
    setIsEditingReg(false);
    setRegForm({
      name: user.name || "",
      phone: user.phone || "",
      gender: "Nam",
      skillLevel: "Phong trào",
      partnerOrTeamName: "",
      note: "",
    });
    setShowRegModal(true);
  };

  const openEditRegModal = () => {
    if (!myReg) return;
    setIsEditingReg(true);
    setRegForm({
      name: myReg.name || "",
      phone: myReg.phone || "",
      gender: myReg.gender || "Nam",
      skillLevel: myReg.skillLevel || "Phong trào",
      partnerOrTeamName: myReg.partnerOrTeamName || "",
      note: myReg.note || "",
    });
    setShowRegModal(true);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (isEditingReg) {
        await api.put(`/events/${id}/register`, regForm);
        toast.success("Đã cập nhật thông tin đăng ký!");
      } else {
        await api.post(`/events/${id}/register`, regForm);
        toast.success("Đăng ký tham gia thành công!");
      }
      setShowRegModal(false);
      fetchMyRegistration();
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          (isEditingReg ? "Không cập nhật được phiếu" : "Không đăng ký được"),
      );
    } finally {
      setBusy(false);
      fetchEvent();
    }
  };

  const handleSelfCancel = async (e) => {
    e.preventDefault();
    setCancelling(true);
    try {
      await api.put(`/events/${id}/register/cancel`, {
        reason: cancelReason.trim(),
      });
      toast.success("Đã hủy đăng ký và hoàn lại suất");
      setShowCancelModal(false);
      setCancelReason("");
      setMyReg(null);
      fetchEvent();
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể hủy đăng ký");
    } finally {
      setCancelling(false);
    }
  };

  if (notFound)
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-center">
        <p className="text-gray-500 mb-4">Không tìm thấy sự kiện (hoặc chưa mở).</p>
        <Link to="/events" className="text-blue-600">
          ← Về danh sách giải đấu
        </Link>
      </div>
    );

  if (!ev)
    return <p className="max-w-3xl mx-auto px-4 py-10 text-gray-500">Đang tải...</p>;

  const inputClass =
    "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400";
  const labelClass = "block text-xs font-medium text-gray-700 mb-1";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to="/events" className="inline-flex items-center gap-1 text-sm text-gray-500 mb-4">
        <ArrowLeft size={14} /> Danh sách giải đấu
      </Link>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {ev.posterUrl && (
          <div className="w-full max-h-72 bg-gray-100 overflow-hidden border-b border-gray-200">
            <img
              src={ev.posterUrl}
              alt={ev.name}
              className="w-full h-full max-h-72 object-cover"
            />
          </div>
        )}

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{ev.name}</h1>
              {ev.type?.name && (
                <span className="inline-block mt-1.5 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full">
                  {ev.type.name}
                </span>
              )}
            </div>
            <span className={`shrink-0 text-xs px-2 py-1 rounded-full font-medium ${STATE_BADGE[ev.state]}`}>
              {ev.stateLabel}
            </span>
          </div>

          {ev.type?.note && (
            <p className="mt-2 text-xs text-gray-500 italic">{ev.type.note}</p>
          )}
          {ev.description && (
            <p className="mt-3 text-gray-700 whitespace-pre-line">{ev.description}</p>
          )}

          <div className="mt-4 grid sm:grid-cols-2 gap-2 text-sm text-gray-600">
            <p>
              <CalendarDays size={14} className="inline mr-1" />
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
              {ev.registeredCount}/{ev.maxRegistrations || "∞"} suất
            </p>
          </div>

          {!!ev.sponsors?.length && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-1">Nhà tài trợ</p>
              <div className="flex flex-wrap gap-2">
                {ev.sponsors.map((s) => (
                  <span key={s} className="text-xs bg-gray-100 rounded-full px-2 py-1">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Khu vực hành động đăng ký */}
          <div className="mt-5">
            {myReg ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="font-semibold text-green-800 flex items-center gap-1.5">
                    <CheckCircle size={16} /> Bạn đã đăng ký tham gia sự kiện này
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link to="/my-registrations" className="text-xs text-green-700 underline">
                      Giải đấu của tôi →
                    </Link>
                    {canModifyBeforeDeadline && (
                      <>
                        <button
                          type="button"
                          onClick={openEditRegModal}
                          className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-white border border-amber-200 px-2.5 py-1 rounded-lg hover:bg-amber-50 transition"
                        >
                          <Pencil size={12} /> Sửa phiếu
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCancelReason("");
                            setShowCancelModal(true);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 bg-white border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-50 transition"
                        >
                          <XCircle size={13} /> Hủy đăng ký
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-2 grid sm:grid-cols-2 gap-1 text-xs text-green-900">
                  <p><span className="text-green-700">VĐV:</span> {myReg.name} ({myReg.gender})</p>
                  <p><span className="text-green-700">SĐT:</span> {myReg.phone}</p>
                  <p><span className="text-green-700">Trình độ:</span> {myReg.skillLevel || "Phong trào"}</p>
                  {myReg.partnerOrTeamName && (
                    <p><span className="text-green-700">Đồng đội / Đội:</span> {myReg.partnerOrTeamName}</p>
                  )}
                  {myReg.note && (
                    <p className="sm:col-span-2"><span className="text-green-700">Ghi chú:</span> {myReg.note}</p>
                  )}
                </div>

                {!canModifyBeforeDeadline && ev.state !== "finished" && ev.state !== "cancelled" && (
                  <p className="mt-2 text-xs text-gray-500">
                    Đã quá hạn đăng ký nên không thể tự sửa hoặc hủy. Vui lòng liên hệ Ban tổ chức nếu cần thay đổi.
                  </p>
                )}
              </div>
            ) : ev.state === "open" ? (
              <button
                onClick={openRegisterModal}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-lg transition"
              >
                {!user ? "Đăng nhập để đăng ký" : "Đăng ký tham gia"}
              </button>
            ) : (
              <p className="text-center text-sm text-gray-500 py-2">{ev.stateLabel}</p>
            )}
          </div>
        </div>
      </div>

      {!!ev.results?.length && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mt-4">
          <h2 className="font-bold flex items-center gap-2 mb-3">
            <Trophy size={18} className="text-amber-500" /> Kết quả chung cuộc
          </h2>
          {ev.results.map((r) => (
            <div key={r.rank} className="flex items-center gap-3 py-1.5 border-b border-gray-100 last:border-0">
              <span className="w-8 text-lg">{MEDALS[r.rank] || r.rank}</span>
              <span className="font-medium">{r.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* ===== Modal Form đăng ký / chỉnh sửa phiếu ===== */}
      {showRegModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form
            onSubmit={handleRegisterSubmit}
            className="bg-white rounded-xl w-full max-w-lg p-5 my-4 shadow-xl"
          >
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-gray-200">
              <div>
                <h2 className="font-bold text-lg">
                  {isEditingReg ? "Chỉnh sửa phiếu đăng ký" : "Phiếu đăng ký tham gia"}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {ev.name} {ev.type?.name ? `(${ev.type.name})` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRegModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className={labelClass}>Họ và tên vận động viên *</label>
                <input
                  type="text"
                  required
                  className={inputClass}
                  placeholder="Nhập họ tên đầy đủ"
                  value={regForm.name}
                  onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
                />
              </div>

              <div>
                <label className={labelClass}>Số điện thoại liên hệ *</label>
                <input
                  type="tel"
                  required
                  className={inputClass}
                  placeholder="VD: 0912345678"
                  value={regForm.phone}
                  onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Giới tính</label>
                  <select
                    className={inputClass}
                    value={regForm.gender}
                    onChange={(e) => setRegForm({ ...regForm, gender: e.target.value })}
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Trình độ thi đấu</label>
                  <select
                    className={inputClass}
                    value={regForm.skillLevel}
                    onChange={(e) => setRegForm({ ...regForm, skillLevel: e.target.value })}
                  >
                    <option value="Mới chơi">Mới chơi</option>
                    <option value="Phong trào">Phong trào</option>
                    <option value="Khá">Khá</option>
                    <option value="Bán chuyên">Bán chuyên</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  {isTeamOrDouble
                    ? "Tên đồng đội / Tên đội thi đấu *"
                    : "Tên CLB / Đội (nếu có)"}
                </label>
                <input
                  type="text"
                  required={isTeamOrDouble}
                  className={inputClass}
                  placeholder={
                    isTeamOrDouble
                      ? "VD: Trần Văn B hoặc Đội Cầu Lông Ninh Kiều"
                      : "VD: CLB Cầu lông Cần Thơ"
                  }
                  value={regForm.partnerOrTeamName}
                  onChange={(e) =>
                    setRegForm({ ...regForm, partnerOrTeamName: e.target.value })
                  }
                />
              </div>

              <div>
                <label className={labelClass}>Ghi chú cho Ban tổ chức</label>
                <textarea
                  rows={2}
                  className={inputClass}
                  placeholder="VD: Khung giờ bận, yêu cầu ghép cặp, cỡ áo..."
                  value={regForm.note}
                  onChange={(e) => setRegForm({ ...regForm, note: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowRegModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-60"
              >
                {busy
                  ? "Đang lưu..."
                  : isEditingReg
                    ? "Lưu thay đổi"
                    : "Xác nhận đăng ký"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===== Modal xác nhận tự hủy đăng ký ===== */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleSelfCancel}
            className="bg-white rounded-xl w-full max-w-md p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <h2 className="font-bold text-base text-red-600">Xác nhận hủy đăng ký</h2>
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Bạn chắc chắn muốn hủy tham gia giải <span className="font-semibold">{ev.name}</span>? Suất của bạn sẽ được hoàn lại cho người khác (bạn vẫn có thể đăng ký lại trước hạn nếu còn suất).
            </p>
            <div>
              <label className={labelClass}>Lý do hủy (không bắt buộc)</label>
              <textarea
                rows={2}
                className={inputClass}
                placeholder="VD: Bận việc đột xuất, chấn thương..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50"
              >
                Giữ lại
              </button>
              <button
                type="submit"
                disabled={cancelling}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-60"
              >
                {cancelling ? "Đang hủy..." : "Xác nhận hủy"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}