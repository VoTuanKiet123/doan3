import { useEffect, useState } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";
import {
  Wrench,
  Play,
  Pause,
  CheckCircle,
  Plus,
  X,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ClipboardCheck,
} from "lucide-react";
import {
  CATEGORY_MAP,
  PRIORITY_MAP,
} from "../admin/maintenanceMaps";

const PRIORITY_BADGE = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-blue-100 text-blue-700",
  low: "bg-slate-100 text-slate-600",
};

export default function POSMaintenance() {
  const [queue, setQueue] = useState({ tickets: [], reportsWaitingTicket: [], acceptanceTasks: [] });
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [logs, setLogs] = useState([]); // nhật ký của phiếu đang mở panel
  const [draft, setDraft] = useState(null); // { logId, steps[], materials[], laborCost, materialCost, otherCost, workDone, note }
  const [saving, setSaving] = useState(false);
  const [newStep, setNewStep] = useState("");
  const [newMat, setNewMat] = useState({ name: "", qty: 1, unitCost: 0 });

  // ===== N2.10: kiểm tra lại sau sửa (acceptance) =====
  const [templates, setTemplates] = useState([]);
  const [accOpen, setAccOpen] = useState(null); // ticket đang mở panel nghiệm thu
  const [accItemRes, setAccItemRes] = useState({}); // tplId -> "ok" | "fail"
  const [accResult, setAccResult] = useState("pass");
  const [accFailReason, setAccFailReason] = useState("");
  const [accNote, setAccNote] = useState("");
  const [accSubmitting, setAccSubmitting] = useState(false);

  useEffect(() => {
    api
      .get("/inspections/checklist")
      .then((res) => setTemplates(res.data.items || []))
      .catch(() => {});
  }, []);

  const openAcceptance = (t) => {
    setAccOpen(accOpen?._id === t._id ? null : t);
    setAccItemRes({});
    setAccResult("pass");
    setAccFailReason("");
    setAccNote("");
  };

  const submitAcceptance = async () => {
    if (accResult === "fail" && !accFailReason.trim()) {
      toast.error("Không đạt thì phải ghi lý do");
      return;
    }
    const catTemplates = templates.filter((tpl) => tpl.category === accOpen.category);
    const useTemplates = catTemplates.length > 0 ? catTemplates : templates;
    const items = useTemplates.map((tpl) => ({
      item: tpl.item,
      category: tpl.category,
      result: accItemRes[tpl._id] || "ok",
    }));
    // một mục Hỏng ⇒ tổng bắt buộc là không đạt (chống quên tick)
    if (items.some((i) => i.result === "fail") && accResult !== "fail") {
      toast.error("Có mục Hỏng — chọn kết quả tổng là KHÔNG ĐẠT");
      return;
    }
    setAccSubmitting(true);
    try {
      const res = await api.post("/inspections/acceptance", {
        ticketId: accOpen._id,
        items,
        result: accResult,
        failReason: accResult === "fail" ? accFailReason.trim() : undefined,
        note: accNote.trim() || undefined,
      });
      toast.success(res.data.message);
      setAccOpen(null);
      fetchQueue();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi gửi nghiệm thu");
    } finally {
      setAccSubmitting(false);
    }
  };

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await api.get("/maintenance-logs/queue");
      setQueue(res.data);
    } catch (err) {
      toast.error("Lỗi tải hàng đợi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  // Nạp ca đang mở vào draft (chỉ của MÌNH — ca người khác để chế độ đọc)
  const draftFrom = (log) => ({
    logId: log._id,
    steps: log.steps || [],
    materials: log.materialsUsed || [],
    laborCost: log.laborCost || 0,
    materialCost: log.materialCost || 0,
    otherCost: log.otherCost || 0,
    workDone: log.workDone || "",
    note: log.note || "",
  });

  const loadLogs = async (ticketId, editable) => {
    const res = await api.get("/maintenance-logs", {
      params: { ticket: ticketId },
    });
    setLogs(res.data.logs);
    const open = res.data.logs.find((l) => l.status === "open");
    setDraft(editable && open ? draftFrom(open) : null);
  };

  const openPanel = async (ticket) => {
    if (expandedId === ticket._id) {
      setExpandedId(null);
      setDraft(null);
      return;
    }
    setExpandedId(ticket._id);
    try {
      await loadLogs(ticket._id, ticket.openByMe);
    } catch {
      setLogs([]);
      setDraft(null);
    }
  };

  const handleStart = async (ticketId) => {
    try {
      const res = await api.post("/maintenance-logs/start", { ticketId });
      toast.success(res.data.message);
      await fetchQueue();
      await loadLogs(ticketId, true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Không nhận được việc");
    }
  };

  const handleSave = async () => {
    if (!draft?.logId) return;
    setSaving(true);
    try {
      await api.put(`/maintenance-logs/${draft.logId}`, {
        steps: draft.steps,
        materialsUsed: draft.materials,
        laborCost: Number(draft.laborCost) || 0,
        materialCost: Number(draft.materialCost) || 0,
        otherCost: Number(draft.otherCost) || 0,
        workDone: draft.workDone,
        note: draft.note,
      });
      toast.success("Đã lưu nhật ký ca làm");
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi lưu");
    } finally {
      setSaving(false);
    }
  };

  const handlePause = async (ticketId) => {
    const reason = prompt("Tạm dừng — lý do (vd: chờ vật tư):");
    if (!reason || !reason.trim()) return;
    try {
      const res = await api.post("/maintenance-logs/pause", {
        ticketId,
        reason,
      });
      toast.success(res.data.message);
      setDraft(null);
      fetchQueue();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi tạm dừng");
    }
  };

  const handleFinish = async (ticketId) => {
    if (
      !window.confirm(
        "Hoàn tất công việc? Phiếu sẽ chuyển sang CHỜ NGHIỆM THU và sân vẫn đang đóng.",
      )
    )
      return;
    try {
      // lưu nốt nội dung đang gõ trước khi đóng ca
      if (draft?.logId) await handleSave();
      const res = await api.post("/maintenance-logs/finish", { ticketId });
      toast.success(res.data.message);
      setDraft(null);
      setExpandedId(null);
      fetchQueue();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi hoàn tất");
    }
  };

  const handleVoidLog = async (logId) => {
    const reason = prompt("Hủy bỏ nhật ký — lý do (bắt buộc):");
    if (!reason || !reason.trim()) return;
    try {
      await api.post(`/maintenance-logs/${logId}/void`, { reason });
      toast.success("Đã hủy bỏ nhật ký");
      if (expandedId) {
        const res = await api.get("/maintenance-logs", {
          params: { ticket: expandedId },
        });
        setLogs(res.data.logs);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi hủy nhật ký");
    }
  };

  const inputCls =
    "w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
          <Wrench size={20} className="text-orange-500" /> Việc bảo trì cần làm
        </h1>
        <button
          onClick={fetchQueue}
          className="text-xs font-bold text-slate-500 flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw size={13} /> Làm mới
        </button>
      </div>

      {/* Báo cáo đang chờ Admin tạo phiếu (chỉ thông tin) */}
      {queue.reportsWaitingTicket?.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3 text-xs text-orange-800">
          <div className="font-extrabold mb-1 flex items-center gap-1.5">
            <AlertTriangle size={13} /> Sân đang chờ Admin xử lý báo cáo
          </div>
          {queue.reportsWaitingTicket.map((r) => (
            <div key={r._id}>
              • {r.court?.name} — {r.severity === "critical" ? "NGHIÊM TRỌNG (tạm ngưng)" : r.severity === "needs_repair" ? "cần sửa" : "nhẹ"} — ngày {r.date}
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <RefreshCw className="animate-spin mr-2" size={18} /> Đang tải...
        </div>
      ) : queue.tickets.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl py-14 text-center text-slate-400">
          <CheckCircle size={36} className="mx-auto mb-2 text-emerald-400" />
          Hết việc rồi — các sân đều ổn! 🎉
        </div>
      ) : (
        <div className="space-y-3">
          {queue.tickets.map((t) => {
            const expanded = expandedId === t._id;
            return (
              <div
                key={t._id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
              >
                {/* header card — bấm để mở panel */}
                <button
                  onClick={() => openPanel(t)}
                  className="w-full text-left p-4 cursor-pointer hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <div className="font-extrabold text-slate-800 text-sm">
                        {t.title}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {t.court?.name} • {CATEGORY_MAP[t.category]} •{" "}
                        {t.startDate === t.endDate
                          ? t.startDate
                          : `${t.startDate}→${t.endDate}`}{" "}
                        {t.startTime}-{t.endTime}
                        {t.requiresClosure === false && (
                          <span className="text-emerald-600 font-bold">
                            {" "}(việc nhỏ)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {t.overdue && (
                        <span className="badge badge-overdue">Quá hạn</span>
                      )}
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_BADGE[t.priority]}`}
                      >
                        {PRIORITY_MAP[t.priority]?.text}
                      </span>
                      {expanded ? (
                        <ChevronUp size={16} className="text-slate-400" />
                      ) : (
                        <ChevronDown size={16} className="text-slate-400" />
                      )}
                    </div>
                  </div>
                  {t.status === "in_progress" && t.openBy && (
                    <div
                      className={`mt-2 text-[11px] font-bold ${t.openByMe ? "text-emerald-600" : "text-amber-600"}`}
                    >
                      {t.openByMe
                        ? "● Ca của bạn đang mở"
                        : `● ${t.openBy} đang thực hiện`}
                    </div>
                  )}
                  {t.status === "on_hold" && (
                    <div className="mt-2 text-[11px] font-bold text-indigo-600">
                      ⏸ Tạm dừng — chờ tiếp tục
                    </div>
                  )}
                </button>

                {expanded && (
                  <div className="border-t border-slate-100 p-4 space-y-4">
                    {t.description && (
                      <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2.5 whitespace-pre-line">
                        {t.description}
                      </p>
                    )}

                    {/* ===== Chưa ai nhận (pending / on_hold / orphan) ===== */}
                    {!t.openBy && t.status !== "pending_acceptance" && (
                      <button
                        onClick={() => handleStart(t._id)}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-extrabold py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Play size={15} />
                        {t.status === "on_hold" ? "Tiếp tục làm" : "Nhận làm — bắt đầu"}
                      </button>
                    )}

                    {/* ===== Panel ghi nhật ký (ca của mình đang mở) ===== */}
                    {draft?.logId && (
                      <div className="space-y-3">
                        <div>
                          <div className="text-xs font-extrabold text-slate-500 mb-1.5 uppercase">
                            Việc đã làm
                          </div>
                          {draft.steps.map((s, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-2.5 py-1.5 mb-1"
                            >
                              <span>✓ {s.description}</span>
                              <button
                                onClick={() =>
                                  setDraft({
                                    ...draft,
                                    steps: draft.steps.filter((_, x) => x !== i),
                                  })
                                }
                                className="text-slate-300 hover:text-red-500 cursor-pointer"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ))}
                          <div className="flex gap-1.5">
                            <input
                              value={newStep}
                              onChange={(e) => setNewStep(e.target.value)}
                              placeholder="VD: thay 2 bóng đèn"
                              className={inputCls}
                            />
                            <button
                              onClick={() => {
                                if (!newStep.trim()) return;
                                setDraft({
                                  ...draft,
                                  steps: [
                                    ...draft.steps,
                                    { description: newStep.trim(), doneAt: new Date().toISOString() },
                                  ],
                                });
                                setNewStep("");
                              }}
                              className="bg-slate-100 hover:bg-slate-200 rounded-lg px-3 cursor-pointer text-slate-600"
                            >
                              <Plus size={15} />
                            </button>
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-extrabold text-slate-500 mb-1.5 uppercase">
                            Vật tư dùng
                          </div>
                          {draft.materials.map((mt, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-2.5 py-1.5 mb-1"
                            >
                              <span>
                                {mt.name} × {mt.qty}
                                {mt.unitCost > 0
                                  ? ` (${(mt.qty * mt.unitCost).toLocaleString("vi-VN")}đ)`
                                  : ""}
                              </span>
                              <button
                                onClick={() =>
                                  setDraft({
                                    ...draft,
                                    materials: draft.materials.filter(
                                      (_, x) => x !== i,
                                    ),
                                  })
                                }
                                className="text-slate-300 hover:text-red-500 cursor-pointer"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ))}
                          <div className="grid grid-cols-[1fr_52px_90px_auto] gap-1.5">
                            <input
                              value={newMat.name}
                              onChange={(e) =>
                                setNewMat({ ...newMat, name: e.target.value })
                              }
                              placeholder="Tên vật tư"
                              className={inputCls}
                            />
                            <input
                              type="number"
                              min="0"
                              value={newMat.qty}
                              onChange={(e) =>
                                setNewMat({ ...newMat, qty: Number(e.target.value) })
                              }
                              className={inputCls}
                            />
                            <input
                              type="number"
                              min="0"
                              placeholder="đ/cái"
                              value={newMat.unitCost || ""}
                              onChange={(e) =>
                                setNewMat({
                                  ...newMat,
                                  unitCost: Number(e.target.value),
                                })
                              }
                              className={inputCls}
                            />
                            <button
                              onClick={() => {
                                if (!newMat.name.trim()) return;
                                setDraft({
                                  ...draft,
                                  materials: [...draft.materials, { ...newMat }],
                                });
                                setNewMat({ name: "", qty: 1, unitCost: 0 });
                              }}
                              className="bg-slate-100 hover:bg-slate-200 rounded-lg px-3 cursor-pointer text-slate-600"
                            >
                              <Plus size={15} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          {[
                            ["laborCost", "Công (đ)"],
                            ["materialCost", "Vật tư (đ)"],
                            ["otherCost", "Khác (đ)"],
                          ].map(([key, label]) => (
                            <div key={key}>
                              <div className="text-[11px] font-bold text-slate-500 mb-0.5">
                                {label}
                              </div>
                              <input
                                type="number"
                                min="0"
                                value={draft[key] || ""}
                                onChange={(e) =>
                                  setDraft({ ...draft, [key]: e.target.value })
                                }
                                className={inputCls}
                              />
                            </div>
                          ))}
                        </div>

                        <textarea
                          rows={2}
                          placeholder="Tóm tắt / ghi chú ca làm..."
                          value={draft.note}
                          onChange={(e) =>
                            setDraft({ ...draft, note: e.target.value })
                          }
                          className={`${inputCls} w-full`}
                        />

                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-slate-700 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-sm cursor-pointer disabled:opacity-50"
                          >
                            {saving ? "Đang lưu..." : "Lưu nhật ký"}
                          </button>
                          <button
                            onClick={() => handlePause(t._id)}
                            className="bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-1.5 cursor-pointer"
                          >
                            <Pause size={14} /> Tạm dừng
                          </button>
                          <button
                            onClick={() => handleFinish(t._id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle size={14} /> Hoàn tất công việc
                          </button>
                        </div>
                      </div>
                    )}

                    {t.openBy && !t.openByMe && (
                      <div className="text-xs font-bold text-amber-600 bg-amber-50 rounded-lg p-2.5">
                        {t.openBy} đang thực hiện ca này — chờ người đó tạm dừng
                        hoặc hoàn tất.
                      </div>
                    )}

                    {/* ===== Lịch sử ca của phiếu ===== */}
                    <div>
                      <div className="text-xs font-extrabold text-slate-500 mb-1.5 uppercase">
                        Nhật ký các ca ({logs.length})
                      </div>
                      {logs.length === 0 && (
                        <div className="text-xs text-slate-400">Chưa có ca nào</div>
                      )}
                      {logs.map((l) => (
                        <div
                          key={l._id}
                          className={`text-xs border rounded-lg p-2.5 mb-1.5 ${
                            l.status === "voided"
                              ? "border-slate-100 bg-slate-50 text-slate-400"
                              : "border-slate-200"
                          }`}
                        >
                          <div className="flex justify-between items-center gap-2 flex-wrap">
                            <span className="font-bold">
                              {l.performedBy?.name || "—"} •{" "}
                              {new Date(l.startedAt).toLocaleString("vi-VN")}
                              {l.endedAt
                                ? ` → ${new Date(l.endedAt).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`
                                : " → đang làm"}
                            </span>
                            <div className="flex items-center gap-2">
                              {l.status === "voided" ? (
                                <span className="font-bold">Đã hủy</span>
                              ) : (
                                <span
                                  className={`font-bold ${l.status === "open" ? "text-emerald-600" : "text-slate-400"}`}
                                >
                                  {l.status === "open" ? "Đang mở" : "Đã đóng"}
                                </span>
                              )}
                              {l.status !== "voided" && (
                                <button
                                  onClick={() => handleVoidLog(l._id)}
                                  className="text-red-400 hover:text-red-600 cursor-pointer"
                                  title="Hủy bỏ nhật ký"
                                >
                                  <X size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                          {l.status === "voided" && (
                            <div>Lý do: {l.voidReason}</div>
                          )}
                          {l.workDone && <div>{l.workDone}</div>}
                          {l.steps?.length > 0 && (
                            <div>{l.steps.map((s) => s.description).join(" • ")}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ===== N2.10: kiểm tra lại sau sửa (chờ Admin duyệt) ===== */}
      {queue.acceptanceTasks?.length > 0 && (
        <div className="bg-white border border-purple-200 rounded-2xl p-4 space-y-2">
          <div className="text-xs font-extrabold text-purple-700 uppercase flex items-center gap-1.5">
            <ClipboardCheck size={14} /> Chờ nghiệm thu — kiểm tra lại sau sửa
          </div>
          {queue.acceptanceTasks.map((t) => (
            <div key={t._id} className="border border-purple-100 rounded-xl">
              <button
                onClick={() => openAcceptance(t)}
                className="w-full text-left p-3 cursor-pointer hover:bg-purple-50"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-bold text-sm text-slate-800">
                    {t.ticketCode} — {t.title}
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      t.lastAcceptance
                        ? t.lastAcceptance.result === "pass"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {t.lastAcceptance
                      ? t.lastAcceptance.result === "pass"
                        ? "Lần kiểm lại gần nhất: ĐẠT"
                        : "Lần kiểm lại gần nhất: KHÔNG ĐẠT"
                      : "Chưa kiểm lại"}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {t.court?.name} • {CATEGORY_MAP[t.category]}
                </div>
                {t.lastAcceptance?.failReason && (
                  <div className="text-xs text-red-600 mt-0.5">
                    Lý do lần trước: {t.lastAcceptance.failReason}
                  </div>
                )}
              </button>

              {accOpen?._id === t._id && (
                <div className="border-t border-purple-100 p-3 space-y-3">
                  {(templates.filter((tpl) => tpl.category === t.category).length > 0
                    ? templates.filter((tpl) => tpl.category === t.category)
                    : templates
                  ).map((tpl) => (
                    <div
                      key={tpl._id}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="text-slate-700">{tpl.item}</span>
                      <div className="flex gap-1">
                        {[
                          ["ok", "Đạt", "bg-emerald-600"],
                          ["fail", "Không đạt", "bg-red-600"],
                        ].map(([val, label, activeCls]) => (
                          <button
                            key={val}
                            onClick={() =>
                              setAccItemRes((prev) => ({ ...prev, [tpl._id]: val }))
                            }
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border cursor-pointer ${
                              (accItemRes[tpl._id] || "ok") === val
                                ? `${activeCls} text-white border-transparent`
                                : "border-slate-200 bg-white text-slate-400"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-2">
                    {["pass", "fail"].map((v) => (
                      <button
                        key={v}
                        onClick={() => setAccResult(v)}
                        className={`flex-1 py-2 rounded-xl text-sm font-extrabold cursor-pointer border-2 ${
                          accResult === v
                            ? v === "pass"
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                              : "border-red-500 bg-red-50 text-red-700"
                            : "border-slate-200 text-slate-400"
                        }`}
                      >
                        {v === "pass" ? "✓ Tổng kết: ĐẠT" : "✗ Tổng kết: KHÔNG ĐẠT"}
                      </button>
                    ))}
                  </div>
                  {accResult === "fail" && (
                    <textarea
                      rows={2}
                      placeholder="Lý do không đạt (bắt buộc)..."
                      value={accFailReason}
                      onChange={(e) => setAccFailReason(e.target.value)}
                      className={inputCls}
                    />
                  )}
                  <input
                    placeholder="Ghi chú thêm (tùy chọn)"
                    value={accNote}
                    onChange={(e) => setAccNote(e.target.value)}
                    className={inputCls}
                  />
                  <button
                    onClick={submitAcceptance}
                    disabled={accSubmitting}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-extrabold py-2.5 rounded-xl text-sm cursor-pointer disabled:opacity-50"
                  >
                    {accSubmitting ? "Đang gửi..." : "Gửi kết quả kiểm tra lại lên Admin"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
