import {
  Clock,
  Wrench,
  CheckCircle,
  X,
  Pause,
  ClipboardCheck,
} from "lucide-react";

// ============ CONSTANTS dùng chung cho danh sách + chi tiết phiếu bảo trì ============

export const STATUS_MAP = {
  pending: { text: "Chờ xử lý", cls: "badge badge-pending", icon: <Clock size={12} /> },
  in_progress: { text: "Đang bảo trì", cls: "badge badge-maintenance", icon: <Wrench size={12} /> },
  on_hold: { text: "Tạm dừng", cls: "badge badge-onhold", icon: <Pause size={12} /> },
  pending_acceptance: { text: "Chờ nghiệm thu", cls: "badge badge-acceptance", icon: <ClipboardCheck size={12} /> },
  completed: { text: "Hoàn thành", cls: "badge badge-confirmed", icon: <CheckCircle size={12} /> },
  cancelled: { text: "Đã hủy", cls: "badge badge-cancelled", icon: <X size={12} /> },
};

export const TYPE_MAP = {
  scheduled: { text: "Có kế hoạch", cls: "admin-filter-tab" },
  emergency: { text: "Khẩn cấp", cls: "admin-filter-tab" },
  periodic: { text: "Định kỳ", cls: "admin-filter-tab" },
};

export const PRIORITY_MAP = {
  low: { text: "Thấp", color: "#64748b" },
  medium: { text: "Trung bình", color: "#0f766e" },
  high: { text: "Cao", color: "#b45309" },
  urgent: { text: "Khẩn cấp", color: "#dc2626" },
};

export const PRIORITY_WEIGHT = { low: 1, medium: 2, high: 3, urgent: 4 };

export const CATEGORY_MAP = {
  floor: "Thảm / sàn",
  lighting: "Đèn",
  net_post: "Lưới & trụ",
  line_marking: "Vạch kẻ sân",
  ventilation: "Quạt / thông gió",
  roof_wall: "Mái / trần / tường",
  other: "Khác",
};

export const CONFLICT_STRATEGY_MAP = {
  auto_relocate: "Tự động chuyển sân",
  cancel_booking: "Hủy booking",
  force_override: "Ép bảo trì",
};

// N1.3: phiếu đang hiệu lực mà đã qua endDate ⇒ quá hạn (tính khi đọc, không cron)
export const isOverdue = (m) =>
  ["pending", "in_progress", "on_hold"].includes(m.status) &&
  !!m.endDate &&
  m.endDate < new Date().toISOString().slice(0, 10);

// Quá hạn thì hiển thị ưu tiên nâng 1 bậc (chỉ display, không ghi DB)
export const displayPriority = (m) => {
  if (!isOverdue(m)) return m.priority || "medium";
  return { low: "medium", medium: "high", high: "urgent", urgent: "urgent" }[
    m.priority || "medium"
  ];
};
