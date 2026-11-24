// Hằng số + định dạng dùng chung cho dịch vụ sửa vợt (trang khách, quầy, admin)
import {
  ClipboardCheck,
  Wrench,
  PackageCheck,
  HandCoins,
  XCircle,
} from "lucide-react";

export const STATUS = {
  received: { label: "Đã nhận vợt", badge: "rs-badge--received", icon: ClipboardCheck },
  in_progress: { label: "Đang sửa", badge: "rs-badge--progress", icon: Wrench },
  completed: { label: "Đã sửa xong, chờ lấy", badge: "rs-badge--ready", icon: PackageCheck },
  picked_up: { label: "Đã trả vợt", badge: "rs-badge--done", icon: HandCoins },
  cancelled: { label: "Đã huỷ", badge: "rs-badge--cancelled", icon: XCircle },
};

export const STEPS = ["received", "in_progress", "completed", "picked_up"];
export const ACTIVE = ["received", "in_progress", "completed"];
export const CLOSED = ["picked_up", "cancelled"];

export const SERVICE = {
  stringing: "Căng dây",
  grip: "Thay quấn cán",
  frame_repair: "Sửa khung",
  other: "Vệ sinh / khác",
};

export const isOverdue = (t) =>
  ["received", "in_progress"].includes(t.status) &&
  !!t.estimatedReadyAt &&
  new Date(t.estimatedReadyAt) < new Date();

export const serviceDetail = (t) =>
  [
    SERVICE[t.serviceType],
    t.serviceType === "stringing" && t.stringName
      ? `dây ${t.stringName}${t.isCustomerString ? " (khách mang)" : ""}`
      : null,
    t.tensionLbs ? `${t.tensionLbs} lbs` : null,
  ]
    .filter(Boolean)
    .join(" · ");

export const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";

export const fmtMoney = (n) => `${(n || 0).toLocaleString("vi-VN")}đ`;

// "0912345678" -> "0912 345 678"
export const fmtPhone = (p) =>
  String(p || "").replace(/^(\d{4})(\d{3})(\d+)$/, "$1 $2 $3");

// Date -> giá trị cho <input type="datetime-local"> theo giờ máy
export const toLocalInput = (d) => {
  if (!d) return "";
  const x = new Date(d);
  const pad = (n) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
};
