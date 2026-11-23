// Nhãn + định dạng dùng chung cho quản lý giải đấu (khách, nhân viên, admin)

export const T_STATUS = {
  draft: { label: "Bản nháp", badge: "tm-badge--draft" },
  open: { label: "Đang mở đăng ký", badge: "tm-badge--open" },
  closed: { label: "Đã đóng đăng ký", badge: "tm-badge--closed" },
  ongoing: { label: "Đang thi đấu", badge: "tm-badge--ongoing" },
  completed: { label: "Đã kết thúc", badge: "tm-badge--completed" },
  cancelled: { label: "Đã huỷ", badge: "tm-badge--cancelled" },
};

export const REG_STATUS = {
  pending: { label: "Chờ xác nhận", badge: "tm-badge--closed" },
  confirmed: { label: "Đã xác nhận", badge: "tm-badge--open" },
  rejected: { label: "Bị từ chối", badge: "tm-badge--rejected" },
  cancelled: { label: "Đã huỷ", badge: "tm-badge--cancelled" },
};

export const MATCH_STATUS = {
  scheduled: "Chờ thi đấu",
  playing: "Đang đấu",
  finished: "Đã xong",
  walkover: "Xử thắng",
};

export const PLAY_TYPE = { single: "Cá nhân (đánh đơn)", pair: "Theo cặp (đánh đôi)" };
export const PLAY_SHORT = { single: "Đơn", pair: "Đôi" };

export const TIER = {
  diamond: "Kim cương",
  gold: "Vàng",
  silver: "Bạc",
  partner: "Đồng hành",
};

export const RANK_LABEL = { 1: "Vô địch", 2: "Á quân", 3: "Hạng ba", 4: "Hạng tư" };

export const fmtDay = (d) =>
  d ? new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

export const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
      })
    : "Chưa xếp giờ";

export const fmtRange = (a, b) => {
  const x = fmtDay(a);
  const y = fmtDay(b);
  return x === y ? x : `${x} – ${y}`;
};

export const fmtFee = (n) => (n > 0 ? `${n.toLocaleString("vi-VN")}đ` : "Miễn phí");

export const unit = (playType) => (playType === "pair" ? "cặp" : "VĐV");

// Đăng ký còn mở không (để hiện nút)
export const canRegister = (t) =>
  t.status === "open" && new Date(t.registrationDeadline) >= new Date() && (t.registeredCount ?? 0) < t.maxParticipants;

export const scoreText = (m) =>
  m.sets?.length ? m.sets.map((s) => `${s.a}-${s.b}`).join(", ") : m.status === "walkover" && !m.isBye ? "Xử thắng" : "";

// Date -> <input type="datetime-local">
export const toLocalInput = (d) => {
  if (!d) return "";
  const x = new Date(d);
  const pad = (n) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
};
export const toDateInput = (d) => (d ? toLocalInput(d).slice(0, 10) : "");
