import { STATUS, STEPS } from "../utils/racketService";

// Thanh tiến trình 4 bước của phiếu sửa vợt
export default function RacketProgress({ status }) {
  if (status === "cancelled") return null;
  const current = STEPS.indexOf(status);
  return (
    <ol className="rs-steps" aria-label="Tiến trình sửa vợt">
      {STEPS.map((s, i) => {
        const Icon = STATUS[s].icon;
        const state = i < current ? "done" : i === current ? "current" : "todo";
        return (
          <li
            key={s}
            className={`rs-step rs-step--${state}`}
            aria-current={state === "current" ? "step" : undefined}
          >
            <span className="rs-step-dot">
              <Icon size={16} />
            </span>
            <span className="rs-step-label">{STATUS[s].label}</span>
          </li>
        );
      })}
    </ol>
  );
}
