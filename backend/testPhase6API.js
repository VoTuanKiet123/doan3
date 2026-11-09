/**
 * testPhase6API.js
 * Test end-to-end Phase 6 (Nghiệm thu & duyệt — N2.10 + N1.8):
 *   node testPhase6API.js
 * Gate: completed từ pending_acceptance CẦN lần acceptance gần nhất = pass;
 * fail không lý do bị chặn; trả về làm lại cần lý do; acceptance chỉ khi chờ nghiệm thu.
 */

require("dotenv").config();
const net = require("net");
const mongoose = require("mongoose");

const PORT = process.env.PORT || 5000;
const BASE = `http://localhost:${PORT}/api`;
const FUTURE = "2030-01-03";
const TAG = "TEST-PHASE6";

let passed = 0;
let testCourtId = null;

const ok = (cond, msg) => {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  passed++;
  console.log(`  ✅ ${msg}`);
};

const jf = async (url, opts = {}, token) => {
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
};

const login = async (email, password) =>
  (await jf(`${BASE}/auth/login`, { method: "POST", body: JSON.stringify({ email, password }) })).body.token;

const acceptance = (body, token) =>
  jf(`${BASE}/inspections/acceptance`, { method: "POST", body: JSON.stringify(body) }, token);

const run = async () => {
  const portBusy = await new Promise((resolve) => {
    const s = net.connect(PORT, "localhost", () => { s.destroy(); resolve(true); });
    s.on("error", () => resolve(false));
    s.setTimeout(700);
    s.on("timeout", () => { s.destroy(); resolve(false); });
  });
  if (portBusy) {
    console.log(`ℹ️ Cổng ${PORT} có server đang chạy — test trực tiếp`);
    const probe = await fetch(`${BASE}/maintenance-logs/queue`).catch(() => null);
    if (!probe || probe.status === 404) throw new Error("Server chưa nạp /api/maintenance-logs — khởi động lại backend");
  } else {
    require("./server.js");
    await new Promise((r) => setTimeout(r, 2500));
  }
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_URI);

  const User = require("./src/models/User");
  const email = `${TAG.toLowerCase()}@test.local`;
  if (!(await User.findOne({ email })))
    await User.create({ name: "TEST staff6", email, password: "123456", role: "pos_staff", phone: "000000001" });

  const admin = await login("admin@badminton.com", "admin123");
  const staff = await login(email, "123456");

  const court = (await jf(`${BASE}/courts`, {}, admin)).body.courts.find((c) => c.status === "active");
  testCourtId = court._id;

  // ---- đưa phiếu vào pending_acceptance ----
  const ticket = await jf(`${BASE}/maintenance`, {
    method: "POST",
    body: JSON.stringify({ court: court._id, title: `${TAG} đèn nhấp nháy`, startDate: FUTURE, endDate: FUTURE, startTime: "00:00", endTime: "01:00" }),
  }, admin);
  const tid = ticket.body.maintenance._id;
  await jf(`${BASE}/maintenance-logs/start`, { method: "POST", body: JSON.stringify({ ticketId: tid }) }, staff);
  await jf(`${BASE}/maintenance-logs/finish`, { method: "POST", body: JSON.stringify({ ticketId: tid }) }, staff);

  console.log("\n--- 1. Gate: duyệt khi chưa kiểm tra lại ---");
  const noAcc = await jf(`${BASE}/maintenance/${tid}/status`, { method: "PUT", body: JSON.stringify({ status: "completed" }) }, admin);
  ok(noAcc.status === 400 && /kiểm tra lại/.test(noAcc.body.message), `chưa có acceptance → chặn (400: ${noAcc.body.message?.slice(0, 60)}...)`);

  console.log("\n--- 2. Acceptance fail → vẫn chặn duyệt; pass → được duyệt ---");
  const failNoReason = await acceptance({ ticketId: tid, result: "fail" }, staff);
  ok(failNoReason.status === 400, "fail không lý do → 400");
  const fail1 = await acceptance({
    ticketId: tid,
    result: "fail",
    failReason: "Đèn vẫn nháy khi bật đủ tải",
    items: [{ item: "Đèn sân", category: "lighting", result: "fail" }],
  }, staff);
  ok(fail1.status === 201, "gửi acceptance KHÔNG đạt (có lý do)");
  const afterFail = await jf(`${BASE}/maintenance/${tid}/status`, { method: "PUT", body: JSON.stringify({ status: "completed" }) }, admin);
  ok(afterFail.status === 400 && /KHÔNG ĐẠT/.test(afterFail.body.message), "lần gần nhất = fail → duyệt vẫn bị chặn");

  console.log("\n--- 3. Trả về làm lại ---");
  const reworkNoNote = await jf(`${BASE}/maintenance/${tid}/status`, { method: "PUT", body: JSON.stringify({ status: "in_progress" }) }, admin);
  ok(reworkNoNote.status === 400, "trả về không lý do → 400");
  const rework = await jf(`${BASE}/maintenance/${tid}/status`, {
    method: "PUT",
    body: JSON.stringify({ status: "in_progress", completionNote: "sửa lại lần 2" }),
  }, admin);
  ok(rework.status === 200, "trả về làm lại → in_progress (lý do vào timeline)");
  const wrongState = await acceptance({ ticketId: tid, result: "pass" }, staff);
  ok(wrongState.status === 400, "acceptance khi phiếu đang in_progress → 400");

  console.log("\n--- 4. Chu trình 2: finish → pass → duyệt + 'gần nhất được tính' ---");
  await jf(`${BASE}/maintenance-logs/start`, { method: "POST", body: JSON.stringify({ ticketId: tid }) }, staff);
  await jf(`${BASE}/maintenance-logs/finish`, { method: "POST", body: JSON.stringify({ ticketId: tid }) }, staff);
  const pass2 = await acceptance({
    ticketId: tid,
    result: "pass",
    items: [{ item: "Đèn sân", category: "lighting", result: "ok" }],
  }, staff);
  ok(pass2.status === 201, "acceptance ĐẠT lần 2 (lần fail cũ không còn là gần nhất)");
  const approve = await jf(`${BASE}/maintenance/${tid}/status`, {
    method: "PUT",
    body: JSON.stringify({ status: "completed", completionNote: "duyệt theo nghiệm thu đạt" }),
  }, admin);
  ok(approve.status === 200, "Admin duyệt HOÀN THÀNH ✓ (cảnh 5)");

  const detail = (await jf(`${BASE}/maintenance/${tid}`, {}, admin)).body;
  const accs = detail.inspections.filter((i) => i.type === "acceptance");
  ok(accs.length === 2, `detail hiện 2 lần kiểm tra lại (${accs.length})`);
  const court2 = (await jf(`${BASE}/courts`, {}, admin)).body.courts.find((c) => c._id === court._id);
  ok(court2.status === "active", "duyệt xong → sân mở lại");

  const queue = (await jf(`${BASE}/maintenance-logs/queue`, {}, staff)).body;
  ok(!queue.acceptanceTasks.some((t) => t._id === tid), "phiếu đã completed biến mất khỏi danh sách chờ nghiệm thu");

  // acceptanceTasks + lastAcceptance hiển thị đúng khi đang chờ
  const t2 = await jf(`${BASE}/maintenance`, {
    method: "POST",
    body: JSON.stringify({ court: court._id, title: `${TAG} hàng đợi acc`, startDate: FUTURE, endDate: FUTURE, startTime: "00:00", endTime: "01:00" }),
  }, admin);
  await jf(`${BASE}/maintenance-logs/start`, { method: "POST", body: JSON.stringify({ ticketId: t2.body.maintenance._id }) }, staff);
  await jf(`${BASE}/maintenance-logs/finish`, { method: "POST", body: JSON.stringify({ ticketId: t2.body.maintenance._id }) }, staff);
  const q2 = (await jf(`${BASE}/maintenance-logs/queue`, {}, staff)).body;
  const row = q2.acceptanceTasks.find((t) => t._id === t2.body.maintenance._id);
  ok(row && row.lastAcceptance === null, "queue.acceptanceTasks có phiếu mới, chưa kiểm lại (lastAcceptance=null)");
  await acceptance({ ticketId: t2.body.maintenance._id, result: "pass" }, staff);
  const q3 = (await jf(`${BASE}/maintenance-logs/queue`, {}, staff)).body;
  const row3 = q3.acceptanceTasks.find((t) => t._id === t2.body.maintenance._id);
  ok(row3?.lastAcceptance?.result === "pass", "lastAcceptance cập nhật = pass");
  // dọn luôn t2 về trạng thái xóa được
  await jf(`${BASE}/maintenance/${t2.body.maintenance._id}/status`, { method: "PUT", body: JSON.stringify({ status: "cancelled", completionNote: `${TAG} dọn test` }) }, admin);

  console.log(`\n🎉 TẤT CẢ ${passed} CHECK ĐẠT`);
};

const cleanup = async () => {
  try {
    const Maintenance = require("./src/models/Maintenance");
    const MaintenanceLog = require("./src/models/MaintenanceLog");
    const Inspection = require("./src/models/Inspection");
    const User = require("./src/models/User");
    const tids = await Maintenance.find({ title: { $regex: TAG } }).distinct("_id");
    await MaintenanceLog.deleteMany({ ticket: { $in: tids } });
    await Inspection.deleteMany({ ticket: { $in: tids } });
    await Maintenance.deleteMany({ title: { $regex: TAG } });
    await User.deleteMany({ email: { $regex: TAG.toLowerCase() } });
    if (testCourtId) {
      const Court = require("./src/models/Court");
      await Court.updateOne({ _id: testCourtId, status: "maintenance" }, { status: "active" });
    }
    console.log("🧹 Đã dọn dữ liệu test");
  } catch (e) {
    console.error("⚠️ Dọn dữ liệu lỗi:", e.message);
  }
};

run()
  .then(async () => { await cleanup(); await mongoose.disconnect().catch(() => {}); process.exit(0); })
  .catch(async (err) => { console.error(`\n❌ ${err.message}`); await cleanup(); await mongoose.disconnect().catch(() => {}); process.exit(1); });
