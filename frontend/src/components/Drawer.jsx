import { useEffect } from "react";
import { X } from "lucide-react";

// Ngăn kéo trượt từ bên phải (form tạo / chi tiết). Esc hoặc bấm nền để đóng.
export default function Drawer({ title, onClose, children, footer, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="rsd-overlay" onClick={onClose}>
      <aside
        className={`rsd-drawer ${wide ? "rsd-drawer--wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="rsd-drawer-head">
          <h2>{title}</h2>
          <button type="button" className="rsd-icon-btn" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </header>
        <div className="rsd-drawer-body">{children}</div>
        {footer && <footer className="rsd-drawer-foot">{footer}</footer>}
      </aside>
    </div>
  );
}
