/**
 * testMaintenanceV2.js
 * Self-check Phase 1 (Bảo trì v2) — chạy: node testMaintenanceV2.js
 * Tự tạo dữ liệu test rồi DỌN SẠCH sau khi chạy, không ảnh hưởng dữ liệu thật.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Court = require("./src/models/Court");
const Maintenance = require("./src/models/Maintenance");
const Inspection = require("./src/models/Inspection");
const MaintenanceLog = require("./src/models/MaintenanceLog");
const ChecklistTemplate = require("./src/models/ChecklistTemplate");
const {
  changeTicketStatus,
  isSlotBlocked,
  getSuspendedCourtIds,
} = require("./src/services/maintenanceService");
const { bulkCheckConflicts } = require("./src/services/scheduleService");

let passed = 0;
const ok = (cond, msg) => {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  passed++;
  console.log(`  ✅ ${msg}`);
};

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Duyệt hoàn thành đúng luật N1.8: acceptance PASS trước rồi mới completed
const passAndComplete = async (ticketId, note) => {
  const t = await Maintenance.findById(ticketId);
  await Inspection.create({
    court: t.court,
    ticket: ticketId,
    type: "acceptance",
    date: todayStr(),
    inspectedBy: new mongoose.Types.ObjectId(),
    result: "pass",
  });
  return changeTicketStatus(ticketId, "completed", { note: note || "nghiệm thu đạt" });
};

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Connected to MongoDB");

  let court, court2, court3, court4;
  const created = [];
  const newTicket = async (props) => {
    const t = await Maintenance.create({
      court: court._id,
      title: "TEST ticket",
      startDate: todayStr(),
      endDate: todayStr(),
      createdBy: null,
      ...props,
    });
    created.push(t._id);
    return t;
  };

  try {
    court = await Court.create({ name: "TEST sân 1", pricePerHour: 100000 });
    court2 = await Court.create({ name: "TEST sân 2", pricePerHour: 100000 });
    court3 = await Court.create({ name: "TEST sân 3", pricePerHour: 100000 });

    console.log("\n--- 1. Sinh mã phiếu (5 create song song = race test) ---");
    const tickets = await Promise.all(
      [...Array(5)].map(() => newTicket({})),
    );
    const codes = new Set(tickets.map((t) => t.ticketCode));
    ok(codes.size === 5, `5 phiếu race có 5 mã khác nhau: ${[...codes].join(", ")}`);
    ok(/^BT-\d{6}-\d{3}$/.test(tickets[0].ticketCode), `đúng format BT-YYMMDD-NNN: ${tickets[0].ticketCode}`);

    console.log("\n--- 2. State machine ---");
    const a = await newTicket({ requiresClosure: true });
    let threw = false;
    try {
      await changeTicketStatus(a._id, "completed");
    } catch (e) {
      threw = e.status === 400;
    }
    ok(threw, "pending → completed bị chặn (400)");

    await changeTicketStatus(a._id, "in_progress", { note: "bắt đầu" });
    let c = await Court.findById(a.court);
    ok(c.status === "maintenance", "in_progress (requiresClosure) → sân đóng");

    await changeTicketStatus(a._id, "on_hold");
    await changeTicketStatus(a._id, "in_progress");
    threw = false;
    try {
      await changeTicketStatus(a._id, "on_hold");
      await changeTicketStatus(a._id, "pending_acceptance"); // từ on_hold không được nhảy thẳng
    } catch (e) {
      threw = e.status === 400;
    }
    ok(threw, "on_hold → pending_acceptance bị chặn (phải qua in_progress)");
    await changeTicketStatus(a._id, "in_progress");
    await changeTicketStatus(a._id, "pending_acceptance");
    c = await Court.findById(a.court);
    ok(c.status === "maintenance", "pending_acceptance → sân VẪN đóng");

    const fresh = await Maintenance.findById(a._id);
    await passAndComplete(fresh._id, "đạt");
    c = await Court.findById(a.court);
    ok(c.status === "active", "completed + không còn phiếu chặn nào → sân mở lại");
    const done = await Maintenance.findById(a._id);
    ok(done.statusHistory.length === 7, `statusHistory ghi đủ 7 bước (${done.statusHistory.length})`);
    ok(done.downtimeMinutes >= 0 && done.actualStart && done.actualEnd, "actualStart/actualEnd/downtimeMinutes đã ghi nhận");

    console.log("\n--- 3. Phiếu việc nhỏ (requiresClosure = false) ---");
    const b = await newTicket({ court: court2._id, requiresClosure: false });
    await changeTicketStatus(b._id, "in_progress");
    c = await Court.findById(court2._id);
    ok(c.status === "active", "việc nhỏ in_progress → sân KHÔNG bị đóng");

    console.log("\n--- 2b. Đường tắt UI cũ: in_progress → completed thẳng ---");
    const g = await newTicket({ court: court3._id, requiresClosure: true });
    await changeTicketStatus(g._id, "in_progress");
    threw = false;
    try {
      await changeTicketStatus(g._id, "cancelled"); // Hủy từ in_progress không lý do ⇒ 400
    } catch (e) {
      threw = e.status === 400;
    }
    ok(threw, "Hủy từ in_progress không lý do bị chặn (400)");
    await changeTicketStatus(g._id, "completed", { note: "UI cũ hoàn thành" });
    c = await Court.findById(court3._id);
    ok(c.status === "active", "in_progress → completed thẳng vẫn mở được sân (giữ luồng cũ)");

    console.log("\n--- 4. Hai phiếu cùng đóng 1 sân — completed 1 chưa được mở ---");
    const d1 = await newTicket({ court: court3._id });
    const d2 = await newTicket({ court: court3._id });
    await changeTicketStatus(d1._id, "in_progress");
    await changeTicketStatus(d2._id, "in_progress");
    const d1f = await Maintenance.findById(d1._id);
    d1f.actualStart = new Date(Date.now() - 90 * 60000); // giả lập đóng 90 phút
    await d1f.save();
    await changeTicketStatus(d1._id, "pending_acceptance");
    await passAndComplete(d1._id);
    c = await Court.findById(court3._id);
    ok(c.status === "maintenance", "vẫn còn phiếu d2 đang đóng → sân chưa mở");
    const d2f = await Maintenance.findById(d2._id);
    await changeTicketStatus(d2f._id, "pending_acceptance");
    await passAndComplete(d2f._id);
    c = await Court.findById(court3._id);
    ok(c.status === "active", "phiếu cuối completed → sân mở");
    const d2done = await Maintenance.findById(d2._id);
    ok(d2done.downtimeMinutes !== null, "downtimeMinutes đã tính khi hoàn thành");

    console.log("\n--- 5. Sân tạm ngưng vì báo cáo critical chờ xử lý ---");
    const e1 = await newTicket({ court: court2._id, requiresClosure: true });
    await changeTicketStatus(e1._id, "in_progress");
    await Inspection.create({
      court: court2._id,
      type: "routine",
      severity: "critical",
      date: todayStr(),
      inspectedBy: new mongoose.Types.ObjectId(),
      items: [{ item: "Sàn trơn", category: "floor", result: "fail" }],
    });
    await changeTicketStatus(e1._id, "pending_acceptance");
    await passAndComplete(e1._id);
    c = await Court.findById(court2._id);
    ok(c.status === "maintenance", "còn báo cáo critical chờ xử lý → không mở sân");
    await Inspection.deleteMany({ court: court2._id });
    const e2 = await newTicket({ court: court2._id, requiresClosure: true });
    await changeTicketStatus(e2._id, "in_progress");
    await changeTicketStatus(e2._id, "pending_acceptance");
    await passAndComplete(e2._id);
    c = await Court.findById(court2._id);
    ok(c.status === "active", "hết báo cáo critical + phiếu xong → sân mở");

    console.log("\n--- 6. Model MaintenanceLog / ChecklistTemplate ---");
    const log = await MaintenanceLog.create({
      ticket: e2._id,
      court: court2._id,
      performedBy: new mongoose.Types.ObjectId(),
      steps: [{ description: "Thay bóng đèn hành lang" }],
      materialsUsed: [{ name: "Đèn LED 800lux", qty: 2, unitCost: 350000 }],
      laborCost: 200000,
      materialCost: 700000,
    });
    ok(log.status === "open" && log.startedAt, "MaintenanceLog tạo được, default open + startedAt");
    const ct = await ChecklistTemplate.create({ item: "TEST mục kiểm tra", category: "floor" });
    ok(ct.isActive === true, "ChecklistTemplate default isActive");

    console.log("\n--- 7. Chặn đặt sân N1.7: isSlotBlocked / getSuspendedCourtIds / bulk ---");
    court4 = await Court.create({ name: "TEST sân 4", pricePerHour: 100000 });
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const w1 = await newTicket({
      court: court4._id,
      requiresClosure: true,
      startDate: todayStr(),
      endDate: todayStr(),
      startTime: "10:00",
      endTime: "12:00",
    });
    let r = await isSlotBlocked(court4._id, todayStr(), "10:30", "11:00");
    ok(r.blocked && r.reason === "maintenance", "slot TRONG cửa sổ phiếu → chặn");
    r = await isSlotBlocked(court4._id, todayStr(), "13:00", "14:00");
    ok(!r.blocked, "slot NGOÀI cửa sổ → còn đặt");
    await newTicket({
      court: court4._id,
      requiresClosure: false,
      startDate: todayStr(),
      endDate: todayStr(),
      startTime: "13:00",
      endTime: "14:00",
    });
    r = await isSlotBlocked(court4._id, todayStr(), "13:10", "13:50");
    ok(!r.blocked, "phiếu việc nhỏ (không đóng sân) → KHÔNG chặn");

    // critical chờ xử lý → chặn mọi slot, kể cả ngoài cửa sổ phiếu
    await Inspection.create({
      court: court4._id,
      type: "routine",
      severity: "critical",
      date: todayStr(),
      inspectedBy: new mongoose.Types.ObjectId(),
      items: [],
    });
    r = await isSlotBlocked(court4._id, tomorrow, "20:00", "21:00");
    ok(r.blocked && r.reason === "suspended", "tạm ngưng critical → chặn mọi slot");
    const suspIds = await getSuspendedCourtIds();
    ok(suspIds.includes(String(court4._id)), "getSuspendedCourtIds liệt kê đúng sân");

    // bulkCheckConflicts (đặt lịch tháng): suspended → mọi ngày conflict
    const bulk = await bulkCheckConflicts(court4._id, [
      { date: todayStr(), startTime: "13:00", endTime: "14:00" },
      { date: tomorrow, startTime: "08:00", endTime: "09:00" },
    ]);
    ok(bulk.length === 2, `suspended → bulk trả đủ 2 ngày conflict (${bulk.length})`);

    // Admin bỏ qua báo cáo → hết tạm ngưng (chỉ còn cửa sổ phiếu hôm nay)
    await Inspection.updateOne(
      { court: court4._id, type: "routine" },
      { $set: { "dismissal.reason": "thử lại thấy ổn", "dismissal.at": new Date() } },
    );
    r = await isSlotBlocked(court4._id, tomorrow, "20:00", "21:00");
    ok(!r.blocked, "bỏ qua báo cáo (dismissal) → sân nhận đặt lại");
    const bulk2 = await bulkCheckConflicts(court4._id, [
      { date: todayStr(), startTime: "10:30", endTime: "11:00" },
      { date: tomorrow, startTime: "08:00", endTime: "09:00" },
    ]);
    ok(
      bulk2.length === 1 && bulk2[0] === todayStr(),
      `bulk chỉ conflict đúng ngày có cửa sổ (${bulk2.join(",") || "trống"})`,
    );

    // Xóa mềm phiếu → không còn chặn
    const w1f = await Maintenance.findById(w1._id);
    w1f.isDeleted = true;
    await w1f.save();
    r = await isSlotBlocked(court4._id, todayStr(), "10:30", "11:00");
    ok(!r.blocked, "phiếu đã xóa mềm → thôi chặn slot");

    console.log(`\n🎉 TẤT CẢ ${passed} CHECK ĐẠT`);
  } finally {
    // ---- Dọn dữ liệu test ----
    const ids = [court, court2, court3, court4].filter(Boolean).map((c) => c._id);
    await Maintenance.deleteMany({ _id: { $in: created } });
    await MaintenanceLog.deleteMany({ court: { $in: ids } });
    await Inspection.deleteMany({ court: { $in: ids } });
    await ChecklistTemplate.deleteMany({ item: "TEST mục kiểm tra" });
    await Court.deleteMany({ _id: { $in: ids } });
    console.log("🧹 Đã dọn dữ liệu test");
    await mongoose.disconnect();
  }
};

run().catch((err) => {
  console.error(`\n❌ ${err.message}`);
  process.exit(1);
});
