/**
 * testPhase4API.js
 * Test end-to-end Phase 4 (Kiểm tra sân & báo cáo) qua HTTP API thật:
 *   node testPhase4API.js   (script tự khởi động server + tự dọn dữ liệu test)
 */

require("dotenv").config();
const net = require("net");
const mongoose = require("mongoose");

const PORT = process.env.PORT || 5000;
const BASE = `http://localhost:${PORT}/api`;
const FUTURE = "2030-01-01"; // phiếu test đặt ngày xa → không đụng booking thật
const TEST_TAG = "TEST-PHASE4";

let passed = 0;
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
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
};

const run = async () => {
  // ---- server: dùng server đang chạy nếu cổng trống thì tự khởi động ----
  const portBusy = await new Promise((resolve) => {
    const s = net.connect(PORT, "localhost", () => {
      s.destroy();
      resolve(true);
    });
    s.on("error", () => resolve(false));
    s.setTimeout(700);
    s.on("timeout", () => { s.destroy(); resolve(false); });
  });

  if (portBusy) {
    console.log(`ℹ️ Cổng ${PORT} có server đang chạy — test trực tiếp trên đó`);
    const probe = await fetch(`${BASE}/inspections/checklist`).catch(() => null);
    if (!probe || probe.status === 404) {
      throw new Error(
        "Server đang chạy chưa nạp route /api/inspections — khởi động lại backend rồi chạy lại test",
      );
    }
  } else {
    require("./server.js");
    await new Promise((r) => setTimeout(r, 2500));
  }

  // kết nối riêng cho phần cleanup (nếu server tự khởi động thì đã có sẵn)
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  }

  console.log("--- 1. Đăng nhập + checklist ---");
  const adminLogin = await jf(`${BASE}/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email: "admin@badminton.com", password: "admin123" }),
  });
  ok(adminLogin.status === 200 && adminLogin.body.token, "login admin");
  const admin = adminLogin.body.token;

  let staffLogin = await jf(`${BASE}/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email: "posstaff@badminton.com", password: "123456" }),
  });
  if (!staffLogin.body.token) {
    // seedPOS chưa chạy → tạo user pos_staff tạm (dọn sau)
    const User = require("./src/models/User");
    await User.create({
      name: "TEST staff",
      email: `${TEST_TAG.toLowerCase()}@test.local`,
      password: "123456",
      role: "pos_staff",
      phone: "000000000",
    });
    staffLogin = await jf(`${BASE}/auth/login`, {
      method: "POST",
      body: JSON.stringify({ email: `${TEST_TAG.toLowerCase()}@test.local`, password: "123456" }),
    });
  }
  ok(staffLogin.status === 200 && staffLogin.body.token, "login pos_staff");
  const staff = staffLogin.body.token;

  const cl = await jf(`${BASE}/inspections/checklist`, {}, staff);
  ok(cl.status === 200 && Array.isArray(cl.body.items), `GET checklist (${cl.body.items?.length} mục)`);

  const courtsRes = await jf(`${BASE}/courts`, {}, admin);
  const courts = courtsRes.body.courts || [];
  ok(courts.length > 0, "có sân để test");
  const court = courts.find((c) => c.status === "active") || courts[0];

  console.log("\n--- 2. Nhân viên gửi báo cáo critical → sân tạm ngưng ---");
  const countBefore = (await jf(`${BASE}/inspections/pending-count`, {}, admin)).body.count;
  const insp1 = await jf(`${BASE}/inspections`, {
    method: "POST",
    body: JSON.stringify({
      court: court._id,
      items: [{ item: `${TEST_TAG} sàn trơn`, category: "floor", result: "fail", note: "trợt hết" }],
      severity: "critical",
      note: `${TEST_TAG} báo cáo nghiêm trọng`,
    }),
  }, staff);
  ok(insp1.status === 201 && insp1.body.courtSuspended === true, "báo cáo critical accepted + courtSuspended=true");

  const countMid = (await jf(`${BASE}/inspections/pending-count`, {}, admin)).body.count;
  ok(countMid === countBefore + 1, `pending-count tăng 1 (${countBefore} → ${countMid})`);

  console.log("\n--- 3. Admin tạo phiếu từ báo cáo → báo cáo thành 'Đã tạo phiếu' ---");
  const ticket = await jf(`${BASE}/maintenance`, {
    method: "POST",
    body: JSON.stringify({
      court: court._id,
      title: `${TEST_TAG} phiếu từ báo cáo`,
      startDate: FUTURE,
      endDate: FUTURE,
      startTime: "00:00",
      endTime: "01:00",
      priority: "urgent",
      requiresClosure: true,
      inspection: insp1.body.inspection._id,
    }),
  }, admin);
  ok(ticket.status === 201 && ticket.body.maintenance.inspection, "tạo phiếu linkage inspection ✓");

  const pendingList = await jf(`${BASE}/inspections?status=pending`, {}, admin);
  ok(
    !pendingList.body.inspections.some((i) => i._id === insp1.body.inspection._id),
    "báo cáo không còn trong pending",
  );
  const ticketedList = await jf(`${BASE}/inspections?status=ticketed`, {}, admin);
  const mine = ticketedList.body.inspections.find((i) => i._id === insp1.body.inspection._id);
  ok(!!mine && mine.ticket.ticketCode, "nằm trong ticketed kèm ticketCode");

  const dismissLinked = await jf(`${BASE}/inspections/${insp1.body.inspection._id}/dismiss`, {
    method: "PUT",
    body: JSON.stringify({ reason: "thử bỏ qua phiếu đã tạo" }),
  }, admin);
  ok(dismissLinked.status === 400, "báo cáo ĐÃ CÓ phiếu → không dismiss được (400)");

  console.log("\n--- 4. Dismiss báo cáo thường ---");
  const insp2 = await jf(`${BASE}/inspections`, {
    method: "POST",
    body: JSON.stringify({
      court: court._id,
      items: [],
      severity: "needs_repair",
      note: `${TEST_TAG} cần sửa nhẹ`,
    }),
  }, staff);
  ok(insp2.status === 201, "gửi báo cáo needs_repair");

  const dismissNoReason = await jf(`${BASE}/inspections/${insp2.body.inspection._id}/dismiss`, {
    method: "PUT",
    body: JSON.stringify({}),
  }, admin);
  ok(dismissNoReason.status === 400, "dismiss không lý do → 400");

  const dismissOk = await jf(`${BASE}/inspections/${insp2.body.inspection._id}/dismiss`, {
    method: "PUT",
    body: JSON.stringify({ reason: `${TEST_TAG} xem lại không sao` }),
  }, admin);
  ok(dismissOk.status === 200, "dismiss có lý do → 200");

  const countAfter = (await jf(`${BASE}/inspections/pending-count`, {}, admin)).body.count;
  ok(countAfter === countBefore, `pending-count về mốc cũ (còn phiếu link báo cáo 1 đã xử lý = ${countAfter})`);

  // customer bị chặn? (Phase 3 đã test kỹ ở service level — ở đây chỉ smoke 1 slot)
  const blocked = await jf(`${BASE}/bookings`, {
    method: "POST",
    body: JSON.stringify({
      court: court._id,
      date: FUTURE,
      startTime: "00:15",
      endTime: "00:45",
    }),
  }, staff);
  ok([400, 401, 403].includes(blocked.status), `đặt slot trùng cửa sổ phiếu bị chặn (HTTP ${blocked.status})`);

  console.log(`\n🎉 TẤT CẢ ${passed} CHECK ĐẠT`);
};

const cleanup = async () => {
  try {
    const Maintenance = require("./src/models/Maintenance");
    const Inspection = require("./src/models/Inspection");
    const User = require("./src/models/User");
    await Maintenance.deleteMany({ title: { $regex: TEST_TAG } });
    await Inspection.deleteMany({ note: { $regex: TEST_TAG } });
    await User.deleteMany({ email: { $regex: TEST_TAG.toLowerCase() } });
    console.log("🧹 Đã dọn dữ liệu test");
  } catch (e) {
    console.error("⚠️ Dọn dữ liệu lỗi:", e.message);
  }
};

run()
  .then(async () => {
    await cleanup();
    await mongoose.disconnect().catch(() => {});
    process.exit(0);
  })
  .catch(async (err) => {
    console.error(`\n❌ ${err.message}`);
    await cleanup();
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
