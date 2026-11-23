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
} from "lucide-react";
import { STATE_BADGE, fmtDateTime, toLocalInput } from "../../utils/events";

const EMPTY_FORM = {
  name: "",
  type: "",
  court: "",
  startDate: "",
  endDate: "",
  registrationDeadline: "",
  maxRegistrations: "0",
  sponsors: "",
  description: "",
  status: "draft",
  results: ["", "", "", "", ""],
};

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [types, setTypes] = useState([]);
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  // Panel danh sách đăng ký
  const [regsFor, setRegsFor] = useState(null); // event
  const [regs, setRegs] = useState(null);

  const fetchData = async () => {
    try {
      const [evRes, tyRes, coRes] = await Promise.all([
        api.get("/events/manage"),
        api.get("/event-types"),
        api.get("/courts"),
      ]);
      setEvents(evRes.data.events);
      setTypes(tyRes.data.types);
      setCourts(coRes.data.courts);
    } catch {
      toast.error("Không tải được dữ liệu giải đấu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (ev) => {
    setEditing(ev);
    const results = ["", "", "", "", ""];
    (ev.results || []).forEach((r) => {
      if (r.rank >= 1 && r.rank <= 5) results[r.rank - 1] = r.name;
    });
    setForm({
      name: ev.name,
      type: ev.type?._id || "",
      court: ev.court?._id || "",
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        type: form.type || null,
        court: form.court || null,
        startDate: form.startDate,
        endDate: form.endDate || null,
        registrationDeadline: form.registrationDeadline,
        maxRegistrations: Number(form.maxRegistrations) || 0,
        sponsors: form.sponsors, // chuỗi thô — backend split + dedup
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

  const openRegs = async (ev) => {
    setRegsFor(ev);
    setRegs(null);
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
      openRegs(regsFor);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi hủy đăng ký");
    }
  };

  const addType = async () => {
    const name = prompt("Tên loại sự kiện mới:");
    if (!name || !name.trim()) return;
    try {
      await api.post("/event-types", { name: name.trim() });
      toast.success("Đã thêm loại sự kiện");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi thêm loại");
    }
  };

  const toggleType = async (ty) => {
    try {
      await api.put(`/event-types/${ty._id}`, { isActive: !ty.isActive });
      fetchData();
    } catch {
      toast.error("Lỗi cập nhật loại sự kiện");
    }
  };

  const input = "w-full border rounded-lg px-3 py-2 text-sm";
  const label = "block text-xs font-medium text-gray-600 mb-1";

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Trophy size={22} className="text-amber-500" /> Quản lý giải đấu
        </h1>
        <button onClick={openCreate} className="bg-amber-500 hover:bg-amber-600 text-white font-medium px-4 py-2 rounded-lg text-sm flex items-center gap-1">
          <Plus size={16} /> Tạo sự kiện
        </button>
      </div>

      {/* Loại sự kiện — quản lý gọn trong trang */}
      <div className="flex items-center gap-2 flex-wrap mb-4 text-sm">
        <Tag size={14} className="text-gray-500" />
        {types.map((ty) => (
          <button
            key={ty._id}
            onClick={() => toggleType(ty)}
            title="Bấm để ẩn/hiện"
            className={`px-2 py-1 rounded-full text-xs ${ty.isActive ? "bg-gray-200 text-gray-700" : "bg-gray-100 text-gray-400 line-through"}`}
          >
            {ty.name}
          </button>
        ))}
        <button onClick={addType} className="px-2 py-1 rounded-full text-xs border border-dashed hover:bg-gray-50">
          + Thêm loại
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Đang tải...</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2">Sự kiện</th>
                <th className="px-3 py-2 whitespace-nowrap">Diễn ra</th>
                <th className="px-3 py-2 whitespace-nowrap">Hạn đăng ký</th>
                <th className="px-3 py-2 whitespace-nowrap">Đã đăng ký</th>
                <th className="px-3 py-2">Trạng thái</th>
                <th className="px-3 py-2">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev._id} className="border-t">
                  <td className="px-3 py-2">
                    <p className="font-medium">{ev.name}</p>
                    <p className="text-xs text-gray-400">{ev.type?.name}{ev.court?.name ? ` · ${ev.court.name}` : ""}</p>
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
                      <button onClick={() => openEdit(ev)} title="Sửa" className="p-1.5 rounded hover:bg-gray-100"><Pencil size={15} /></button>
                      <button onClick={() => openRegs(ev)} title="Danh sách đăng ký" className="p-1.5 rounded hover:bg-gray-100"><Users size={15} /></button>
                      <button onClick={() => handleDelete(ev)} title="Xóa" className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400">Chưa có sự kiện nào</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== Modal tạo/sửa ===== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl w-full max-w-2xl p-5 my-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">{editing ? "Sửa sự kiện" : "Tạo sự kiện"}</h2>
              <button type="button" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className={label}>Tên sự kiện *</label>
                <input className={input} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className={label}>Loại sự kiện</label>
                <select className={input} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="">— Chọn loại —</option>
                  {types.map((ty) => <option key={ty._id} value={ty._id}>{ty.name}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Địa điểm (sân)</label>
                <select className={input} value={form.court} onChange={(e) => setForm({ ...form, court: e.target.value })}>
                  <option value="">— Không xác định —</option>
                  {courts.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Bắt đầu *</label>
                <input type="datetime-local" className={input} required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div>
                <label className={label}>Kết thúc (nếu nhiều ngày/khung giờ)</label>
                <input type="datetime-local" className={input} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
              <div>
                <label className={label}>Hạn đăng ký * (phải trước ngày bắt đầu)</label>
                <input type="datetime-local" className={input} required value={form.registrationDeadline} onChange={(e) => setForm({ ...form, registrationDeadline: e.target.value })} />
              </div>
              <div>
                <label className={label}>Giới hạn người đăng ký (0 = không giới hạn)</label>
                <input type="number" min="0" className={input} value={form.maxRegistrations} onChange={(e) => setForm({ ...form, maxRegistrations: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Nhà tài trợ (cách nhau bằng dấu phẩy)</label>
                <input className={input} placeholder="VD: Yonex Việt Nam, Thành Long Sport" value={form.sponsors} onChange={(e) => setForm({ ...form, sponsors: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>Mô tả</label>
                <textarea className={input} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <label className={label}>Trạng thái</label>
                <select className={input} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="draft">Nháp (ẩn với khách)</option>
                  <option value="published">Công khai</option>
                  <option value="cancelled">Hủy sự kiện</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className={label}>Kết quả chung cuộc — Top 5 (để trống nếu chưa có)</label>
              {form.results.map((name, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <span className="w-10 text-center">{["🥇", "🥈", "🥉", "4", "5"][i]}</span>
                  <input
                    className={input}
                    placeholder={`Hạng ${i + 1} — tên vận động viên/đội`}
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
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg border text-sm">Hủy bỏ</button>
              <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium disabled:opacity-60">
                {submitting ? "Đang lưu..." : "Lưu sự kiện"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===== Modal danh sách đăng ký ===== */}
      {regsFor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl p-5 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold">
                Đăng ký — {regsFor.name}
                <span className="text-sm font-normal text-gray-500 ml-2">
                  {regs ? `${regs.registeredCount}/${regs.maxRegistrations || "∞"} suất` : ""}
                </span>
              </h2>
              <button onClick={() => setRegsFor(null)}><X size={20} /></button>
            </div>
            <div className="overflow-y-auto flex-1">
              {!regs ? (
                <p className="text-gray-500 text-sm">Đang tải...</p>
              ) : regs.registrations.length === 0 ? (
                <p className="text-gray-400 text-sm">Chưa ai đăng ký.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-gray-500">
                    <tr>
                      <th className="py-1 pr-2">Họ tên</th>
                      <th className="py-1 pr-2">SĐT</th>
                      <th className="py-1 pr-2">Lúc</th>
                      <th className="py-1">Trạng thái</th>
                      <th className="py-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {regs.registrations.map((r) => (
                      <tr key={r._id} className="border-t">
                        <td className="py-1.5 pr-2">{r.name}</td>
                        <td className="py-1.5 pr-2">{r.phone || "—"}</td>
                        <td className="py-1.5 pr-2 whitespace-nowrap">{fmtDateTime(r.createdAt)}</td>
                        <td className="py-1.5">
                          {r.status === "cancelled" ? (
                            <span className="text-xs text-red-600">Đã hủy{r.cancelNote ? ` (${r.cancelNote})` : ""}</span>
                          ) : (
                            <span className="text-xs text-green-700">Đã đăng ký</span>
                          )}
                        </td>
                        <td className="py-1.5 text-right">
                          {r.status === "registered" && (
                            <button onClick={() => handleCancelReg(r)} className="text-xs text-red-500 hover:underline">Hủy</button>
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
