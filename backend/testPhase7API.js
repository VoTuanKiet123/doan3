/**
 * testPhase7API.js
 * Test Phase 7 (Báo cáo bảo trì N1.11 + thống kê kiểm tra N2.11 + mẫu số công suất):
 *   node testPhase7API.js
 * Cách đo: chạy 1 chu trình_complete với chi phí ĐÃ BIẾT, so hiệu summary trước/sau
 * → khỏi phụ thuộc dữ liệu seed có sẵn trong DB.
 */

require("dotenv").config();
const net = require("net");
const mongoose = require("mongoose");

const PORT = process.env.PORT || 5000;
const BASE = `http://localhost:${PORT}/api`;
const FUTURE = "2030-01-04";
const TAG = "TEST-PHASE7";
const LABOR = 120000;
const MATERIAL = 80000; // costTotal kỳ vọng = 200000

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

const run = async () => {
  const portBusy = await new Promise((resolve) => {
    const s = net.connect(PORT, "localhost", () => { s.destroy(); resolve(true); });
    s.on("error", () => resolve(false));
    s.setTimeout(700);
    s.on("timeout", () => { s.destroy(); resolve(false); });
  });
  if (portBusy) {
    console.log(`ℹ️ Cổng ${PORT} có server đang chạy — test trực tiếp`);
    const probe = await fetch(`${BASE}/analytics/maintenance`).catch(() => null);
    if (!probe || probe.status === 404)
      throw new Error("Server chưa có /analytics/maintenance — khởi động lại backend");
  } else {
    require("./server.js");
    await new Promise((r) => setTimeout(r, 2500));
  }
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_URI);

  const User = require("./src/models/User");
  const email = `${TAG.toLowerCase()}@test.local`;
  if (!(await User.findOne({ email })))
    await User.create({ name: "TEST staff7", email, password: "123456", role: "pos_staff", phone: "000000001" });

  const admin = await login("admin@badminton.com", "admin123");
  const staff = await login(email, "123456");

  const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const today = ymd(new Date());
  const monthAgo = ymd(new Date(Date.now() - 30 * 86400000));
  const ANA = `${BASE}/analytics/maintenance?from=${monthAgo}&to=${today}`;

  const before = (await jf(ANA, {}, admin)).body.data;
  ok(before?.summary != null && before?.inspection != null, "GET /analytics/maintenance trả cấu trúc đủ");

  const courts = (await jf(`${BASE}/courts`, {}, admin)).body.courts;
  const court = courts.find((c) => c.status === "active");
  testCourtId = court._id;

  console.log("\n--- 1. Chu trình đủ BIẾT TRƯỚC KẾT QUẢ: labor 120k + material 80k ---");
  const t1 = await jf(`${BASE}/maintenance`, {
    method: "POST",
    body: JSON.stringify({ court: court._id, title: `${TAG} đèn`, startDate: FUTURE, endDate: FUTURE, startTime: "00:00", endTime: "01:00", category: "lighting" }),
  }, admin);
  const tid = t1.body.maintenance._id;
  await jf(`${BASE}/maintenance-logs/start`, { method: "POST", body: JSON.stringify({ ticketId: tid }) }, staff);
  const startRes = (await jf(`${BASE}/maintenance-logs/queue`, {}, staff)).body;
  const myLog = (await jf(`${BASE}/maintenance-logs?ticket=${tid}`, {}, staff)).body.logs[0];
  await jf(`${BASE}/maintenance-logs/${myLog._id}`, {
    method: "PUT",
    body: JSON.stringify({ laborCost: LABOR, materialCost: MATERIAL, steps: [{ description: "thay 4 bóng" }] }),
  }, staff);
  await jf(`${BASE}/maintenance-logs/finish`, { method: "POST", body: JSON.stringify({ ticketId: tid }) }, staff);
  await jf(`${BASE}/inspections/acceptance`, { method: "POST", body: JSON.stringify({ ticketId: tid, result: "pass" }) }, staff);
  const done = await jf(`${BASE}/maintenance/${tid}/status`, { method: "PUT", body: JSON.stringify({ status: "completed" }) }, admin);
  ok(done.status === 200 && done.body.maintenance.costTotal === LABOR + MATERIAL, `duyệt xong costTotal = ${done.body.maintenance.costTotal} (đúng 200k)`);

  console.log("\n--- 2. Nhà thầu + đường legacy (in_progress→completed + cost) ---");
  const t2 = await jf(`${BASE}/maintenance`, {
    method: "POST",
    body: JSON.stringify({ court: court._id, title: `${TAG} san nha thau`, startDate: FUTURE, endDate: FUTURE, startTime: "01:00", endTime: "02:00", category: "floor", executorType: "contractor", assignedTo: "TEST vendor X", contractor: { name: "TEST vendor X", phone: "0900111222" } }),
  }, admin);
  const tid2 = t2.body.maintenance._id;
  await jf(`${BASE}/maintenance/${tid2}/status`, { method: "PUT", body: JSON.stringify({ status: "in_progress" }) }, admin);
  const done2 = await jf(`${BASE}/maintenance/${tid2}/status`, { method: "PUT", body: JSON.stringify({ status: "completed", cost: 300000, completionNote: "legacy path" }) }, admin);
  ok(done2.status === 200, "legacy in_progress→completed không cần acceptance (nối tắt có chủ đích)");

  console.log("\n--- 3. Báo cáo khớp hiệu số ---");
  const after = (await jf(ANA, {}, admin)).body.data;
  ok(after.summary.ticketCount - before.summary.ticketCount === 2, `ticketCount +2 (${before.summary.ticketCount} → ${after.summary.ticketCount})`);
  ok(after.summary.totalCost - before.summary.totalCost === 200000 + 300000, `totalCost +500000 (diff = ${after.summary.totalCost - before.summary.totalCost})`);

  const catLighting = (row) => (row.byCategory.find((c) => c._id === "lighting")?.cost || 0);
  ok(catLighting(after) - catLighting(before) === 200000, "byCategory lighting tăng đúng 200k");

  const vendor = after.contractors.find((c) => c._id === "TEST vendor X");
  ok(vendor && vendor.cost === 300000, `contractors so sánh: TEST vendor X = ${vendor?.cost}đ`);

  const rowCourt = after.byCourt.find((c) => String(c.courtId) === String(court._id));
  ok(rowCourt && rowCourt.count >= 2, "byCourt có sân test với ≥2 phiếu");

  console.log("\n--- 4. N2.11 thống kê kiểm tra + mẫu số công suất ---");
  // báo cáo routine có mục fail trên test court → failingItems
  await jf(`${BASE}/inspections`, {
    method: "POST",
    body: JSON.stringify({
      court: court._id,
      severity: "needs_repair",
      note: `${TAG} báo để test stat`,
      items: [
        { item: "TEST mục: đèn nhấp nháy", category: "lighting", result: "fail" },
        { item: "TEST mục: sàn trơn", category: "floor", result: "attention" },
      ],
    }),
  }, staff);
  const after2 = (await jf(ANA, {}, admin)).body.data;
  ok(
    after2.inspection.failingItems.some((f) => f._id.item === "TEST mục: đèn nhấp nháy"),
    "failingItems thống kê đúng mục hỏng",
  );
  ok(
    after2.inspection.acceptancePassRate !== null && after2.inspection.acceptancePassRate > 0,
    `acceptancePassRate = ${after2.inspection.acceptancePassRate}%`,
  );
  ok(
    after2.inspection.uninspectedCourtsToday >= 0 && after2.inspection.uninspectedCourtsToday <= after2.inspection.totalActiveCourts,
    `sân chưa kiểm hôm nay: ${after2.inspection.uninspectedCourtsToday}/${after2.inspection.totalActiveCourts}`,
  );

  // occupancy: ngày FUTURE có phiếu ĐÓNG sân (chưa cancel) vẫn tính vào loại trừ;
  // test nhanh bằng window chứa FUTURE:
  // occupancy: FUTURE có phiếu ĐÓNG sân phủ → isMaintenance true;
  // vùng 2030-01-10..12 KHÔNG có phiếu nào (seed/test đều không phủ) → false
  const occ = await jf(`${BASE}/analytics/occupancy-rate?startDate=${today}&endDate=${FUTURE}`, {}, admin);
  const cRow = occ.body.data?.courtOccupancy?.find((c) => String(c.courtId) === String(court._id));
  const dayRow = cRow?.dailyDetail?.find((d) => d.date === FUTURE);
  ok(occ.status === 200 && dayRow?.isMaintenance === true, "occupancy: ngày bị phiếu đóng sân phủ → isMaintenance = true");
  const occClean = await jf(`${BASE}/analytics/occupancy-rate?startDate=2030-01-10&endDate=2030-01-12`, {}, admin);
  const cleanRow = occClean.body.data?.courtOccupancy?.find((c) => String(c.courtId) === String(court._id));
  ok(
    cleanRow?.dailyDetail?.every((d) => d.isMaintenance === false),
    "ngày không có phiếu đóng → không loại khỏi mẫu số",
  );

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
  // báo cáo routine test gắn note TAG
  try {
    const Inspection = require("./src/models/Inspection");
    await Inspection.deleteMany({ note: { $regex: TAG } });
  } catch {}
};

run()
  .then(async () => { await cleanup(); await mongoose.disconnect().catch(() => {}); process.exit(0); })
  .catch(async (err) => { console.error(`\n❌ ${err.message}`); await cleanup(); await mongoose.disconnect().catch(() => {}); process.exit(1); });
