import { ClipboardCheck, Wallet, BadgeCheck, UserCheck } from "lucide-react";

// Tiến trình đăng ký: gửi đăng ký → nộp lệ phí → được xác nhận → có mặt
export default function RegProgress({ reg }) {
  if (["rejected", "cancelled"].includes(reg.status)) return null;
  // Bước đã xong: thì quá khứ · bước chưa xong: việc cần làm tiếp
  const paid = reg.paymentStatus === "paid";
  const steps = [
    { label: "Đã gửi đăng ký", icon: ClipboardCheck, done: true },
    {
      label: reg.fee > 0 ? (paid ? "Đã nộp lệ phí" : "Nộp lệ phí") : "Miễn lệ phí",
      icon: Wallet,
      done: paid,
    },
    {
      label: reg.status === "confirmed" ? "Đã xác nhận" : "Chờ xác nhận",
      icon: BadgeCheck,
      done: reg.status === "confirmed",
    },
    { label: reg.checkedIn ? "Đã có mặt" : "Điểm danh khi đến", icon: UserCheck, done: !!reg.checkedIn },
  ];
  const current = steps.findIndex((s) => !s.done);
  return (
    <ol className="rs-steps" aria-label="Tiến trình đăng ký">
      {steps.map((s, i) => {
        const Icon = s.icon;
        const state = s.done ? "done" : i === current ? "current" : "todo";
        return (
          <li
            key={s.label}
            className={`rs-step rs-step--${state}`}
            aria-current={state === "current" ? "step" : undefined}
          >
            <span className="rs-step-dot">
              <Icon size={16} />
            </span>
            <span className="rs-step-label">{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
