// Tiện ích chung cho tính năng Giải đấu — trạng thái suy ra từ API (eventService)
export const STATE_BADGE = {
  open: "bg-green-100 text-green-700",
  closed_deadline: "bg-gray-200 text-gray-600",
  closed_full: "bg-amber-100 text-amber-700",
  finished: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
  draft: "bg-slate-200 text-slate-600",
};

export const fmtDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";

export const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";

// Date ISO ↔ input datetime-local (giữ giờ local, không lệch múi khi sửa)
export const toLocalInput = (iso) =>
  iso
    ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : "";
