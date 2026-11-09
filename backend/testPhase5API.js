/**
 * testPhase5API.js
 * Test end-to-end Phase 5 (POS thực hiện bảo trì) qua HTTP API thật:
 *   node testPhase5API.js
 * Lifecycle: queue → start (A) → 409 (B) → ghi log → pause → resume → finish →
 * void → Admin duyệt → cost chốt từ log. Tự tạo + tự dọn user test.
 */

require("dotenv").config();
const net = require("net");
const mongoose = require("mongoose");

const PORT = process.env.PORT || 5000;
const BASE = `http://localhost:${PORT}/api`;
const FUTURE = "2030-01-02";
const TAG = "TEST-PHASE5";

let passed = 0;
let testCourtId = null; // sân mà test chiếm — chỉ hoàn tác đúng nó, không đụng sân seed
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
  (await jf(`${BASE}/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })).body.token;

const run = async () => {
  const portBusy = await new Promise((resolve) => {
    const s = net.connect(PORT, "localhost", () => { s.destroy(); resolve(true); });
    s.on("error", () => resolve(false));
    s.setTimeout(700);
    s.on("timeout", () => { s.destroy(); resolve(false); });
  });
  if (portBusy) {
    console.log(`ℹ️ Cổng ${PORT} có server đang chạy — test trực tiếp trên đó`);
    const probe = await fetch(`${BASE}/maintenance-logs/queue`).catch(() => null);
    if (!probe || probe.status === 404)
      throw new Error("Server chưa nạp /api/maintenance-logs — khởi động lại backend");
  } else {
    require("./server.js");
    await new Promise((r) => setTimeout(r, 2500));
  }
  if (mongoose.connection.readyState === 0)
    await mongoose.connect(process.env.MONGODB_URI);

  // ---- 2 nhân viên test ----
  const User = require("./src/models/User");
  for (const c of ["a", "b"]) {
    const email = `${TAG.toLowerCase()}-${c}@test.local`;
    if (!(await User.findOne({ email })))
      await User.create({ name: `TEST staff ${c}`, email, password: "123456", role: "pos_staff", phone: "000000001" });
  }

  const admin = await login("admin@badminton.com", "admin123");
  const staffA = await login(`${TAG.toLowerCase()}-a@test.local`, "123456");
  const staffB = await login(`${TAG.toLowerCase()}-b@test.local`, "123456");
  ok(admin && staffA && staffB, "login admin + 2 nhân viên");

  const courts = (await jf(`${BASE}/courts`, {}, admin)).body.courts;
  const court = courts.find((c) => c.status === "active");
  testCourtId = court?._id;
  ok(!!court, "có sân active");

  console.log("\n--- 1. Tao phieu + queue ---");
  const ticket = await jf(`${BASE}/maintenance`, {
    method: "POST",
    body: JSON.stringify({
      court: court._id,
      title: `${TAG} doi cau`,
      startDate: FUTURE,
      endDate: FUTURE,
      startTime: "00:00",
      endTime: "01:00",
      priority: "high",
    }),
  }, admin);
  const tid = ticket.body.maintenance?._id;
  ok(ticket.status === 201 && tid, "tạo phiếu test");

  let queue = (await jf(`${BASE}/maintenance-logs/queue`, {}, staffA)).body;
  ok(
    queue.tickets?.some((t) => t._id === tid && t.openBy === null && t.overdue === false),
    "queue hiện phiếu, chưa ai nhận, chưa quá hạn",
  );

  console.log("\n--- 2. start: A nhận → B bị chặn ---");
  const startA = await jf(`${BASE}/maintenance-logs/start`, {
    method: "POST",
    body: JSON.stringify({ ticketId: tid }),
  }, staffA);
  ok(startA.status === 201 && startA.body.log?._id, "A mở ca, phiếu → in_progress");
  const cAfter = (await jf(`${BASE}/courts/${court._id}`, {}, admin)).body.court || (await jf(`${BASE}/courts`, {}, admin)).body.courts.find((c) => c._id === court._id);
  ok(cAfter?.status === "maintenance", "sân đóng khi bắt đầu (requiresClosure)");

  const startB = await jf(`${BASE}/maintenance-logs/start`, {
    method: "POST",
    body: JSON.stringify({ ticketId: tid }),
  }, staffB);
  ok(startB.status === 409, "B nhận cùng phiếu → 409 (unique index)");

  console.log("\n--- 3. ghi / sửa nhật ký ---");
  const logId = startA.body.log._id;
  const wrongHands = await jf(`${BASE}/maintenance-logs/${logId}`, {
    method: "PUT",
    body: JSON.stringify({ workDone: "sai tay" }),
  }, staffB);
  ok(wrongHands.status === 403, "B sửa log của A → 403");

  const put1 = await jf(`${BASE}/maintenance-logs/${logId}`, {
    method: "PUT",
    body: JSON.stringify({
      steps: [{ description: "Tháo trụ cũ" }, { description: "Dựng trụ mới" }],
      materialsUsed: [{ name: "Trụ lưới", qty: 2, unitCost: 300000 }],
      laborCost: 100000,
      materialCost: 600000,
      workDone: "Đổi 2 trụ",
    }),
  }, staffA);
  ok(put1.status === 200 && put1.body.log.steps.length === 2, "A lưu nội dung ca");

  console.log("\n--- 4. pause → resume → finish ---");
  const pauseNoReason = await jf(`${BASE}/maintenance-logs/pause`, {
    method: "POST",
    body: JSON.stringify({ ticketId: tid }),
  }, staffA);
  ok(pauseNoReason.status === 400, "pause không lý do → 400");

  const pause = await jf(`${BASE}/maintenance-logs/pause`, {
    method: "POST",
    body: JSON.stringify({ ticketId: tid, reason: "chờ vật tư" }),
  }, staffA);
  ok(pause.status === 200, "pause → on_hold (lý do vào timeline)");

  const startA2 = await jf(`${BASE}/maintenance-logs/start`, {
    method: "POST",
    body: JSON.stringify({ ticketId: tid }),
  }, staffA);
  ok(startA2.status === 201 && startA2.body.log._id !== logId, "resume: ca MỚI cho cùng phiếu");
  const logId2 = startA2.body.log._id;
  await jf(`${BASE}/maintenance-logs/${logId2}`, {
    method: "PUT",
    body: JSON.stringify({ steps: [{ description: "Căng lại dây" }], laborCost: 50000, materialCost: 50000 }),
  }, staffA);

  const finishB = await jf(`${BASE}/maintenance-logs/finish`, {
    method: "POST",
    body: JSON.stringify({ ticketId: tid }),
  }, staffB);
  ok(finishB.status === 403, "B finish ca của A → 403");

  const finish = await jf(`${BASE}/maintenance-logs/finish`, {
    method: "POST",
    body: JSON.stringify({ ticketId: tid }),
  }, staffA);
  ok(finish.status === 200, "A finish → pending_acceptance");
  const c2 = (await jf(`${BASE}/courts`, {}, admin)).body.courts.find((c) => c._id === court._id);
  ok(c2.status === "maintenance", "sân VẪN đóng ở pending_acceptance (cảnh 4)");

  queue = (await jf(`${BASE}/maintenance-logs/queue`, {}, staffA)).body;
  ok(!queue.tickets.some((t) => t._id === tid), "phiếu chờ nghiệm thu biến mất khỏi hàng đợi POS");

  const finishAgain = await jf(`${BASE}/maintenance-logs/finish`, {
    method: "POST",
    body: JSON.stringify({ ticketId: tid }),
  }, staffA);
  ok(finishAgain.status === 400, "finish lần 2 (không còn ca mở) → 400");

  console.log("\n--- 5. void log + acceptance đạt + Admin duyệt + cost từ log ---");
  const accPass = await jf(`${BASE}/inspections/acceptance`, {
    method: "POST",
    body: JSON.stringify({
      ticketId: tid,
      result: "pass",
      items: [{ item: "Trụ chắc, lưới căng", category: "net_post", result: "ok" }],
    }),
  }, staffA);
  ok(accPass.status === 201, "A kiểm tra lại ĐẠT (N2.10) — đủ điều kiện để Admin duyệt");
  const voidNoReason = await jf(`${BASE}/maintenance-logs/${logId}/void`, { method: "POST", body: JSON.stringify({}) }, staffA);
  ok(voidNoReason.status === 400, "void không lý do → 400");
  const void1 = await jf(`${BASE}/maintenance-logs/${logId}/void`, {
    method: "POST",
    body: JSON.stringify({ reason: "ghi nhầm phiếu" }),
  }, staffA);
  ok(void1.status === 200, "void ca 1 (log cũ đã closed vẫn void được khi phiếu chưa completed)");

  const approve = await jf(`${BASE}/maintenance/${tid}/status`, {
    method: "PUT",
    body: JSON.stringify({ status: "completed", completionNote: "đạt", cost: 700000 }),
  }, admin);
  ok(approve.status === 200, "Admin duyệt → completed");
  const done = (await jf(`${BASE}/maintenance/${tid}`, {}, admin)).body;
  ok(done.maintenance.costLabor === 50000, `costLabor chốt từ log KHÔNG voided (=${done.maintenance.costLabor})`);
  ok(done.maintenance.costMaterial === 50000, `costMaterial (=${done.maintenance.costMaterial})`);
  ok(done.maintenance.costTotal === 50000 + 50000 + 700000, `costTotal = 3 nguồn (=${done.maintenance.costTotal})`);
  ok(done.maintenance.downtimeMinutes != null, "downtimeMinutes đã tính");
  const c3 = (await jf(`${BASE}/courts`, {}, admin)).body.courts.find((c) => c._id === court._id);
  ok(c3.status === "active", "completed → sân mở lại");

  const editAfterDone = await jf(`${BASE}/maintenance-logs/${logId2}`, {
    method: "PUT",
    body: JSON.stringify({ workDone: "sửa thử" }),
  }, staffA);
  ok(editAfterDone.status === 403, "log của phiếu completed → khóa (403)");

  console.log(`\n🎉 TẤT CẢ ${passed} CHECK ĐẠT`);
};

const cleanup = async () => {
  try {
    const Maintenance = require("./src/models/Maintenance");
    const MaintenanceLog = require("./src/models/MaintenanceLog");
    const Inspection = require("./src/models/Inspection");
    const User = require("./src/models/User");
    const tagTids = await Maintenance.find({ title: { $regex: TAG } }).distinct("_id");
    await MaintenanceLog.deleteMany({ ticket: { $in: tagTids } });
    await Inspection.deleteMany({ ticket: { $in: tagTids } });
    await Maintenance.deleteMany({ title: { $regex: TAG } });
    await Inspection.deleteMany({ note: { $regex: TAG } });
    await User.deleteMany({ email: { $regex: TAG.toLowerCase() } });
    // hoàn tác đúng sân test dùng (phòng fail giữa chừng khi sân đang maintenance)
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
