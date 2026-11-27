import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  Trophy,
  CalendarDays,
  XCircle,
  CheckCircle,
  Pencil,
  X,
} from "lucide-react";
import { STATE_BADGE, fmtDateTime } from "../utils/events";

export default function MyRegistrationsPage() {
  const [items, setItems] = useState(null);

  // Modal tự hủy
  const [cancellingItem, setCancellingItem] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Modal chỉnh sửa phiếu đăng ký
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    gender: "Nam",
    skillLevel: "Phong trào",
    partnerOrTeamName: "",
    note: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchMine = () => {
    api
      .get("/registrations/mine")
      .then((res) => setItems(res.data.registrations || []))
      .catch(() => toast.error("Không tải được danh sách đăng ký"));
  };

  useEffect(() => {
    fetchMine();
  }, []);

  const canModifyBeforeDeadline = (r) => {
    if (r.status !== "registered" || !r.event) return false;
    if (r.event.status !== "published") return false;
    const now = new Date();
    if (
      r.event.registrationDeadline &&
      now > new Date(r.event.registrationDeadline)
    )
      return false;
    if (r.event.startDate && now > new Date(r.event.startDate)) return false;
    return true;
  };

  const openEditModal = (r) => {
    setEditingItem(r);
    setEditForm({
      name: r.name || "",
      phone: r.phone || "",
      gender: r.gender || "Nam",
      skillLevel: r.skillLevel || "Phong trào",
      partnerOrTeamName: r.partnerOrTeamName || "",
      note: r.note || "",
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    setSavingEdit(true);
    try {
      await api.put(`/events/${editingItem.event._id}/register`, editForm);
      toast.success("Đã cập nhật phiếu đăng ký");
      setEditingItem(null);
      fetchMine();
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể cập nhật phiếu");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmCancel = async (e) => {
    e.preventDefault();
    if (!cancellingItem) return;
    setSubmitting(true);
    try {
      await api.put(`/events/${cancellingItem.event._id}/register/cancel`, {
        reason: cancelReason.trim(),
      });
      toast.success("Đã hủy đăng ký thành công");
      setCancellingItem(null);
      setCancelReason("");
      fetchMine();
    } catch (err) {
      toast.error(err.response?.data?.message || "Không thể hủy đăng ký");
    } finally {
      setSubmitting(false);
    }
  };

  const isEditingDoubleOrTeam = /đôi|đội/i.test(
    editingItem?.event?.type?.name || "",
  );
  const inputClass =
    "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500";
  const labelClass = "block text-xs font-medium text-gray-700 mb-1";

  const activeCount = (items || []).filter((r) => r.status === "registered").length;

  return (
    <div className="min-h-[70vh] bg-[#f8faf8]">
      {/* Banner xanh lá đồng bộ */}
      <div className="bg-gradient-to-r from-[#2d5a3d] to-[#3f7d58] text-white">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2.5">
            <Trophy size={26} /> Giải đấu của tôi
          </h1>
          <p className="text-sm text-white/80 mt-1">
            {items === null
              ? "Đang tải lịch sử đăng ký..."
              : `${items.length} phiếu đăng ký · ${activeCount} giải đang tham gia`}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {items === null ? (
          <p className="text-gray-500">Đang tải...</p>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500 mb-3">Bạn chưa đăng ký giải đấu nào.</p>
            <Link
              to="/events"
              className="inline-block px-4 py-2 rounded-lg bg-[#2d5a3d] hover:bg-[#234730] text-white text-sm font-medium"
            >
              Khám phá giải đấu →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((r) => (
              <div
                key={r._id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      to={`/events/${r.event._id}`}
                      className="font-bold text-gray-900 hover:text-emerald-700"
                    >
                      {r.event.name}
                    </Link>
                    {r.event.type?.name && (
                      <span className="ml-2 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                        {r.event.type.name}
                      </span>
                    )}
                  </div>
                  <span
                    className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${STATE_BADGE[r.event.state]}`}
                  >
                    {r.event.stateLabel}
                  </span>
                </div>

                <p className="text-sm text-gray-500 mt-1">
                  <CalendarDays size={14} className="inline mr-1" />
                  Diễn ra: {fmtDateTime(r.event.startDate)}
                  <span className="mx-2">·</span>
                  Hạn ĐK: {fmtDateTime(r.event.registrationDeadline)}
                </p>

                {/* Thông tin phiếu đã đăng ký */}
                <div className="mt-2.5 pt-2.5 border-t border-gray-100 grid sm:grid-cols-2 gap-1 text-xs text-gray-600">
                  <p>
                    <span className="text-gray-400">VĐV:</span> {r.name} (
                    {r.gender || "Nam"})
                  </p>
                  <p>
                    <span className="text-gray-400">SĐT:</span> {r.phone || "—"}
                  </p>
                  <p>
                    <span className="text-gray-400">Trình độ:</span>{" "}
                    {r.skillLevel || "Phong trào"}
                  </p>
                  {r.partnerOrTeamName && (
                    <p>
                      <span className="text-gray-400">Đồng đội / Đội:</span>{" "}
                      {r.partnerOrTeamName}
                    </p>
                  )}
                  {r.note && (
                    <p className="sm:col-span-2">
                      <span className="text-gray-400">Ghi chú:</span> {r.note}
                    </p>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                  {r.status === "cancelled" ? (
                    <p className="text-sm text-red-600">
                      <XCircle size={14} className="inline mr-1" />
                      Đăng ký đã hủy{r.cancelNote ? `: ${r.cancelNote}` : ""}
                    </p>
                  ) : (
                    <p className="text-sm text-green-600">
                      <CheckCircle size={14} className="inline mr-1" />
                      Đã đăng ký ({fmtDateTime(r.createdAt)})
                    </p>
                  )}

                  {canModifyBeforeDeadline(r) && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(r)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition"
                      >
                        <Pencil size={12} /> Sửa phiếu
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCancellingItem(r);
                          setCancelReason("");
                        }}
                        className="inline-flex items-center gap-1 text-xs font-medium text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition"
                      >
                        <XCircle size={13} /> Hủy đăng ký
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal chỉnh sửa phiếu đăng ký */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form
            onSubmit={handleSaveEdit}
            className="bg-white rounded-xl w-full max-w-lg p-5 my-4 shadow-xl"
          >
            <div className="flex items-start justify-between gap-2 pb-3 border-b border-gray-200">
              <div>
                <h2 className="font-bold text-lg">Chỉnh sửa phiếu đăng ký</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {editingItem.event.name}
                  {editingItem.event.type?.name
                    ? ` (${editingItem.event.type.name})`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
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
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                />
              </div>

              <div>
                <label className={labelClass}>Số điện thoại liên hệ *</label>
                <input
                  type="tel"
                  required
                  className={inputClass}
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Giới tính</label>
                  <select
                    className={inputClass}
                    value={editForm.gender}
                    onChange={(e) =>
                      setEditForm({ ...editForm, gender: e.target.value })
                    }
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
                    value={editForm.skillLevel}
                    onChange={(e) =>
                      setEditForm({ ...editForm, skillLevel: e.target.value })
                    }
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
                  {isEditingDoubleOrTeam
                    ? "Tên đồng đội / Tên đội thi đấu *"
                    : "Tên CLB / Đội (nếu có)"}
                </label>
                <input
                  type="text"
                  required={isEditingDoubleOrTeam}
                  className={inputClass}
                  value={editForm.partnerOrTeamName}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      partnerOrTeamName: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className={labelClass}>Ghi chú cho Ban tổ chức</label>
                <textarea
                  rows={2}
                  className={inputClass}
                  value={editForm.note}
                  onChange={(e) =>
                    setEditForm({ ...editForm, note: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="px-5 py-2 rounded-lg bg-[#2d5a3d] hover:bg-[#234730] text-white text-sm font-semibold disabled:opacity-60"
              >
                {savingEdit ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal xác nhận tự hủy đăng ký */}
      {cancellingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleConfirmCancel}
            className="bg-white rounded-xl w-full max-w-md p-5 shadow-xl"
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <h2 className="font-bold text-base text-red-600">
                Xác nhận hủy đăng ký
              </h2>
              <button
                type="button"
                onClick={() => setCancellingItem(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Hủy suất tham gia giải{" "}
              <span className="font-semibold">{cancellingItem.event.name}</span>?
            </p>
            <div>
              <label className={labelClass}>Lý do hủy (không bắt buộc)</label>
              <textarea
                rows={2}
                className={inputClass}
                placeholder="VD: Bận việc đột xuất..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setCancellingItem(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50"
              >
                Giữ lại
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-60"
              >
                {submitting ? "Đang hủy..." : "Xác nhận hủy"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}