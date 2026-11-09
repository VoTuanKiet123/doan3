import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";
import {
  ClipboardCheck,
  Check,
  AlertTriangle,
  X,
  RefreshCw,
  Send,
} from "lucide-react";

const SEVERITY_OPTIONS = [
  { value: "none", label: "Không có lỗi", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  { value: "minor", label: "Nhẹ", cls: "border-yellow-200 bg-yellow-50 text-yellow-700" },
  { value: "needs_repair", label: "Cần sửa", cls: "border-orange-200 bg-orange-50 text-orange-700" },
  { value: "critical", label: "Nghiêm trọng", cls: "border-red-200 bg-red-50 text-red-700" },
];

const RESULT_OPTIONS = [
  { value: "ok", label: "Đạt", icon: <Check size={13} />, activeCls: "bg-emerald-600 text-white border-emerald-600" },
  { value: "attention", label: "Cần lưu ý", icon: <AlertTriangle size={13} />, activeCls: "bg-amber-500 text-white border-amber-500" },
  { value: "fail", label: "Hỏng", icon: <X size={13} />, activeCls: "bg-red-600 text-white border-red-600" },
];

export default function POSCourtCheck() {
  const [courts, setCourts] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [todayInspections, setTodayInspections] = useState([]);
  const [courtId, setCourtId] = useState("");
  const [results, setResults] = useState({}); // templateId -> { result, note }
  const [severity, setSeverity] = useState("none");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const todayStr = useMemo(
    () =>
      new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }),
      )
        .toISOString()
        .slice(0, 10),
    [],
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cRes, clRes, iRes] = await Promise.all([
        api.get("/pos/courts-status"),
        api.get("/inspections/checklist"),
        api.get("/inspections", { params: { date: todayStr } }),
      ]);
      setCourts(cRes.data.courts || []);
      setChecklist(clRes.data.items || []);
      setTodayInspections(iRes.data.inspections || []);
    } catch (err) {
      toast.error("Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [todayStr]);

  // reset kết quả khi đổi sân
  useEffect(() => {
    setResults({});
    setSeverity("none");
    setNote("");
  }, [courtId]);

  const checkedToday = (id) =>
    todayInspections.some((i) => String(i.court?._id) === String(id));

  const setResult = (tplId, value) =>
    setResults((prev) => ({
      ...prev,
      [tplId]: { result: value, note: prev[tplId]?.note || "" },
    }));

  const badCount = Object.values(results).filter(
    (r) => r && r.result !== "ok",
  ).length;

  // Gợi ý mức độ tự động theo số mục lỗi (người dùng vẫn đổi tay được)
  const suggestSeverity = () => {
    if (results && Object.values(results).some((r) => r?.result === "fail"))
      return "needs_repair";
    if (badCount > 0) return "minor";
    return "none";
  };

  const handleSubmit = async () => {
    if (!courtId) {
      toast.error("Vui lòng chọn sân cần kiểm tra");
      return;
    }
    if (severity !== "none" && !note.trim()) {
      toast.error("Báo có lỗi — vui lòng mô tả vấn đề");
      return;
    }
    if (window.confirm(
      severity === "critical"
        ? "Nghiêm trọng: sân sẽ TẠM NGƯNG nhận khách ngay sau khi gửi. Xác nhận?"
        : "Gửi báo cáo kiểm tra sân?",
    ) === false)
      return;

    setSubmitting(true);
    try {
      const items = checklist.map((tpl) => ({
        item: tpl.item,
        category: tpl.category,
        result: results[tpl._id]?.result || "ok",
        note: results[tpl._id]?.note || "",
      }));
      const res = await api.post("/inspections", {
        court: courtId,
        items,
        severity,
        note,
      });
      toast.success(res.data.message);
      if (res.data.courtSuspended) {
        toast("Sân đã tạm ngưng nhận khách, chờ Admin xử lý!", { icon: "🚧" });
      }
      setCourtId("");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Lỗi gửi báo cáo");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <RefreshCw className="animate-spin mr-2" size={18} /> Đang tải...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ===== Chọn sân ===== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-extrabold text-slate-800 flex items-center gap-2">
            <ClipboardCheck size={18} className="text-orange-500" /> 1. Chọn sân
            cần kiểm tra
          </h2>
          <button
            onClick={fetchData}
            className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-xs font-bold cursor-pointer"
          >
            <RefreshCw size={13} /> Làm mới
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {courts.map((c) => {
            const selected = courtId === c._id;
            const checked = checkedToday(c._id);
            return (
              <button
                key={c._id}
                onClick={() => setCourtId(c._id)}
                className={`relative text-left rounded-xl border-2 px-3 py-2.5 cursor-pointer transition-all ${
                  selected
                    ? "border-orange-500 bg-orange-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="font-bold text-sm text-slate-800">{c.name}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {c.currentStatus === "suspended" ? (
                    <span className="text-orange-600 font-bold">
                      ⚠️ Đang tạm ngưng
                    </span>
                  ) : c.currentStatus === "maintenance" ? (
                    <span className="text-red-600 font-bold">Đang bảo trì</span>
                  ) : (
                    "Hoạt động"
                  )}
                </div>
                <span
                  className={`absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    checked
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {checked ? "✓ Đã kiểm" : "Chưa kiểm hôm nay"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== Checklist ===== */}
      {courtId && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h2 className="font-extrabold text-slate-800 mb-1">
            2. Kiểm tra từng mục
          </h2>
          <p className="text-xs text-slate-400 mb-3">
            Chạm nhanh Đạt / Cần lưu ý / Hỏng cho mỗi mục.
            {badCount > 0 &&
              ` (gợi ý mức độ: ${SEVERITY_OPTIONS.find((s) => s.value === suggestSeverity())?.label})`}
          </p>
          <div className="space-y-3">
            {checklist.map((tpl) => {
              const r = results[tpl._id] || { result: "ok", note: "" };
              return (
                <div
                  key={tpl._id}
                  className="border border-slate-100 rounded-xl p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-700">
                      {tpl.item}
                    </span>
                    <div className="flex gap-1.5">
                      {RESULT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setResult(tpl._id, opt.value)}
                          className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border cursor-pointer transition-all ${
                            r.result === opt.value
                              ? opt.activeCls
                              : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                          }`}
                        >
                          {opt.icon} {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {r.result !== "ok" && (
                    <input
                      value={r.note}
                      onChange={(e) =>
                        setResults((prev) => ({
                          ...prev,
                          [tpl._id]: {
                            result: prev[tpl._id]?.result,
                            note: e.target.value,
                          },
                        }))
                      }
                      placeholder="Ghi chú lỗi (không bắt buộc)..."
                      className="mt-2 w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5"
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* ===== Mức độ + mô tả + gửi ===== */}
          <h2 className="font-extrabold text-slate-800 mt-5 mb-2">
            3. Mức độ &amp; gửi báo cáo
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            {SEVERITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSeverity(opt.value)}
                className={`rounded-xl border-2 px-3 py-2 text-sm font-bold cursor-pointer transition-all ${
                  severity === opt.value
                    ? opt.cls
                    : "border-slate-200 bg-white text-slate-500"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {severity === "critical" && (
            <div className="mb-3 rounded-xl border-2 border-red-300 bg-red-50 px-3 py-2.5 text-sm font-bold text-red-700">
              🚧 Sân sẽ TẠM NGƯNG nhận khách ngay sau khi gửi — chỉ Admin tạo
              phiếu hoặc bỏ qua mới mở lại được.
            </div>
          )}
          {severity !== "none" && (
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Mô tả vấn đề để Admin nắm (bắt buộc khi báo lỗi)..."
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 mb-3"
            />
          )}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full md:w-auto bg-orange-500 hover:bg-orange-600 text-white font-extrabold px-6 py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Send size={16} />
            {submitting ? "Đang gửi..." : "Gửi báo cáo"}
          </button>
        </div>
      )}

      {/* ===== Lịch sử hôm nay ===== */}
      {todayInspections.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h2 className="font-extrabold text-slate-800 mb-2">
            Báo cáo hôm nay
          </h2>
          <div className="space-y-1.5">
            {todayInspections.map((i) => (
              <div
                key={i._id}
                className="flex items-center gap-2 text-sm text-slate-600"
              >
                <span className="font-bold">{i.court?.name}</span>
                <span
                  className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                    i.severity === "critical"
                      ? "bg-red-100 text-red-700"
                      : i.severity === "needs_repair"
                        ? "bg-orange-100 text-orange-700"
                        : i.severity === "minor"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {SEVERITY_OPTIONS.find((s) => s.value === i.severity)?.label}
                </span>
                <span className="text-xs text-slate-400">
                  {i.inspectedBy?.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
