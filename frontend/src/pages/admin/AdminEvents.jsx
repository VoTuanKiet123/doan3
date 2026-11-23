import { useEffect, useState } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";
import {
  Trophy,
  Plus,
  Pencil,
  Trash2,
  Users,
  X,
  Tag,
  Eye,
  EyeOff,
  Download,
  ImagePlus,
} from "lucide-react";
import { STATE_BADGE, fmtDateTime, toLocalInput } from "../../utils/events";

const EMPTY_FORM = {
  name: "",
  type: "",
  court: "",
  posterUrl: "",
  startDate: "",
  endDate: "",
  registrationDeadline: "",
  maxRegistrations: "0",
  sponsors: "",
  description: "",
  status: "draft",
  results: ["", "", "", "", ""],
};

const csvEscape = (value) => {
  const str = String(value ?? "");
  return `"${str.replace(/"/g, '""')}"`;
};

const toFileSlug = (text) =>
  String(text || "su-kien")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "su-kien";

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [types, setTypes] = useState([]);
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Bộ lọc danh sách sự kiện
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Modal tạo/sửa sự kiện
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [resultSuggestions, setResultSuggestions] = useState([]);

  // Modal thêm/sửa loại sự kiện
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [typeForm, setTypeForm] = useState({ name: "", note: "" });
  const [savingType, setSavingType] = useState(false);

  // Panel danh sách đăng ký
  const [regsFor, setRegsFor] = useState(null);
  const [regs, setRegs] = useState(null);
  const [regStatusFilter, setRegStatusFilter] = useState("all");

  const fetchData = async () => {
    try {
      const [evRes, tyRes, coRes] = await Promise.all([
        api.get("/events/manage"),
        api.get("/event-types?includeInactive=true"),
        api.get("/courts"),
      ]);
      setEvents(evRes.data.events || []);
      setTypes(tyRes.data.types || []);
      setCourts(coRes.data.courts || []);
    } catch {
      toast.error("Không tải được dữ liệu giải đấu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const activeTypes = types.filter((t) => t.isActive);

  const openCreate = () => {
    setEditing(null);
    setResultSuggestions([]);
    setForm({
      ...EMPTY_FORM,
      type: activeTypes[0]?._id || "",
    });
    setShowModal(true);
  };

  const openEdit = (ev) => {
    setEditing(ev);
    setResultSuggestions([]);
    const results = ["", "", "", "", ""];
    (ev.results || []).forEach((r) => {
      if (r.rank >= 1 && r.rank <= 5) results[r.rank - 1] = r.name;
    });
    setForm({
      name: ev.name,
      type: ev.type?._id || "",
      court: ev.court?._id || "",
      posterUrl: ev.posterUrl || "",
      startDate: toLocalInput(ev.startDate),
      endDate: toLocalInput(ev.endDate),
      registrationDeadline: toLocalInput(ev.registrationDeadline),
      maxRegistrations: String(ev.maxRegistrations || 0),
      sponsors: (ev.sponsors || []).join(", "),
      description: ev.description || "",
      status: ev.status,
      results,
    });
    setShowModal(true);

    // Tải ngầm danh sách VĐV đã đăng ký để gợi ý cho 5 ô Top 5 kết quả
    api
      .get(`/events/${ev._id}/registrations`)
      .then((res) => {
        const list = (res.data.registrations || []).filter(
          (r) => r.status === "registered",
        );
        const set = new Set();
        list.forEach((r) => {
          if (r.name) set.add(r.name);
          if (r.partnerOrTeamName) {
            set.add(`${r.name} & ${r.partnerOrTeamName}`);
            set.add(r.partnerOrTeamName);
          }
        });
        setResultSuggestions(Array.from(set));
      })
      .catch(() => {});
  };

  const handlePosterUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file ảnh (JPG, PNG, WEBP, GIF)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh bìa phải nhỏ hơn 5MB");
      return;
    }
    const fd = new FormData();
    fd.append("poster", file);
    setUploadingPoster(true);
    try {
      const res = await api.post("/events/upload-poster", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm((prev) => ({ ...prev, posterUrl: res.data.posterUrl }));
      toast.success("Đã tải ảnh bìa lên");
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi tải ảnh bìa");
    } finally {
      setUploadingPoster(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.type) {
      toast.error("Vui lòng chọn loại sự kiện");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        type: form.type,
        court: form.court || null,
        posterUrl: form.posterUrl || "",
        startDate: form.startDate,
        endDate: form.endDate || null,
        registrationDeadline: form.registrationDeadline,
        maxRegistrations: Number(form.maxRegistrations) || 0,
        sponsors: form.sponsors,
        description: form.description,
        status: form.status,
        results: form.results
          .map((name, i) => ({ rank: i + 1, name }))
          .filter((r) => r.name.trim()),
      };
      if (editing) await api.put(`/events/${editing._id}`, payload);
      else await api.post("/events", payload);
      toast.success(editing ? "Đã cập nhật sự kiện" : "Đã tạo sự kiện");
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi lưu sự kiện");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (ev) => {
    if (!confirm(`Xóa sự kiện "${ev.name}"? (xóa mềm — dữ liệu đăng ký vẫn giữ)`)) return;
    try {
      await api.delete(`/events/${ev._id}`);
      toast.success("Đã xóa sự kiện");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi xóa");
    }
  };

  // ===== Quản lý Loại sự kiện =====
  const openCreateType = () => {
    setEditingType(null);
    setTypeForm({ name: "", note: "" });
    setShowTypeModal(true);
  };

  const openEditType = (ty) => {
    setEditingType(ty);
    setTypeForm({ name: ty.name, note: ty.note || "" });
    setShowTypeModal(true);
  };

  const handleSaveType = async (e) => {
    e.preventDefault();
    if (!typeForm.name.trim()) return;
    setSavingType(true);
    try {
      if (editingType) {
        await api.put(`/event-types/${editingType._id}`, typeForm);
        toast.success("Đã cập nhật loại sự kiện");
      } else {
        const res = await api.post("/event-types", typeForm);
        toast.success("Đã thêm loại sự kiện");
        if (showModal && res.data?.type?._id) {
          setForm((prev) => ({ ...prev, type: res.data.type._id }));
        }
      }
      setShowTypeModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi lưu loại sự kiện");
    } finally {
      setSavingType(false);
    }
  };

  const toggleType = async (ty) => {
    try {
      await api.put(`/event-types/${ty._id}`, { isActive: !ty.isActive });
      toast.success(ty.isActive ? `Đã ẩn "${ty.name}"` : `Đã bật lại "${ty.name}"`);
      fetchData();
    } catch {
      toast.error("Lỗi cập nhật loại sự kiện");
    }
  };

  // ===== Quản lý Danh sách đăng ký =====
  const openRegs = async (ev, keepFilter = false) => {
    setRegsFor(ev);
    setRegs(null);
    if (!keepFilter) setRegStatusFilter("all");
    try {
      const res = await api.get(`/events/${ev._id}/registrations`);
      setRegs(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Không tải được danh sách");
      setRegsFor(null);
    }
  };

  const handleCancelReg = async (reg) => {
    const reason = prompt(`Hủy đăng ký của "${reg.name}" — nhập lý do (bắt buộc):`);
    if (!reason || !reason.trim()) return;
    try {
      await api.put(`/registrations/${reg._id}/cancel`, { reason: reason.trim() });
      toast.success("Đã hủy đăng ký, hoàn 1 slot");
      openRegs(regsFor, true);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi hủy đăng ký");
    }
  };

  const visibleRegs = (regs?.registrations || []).filter((r) => {
    if (regStatusFilter === "all") return true;
    return r.status === regStatusFilter;
  });

  const handleExportCSV = () => {
    if (!visibleRegs.length) {
      toast.error("Không có dữ liệu vận động viên để xuất");
      return;
    }

    const headers = [
      "STT",
      "Họ và tên",
      "Giới tính",
      "Số điện thoại",
      "Trình độ",
      "Đồng đội / Đội",
      "Ghi chú",
      "Thời gian đăng ký",
      "Trạng thái",
      "Lý do hủy",
    ];

    const rows = visibleRegs.map((r, idx) => [
      idx + 1,
      r.name || "",
      r.gender || "Nam",
      r.phone ? `="${r.phone}"` : "",
      r.skillLevel || "Phong trào",
      r.partnerOrTeamName || "",
      r.note || "",
      fmtDateTime(r.createdAt),
      r.status === "cancelled" ? "Đã hủy" : "Đã đăng ký",
      r.cancelNote || "",
    ]);

    const csvLines = [
      headers.map(csvEscape).join(","),
      ...rows.map((row) => row.map(csvEscape).join(",")),
    ];

    const blob = new Blob(["\uFEFF" + csvLines.join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `danh-sach-vdv-${toFileSlug(regsFor?.name)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Đã xuất ${visibleRegs.length} dòng ra file CSV`);
  };

  const filteredEvents = events.filter((ev) => {
    if (filterType && ev.type?._id !== filterType) return false;
    if (filterStatus && ev.status !== filterStatus) return false;
    return true;
  });

  const input = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm";
  const label = "block text-xs font-medium text-gray-600 mb-1";

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Trophy size={22} className="text-amber-500" /> Quản lý giải đấu & Sự kiện
        </h1>
        <button
          onClick={openCreate}
          className="bg-amber-500 hover:bg-amber-600 text-white font-medium px-4 py-2 rounded-lg text-sm flex items-center gap-1"
        >
          <Plus size={16} /> Tạo sự kiện
        </button>
      </div>

      {/* ===== Khung quản lý Phân loại sự kiện ===== */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
        <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
          <div>
            <h2 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
              <Tag size={15} className="text-amber-500" /> Phân loại sự kiện ({types.length})
            </h2>
            <p className="text-xs text-gray-500">
              Danh mục thể thức dùng để phân loại giải đấu khi tạo sự kiện mới.
            </p>
          </div>
          <button
            onClick={openCreateType}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 flex items-center gap-1"
          >
            <Plus size={14} /> Thêm loại sự kiện
          </button>
        </div>

        {types.length === 0 ? (
          <p className="text-xs text-gray-400">Chưa có phân loại sự kiện nào.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {types.map((ty) => (
              <div
                key={ty._id}
                className={`rounded-lg border p-2.5 flex items-start justify-between gap-2 ${
                  ty.isActive
                    ? "bg-gray-50/70 border-gray-200"
                    : "bg-gray-100/60 border-gray-300 border-dashed opacity-65"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p
                      className={`text-sm font-semibold truncate ${
                        !ty.isActive ? "line-through text-gray-500" : "text-gray-800"
                      }`}
                    >
                      {ty.name}
                    </p>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                        ty.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {ty.isActive ? "Đang dùng" : "Đã ẩn"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                    {ty.note || "Chưa có mô tả thể thức"}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEditType(ty)}
                    title="Sửa loại sự kiện"
                    className="p-1 rounded hover:bg-white text-gray-600"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => toggleType(ty)}
                    title={ty.isActive ? "Ẩn loại này" : "Bật lại loại này"}
                    className="p-1 rounded hover:bg-white text-gray-600"
                  >
                    {ty.isActive ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== Thanh lọc sự kiện ===== */}
      <div className="flex items-center gap-3 flex-wrap mb-3">
        <select
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="">Tất cả loại sự kiện</option>
          {types.map((ty) => (
            <option key={ty._id} value={ty._id}>
              {ty.name}
            </option>
          ))}
        </select>

        <select
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="published">Công khai</option>
          <option value="draft">Bản nháp</option>
          <option value="cancelled">Đã hủy</option>
        </select>
      </div>

      {loading ? (
        <p className="text-gray-500">Đang tải...</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2">Sự kiện</th>
                <th className="px-3 py-2 whitespace-nowrap">Loại sự kiện</th>
                <th className="px-3 py-2 whitespace-nowrap">Diễn ra</th>
                <th className="px-3 py-2 whitespace-nowrap">Hạn đăng ký</th>
                <th className="px-3 py-2 whitespace-nowrap">Đã đăng ký</th>
                <th className="px-3 py-2">Trạng thái</th>
                <th className="px-3 py-2">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((ev) => (
                <tr key={ev._id} className="border-t border-gray-200">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2.5">
                      {ev.posterUrl && (
                        <img
                          src={ev.posterUrl}
                          alt={ev.name}
                          className="w-12 h-8 rounded object-cover border border-gray-200 shrink-0"
                        />
                      )}
                      <div>
                        <p className="font-medium">{ev.name}</p>
                        {ev.court?.name && (
                          <p className="text-xs text-gray-400">{ev.court.name}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {ev.type?.name ? (
                      <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                        {ev.type.name}
                      </span>
                    ) : (
                      <span className="text-xs text-red-500 italic">Chưa phân loại</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtDateTime(ev.startDate)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtDateTime(ev.registrationDeadline)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {ev.registeredCount}/{ev.maxRegistrations || "∞"}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATE_BADGE[ev.state]}`}>
                      {ev.stateLabel}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(ev)} title="Sửa" className="p-1.5 rounded hover:bg-gray-100">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => openRegs(ev)} title="Danh sách đăng ký" className="p-1.5 rounded hover:bg-gray-100">
                        <Users size={15} />
                      </button>
                      <button onClick={() => handleDelete(ev)} title="Xóa" className="p-1.5 rounded hover:bg-red-50 text-red-500">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredEvents.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-gray-400">
                    Không có sự kiện nào phù hợp
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== Modal tạo/sửa sự kiện ===== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl w-full max-w-2xl p-5 my-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">{editing ? "Sửa sự kiện" : "Tạo sự kiện"}</h2>
              <button type="button" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className={label}>Tên sự kiện *</label>
                <input
                  className={input}
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              {/* Khu vực tải ảnh bìa (Poster) */}
              <div className="sm:col-span-2">
                <label className={label}>Ảnh bìa / Poster giải đấu (tối đa 5MB)</label>
                {form.posterUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                    <img
                      src={form.posterUrl}
                      alt="Poster preview"
                      className="w-full h-44 object-cover"
                    />
                    <div className="absolute top-2 right-2 flex gap-1.5">
                      <label className="cursor-pointer bg-white/90 hover:bg-white text-gray-800 text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-sm border border-gray-200">
                        {uploadingPoster ? "Đang tải..." : "Đổi ảnh"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingPoster}
                          onChange={handlePosterUpload}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, posterUrl: "" }))}
                        className="bg-red-600/90 hover:bg-red-600 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-sm"
                      >
                        Gỡ ảnh
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-gray-300 rounded-xl p-5 cursor-pointer hover:border-amber-400 hover:bg-amber-50/40 transition">
                    <ImagePlus size={24} className="text-gray-400" />
                    <span className="text-xs font-medium text-gray-600">
                      {uploadingPoster
                        ? "Đang tải ảnh lên..."
                        : "Bấm để chọn ảnh bìa (JPG, PNG, WEBP)"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingPoster}
                      onChange={handlePosterUpload}
                    />
                  </label>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-600">Loại sự kiện *</label>
                  <button
                    type="button"
                    onClick={openCreateType}
                    className="text-[11px] text-amber-600 hover:underline font-medium"
                  >
                    + Tạo loại mới
                  </button>
                </div>
                <select
                  className={input}
                  required
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="">— Chọn loại sự kiện —</option>
                  {types
                    .filter((ty) => ty.isActive || ty._id === form.type)
                    .map((ty) => (
                      <option key={ty._id} value={ty._id}>
                        {ty.name} {!ty.isActive ? "(đang ẩn)" : ""}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className={label}>Địa điểm (sân)</label>
                <select
                  className={input}
                  value={form.court}
                  onChange={(e) => setForm({ ...form, court: e.target.value })}
                >
                  <option value="">— Không xác định —</option>
                  {courts.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>Bắt đầu *</label>
                <input
                  type="datetime-local"
                  className={input}
                  required
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className={label}>Kết thúc (nếu nhiều ngày/khung giờ)</label>
                <input
                  type="datetime-local"
                  className={input}
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
              <div>
                <label className={label}>Hạn đăng ký * (phải trước ngày bắt đầu)</label>
                <input
                  type="datetime-local"
                  className={input}
                  required
                  value={form.registrationDeadline}
                  onChange={(e) => setForm({ ...form, registrationDeadline: e.target.value })}
                />
              </div>
              <div>
                <label className={label}>Giới hạn người đăng ký (0 = không giới hạn)</label>
                <input
                  type="number"
                  min="0"
                  className={input}
                  value={form.maxRegistrations}
                  onChange={(e) => setForm({ ...form, maxRegistrations: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Nhà tài trợ (cách nhau bằng dấu phẩy)</label>
                <input
                  className={input}
                  placeholder="VD: Yonex Việt Nam, Thành Long Sport"
                  value={form.sponsors}
                  onChange={(e) => setForm({ ...form, sponsors: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Mô tả</label>
                <textarea
                  className={input}
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <label className={label}>Trạng thái</label>
                <select
                  className={input}
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="draft">Nháp (ẩn với khách)</option>
                  <option value="published">Công khai</option>
                  <option value="cancelled">Hủy sự kiện</option>
                </select>
              </div>
            </div>

            {/* Top 5 kết quả chung cuộc + datalist gợi ý từ danh sách VĐV đã đăng ký */}
            <div className="mt-4">
              <div className="flex items-center justify-between gap-2 mb-1">
                <label className="text-xs font-medium text-gray-600">
                  Kết quả chung cuộc — Top 5 (để trống nếu chưa có)
                </label>
                {resultSuggestions.length > 0 && (
                  <span className="text-[11px] text-amber-700">
                    Có {resultSuggestions.length} gợi ý từ VĐV/đội đã đăng ký
                  </span>
                )}
              </div>

              <datalist id="event-result-suggestions">
                {resultSuggestions.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>

              {form.results.map((name, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <span className="w-10 text-center">{["🥇", "🥈", "🥉", "4", "5"][i]}</span>
                  <input
                    list="event-result-suggestions"
                    className={input}
                    placeholder={`Hạng ${i + 1} — gõ tay hoặc chọn VĐV/đội đã đăng ký`}
                    value={name}
                    onChange={(e) => {
                      const results = [...form.results];
                      results[i] = e.target.value;
                      setForm({ ...form, results });
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={submitting || uploadingPoster}
                className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium disabled:opacity-60"
              >
                {submitting ? "Đang lưu..." : "Lưu sự kiện"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===== Modal Thêm / Sửa Loại sự kiện ===== */}
      {showTypeModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[60]">
          <form onSubmit={handleSaveType} className="bg-white rounded-xl w-full max-w-md p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-base">
                {editingType ? "Sửa loại sự kiện" : "Thêm loại sự kiện mới"}
              </h3>
              <button type="button" onClick={() => setShowTypeModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={label}>Tên loại sự kiện *</label>
                <input
                  required
                  className={input}
                  placeholder="VD: Giải đôi nam nữ, Giải sinh viên..."
                  value={typeForm.name}
                  onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className={label}>Mô tả thể thức</label>
                <textarea
                  rows={2}
                  className={input}
                  placeholder="VD: Thi đấu theo cặp 2 VĐV, chia bảng đánh vòng tròn..."
                  value={typeForm.note}
                  onChange={(e) => setTypeForm({ ...typeForm, note: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setShowTypeModal(false)}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={savingType}
                className="px-4 py-1.5 rounded-lg bg-amber-500 text-white text-sm font-medium disabled:opacity-60"
              >
                {savingType ? "Đang lưu..." : "Lưu loại"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===== Modal danh sách đăng ký (có lọc + Xuất Excel CSV) ===== */}
      {regsFor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl p-5 max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
              <div>
                <h2 className="font-bold">Danh sách đăng ký — {regsFor.name}</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {regs
                    ? `Đang giữ suất: ${regs.registeredCount}/${regs.maxRegistrations || "∞"} · Tổng lịch sử đơn: ${regs.registrations.length}`
                    : "Đang tải dữ liệu..."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {regs && (
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    disabled={visibleRegs.length === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium disabled:opacity-50 transition"
                  >
                    <Download size={14} /> Xuất Excel (.csv)
                  </button>
                )}
                <button onClick={() => setRegsFor(null)} className="p-1 text-gray-500 hover:text-gray-700">
                  <X size={20} />
                </button>
              </div>
            </div>

            {regs && regs.registrations.length > 0 && (
              <div className="flex items-center gap-2 mb-3">
                {[
                  { key: "all", label: `Tất cả (${regs.registrations.length})` },
                  {
                    key: "registered",
                    label: `Đã đăng ký (${regs.registrations.filter((r) => r.status === "registered").length})`,
                  },
                  {
                    key: "cancelled",
                    label: `Đã hủy (${regs.registrations.filter((r) => r.status === "cancelled").length})`,
                  },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setRegStatusFilter(tab.key)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
                      regStatusFilter === tab.key
                        ? "bg-amber-500 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}

            <div className="overflow-y-auto flex-1">
              {!regs ? (
                <p className="text-gray-500 text-sm">Đang tải...</p>
              ) : visibleRegs.length === 0 ? (
                <p className="text-gray-400 text-sm py-4 text-center">
                  Không có đăng ký nào trong mục này.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-gray-500 bg-gray-50">
                    <tr>
                      <th className="py-2 px-2">Vận động viên</th>
                      <th className="py-2 px-2">SĐT</th>
                      <th className="py-2 px-2">Trình độ</th>
                      <th className="py-2 px-2">Đồng đội / Đội</th>
                      <th className="py-2 px-2">Ghi chú</th>
                      <th className="py-2 px-2">Lúc ĐK</th>
                      <th className="py-2 px-2">Trạng thái</th>
                      <th className="py-2 px-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRegs.map((r) => (
                      <tr key={r._id} className="border-t border-gray-200 align-top">
                        <td className="py-2 px-2">
                          <p className="font-medium">{r.name}</p>
                          <p className="text-xs text-gray-400">{r.gender || "Nam"}</p>
                        </td>
                        <td className="py-2 px-2 whitespace-nowrap">{r.phone || "—"}</td>
                        <td className="py-2 px-2 whitespace-nowrap">
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                            {r.skillLevel || "Phong trào"}
                          </span>
                        </td>
                        <td className="py-2 px-2">{r.partnerOrTeamName || "—"}</td>
                        <td className="py-2 px-2 text-xs text-gray-600 max-w-[180px]">
                          {r.note || "—"}
                        </td>
                        <td className="py-2 px-2 whitespace-nowrap text-xs text-gray-500">
                          {fmtDateTime(r.createdAt)}
                        </td>
                        <td className="py-2 px-2">
                          {r.status === "cancelled" ? (
                            <span className="text-xs text-red-600">
                              Đã hủy{r.cancelNote ? ` (${r.cancelNote})` : ""}
                            </span>
                          ) : (
                            <span className="text-xs text-green-700 font-medium">Đã đăng ký</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right">
                          {r.status === "registered" && (
                            <button
                              onClick={() => handleCancelReg(r)}
                              className="text-xs text-red-500 hover:underline"
                            >
                              Hủy
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}