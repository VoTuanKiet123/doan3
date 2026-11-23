/**
 * testEventsAPI.js
 * Test end-to-end Quản lý giải đấu (Phase 1) qua HTTP API thật:
 *   node testEventsAPI.js   (script tự khởi động server + tự dọn dữ liệu test)
 */

require("dotenv").config();
const net = require("net");
const mongoose = require("mongoose");

const PORT = process.env.PORT || 5000;
const BASE = `http://localhost:${PORT}/api`;
const TAG = "TEST-EVENTS"; // mọi dữ liệu test mang TAG này trong tên/email → dọn sạch được
const D = (days, hours = 0) => new Date(Date.now() + (days * 24 + hours) * 3600000);

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
    const probe = await jf(`${BASE}/events`).catch(() => null);
    if (!probe || probe.status === 404) {
      throw new Error(
        "Server đang chạy chưa nạp route /api/events — khởi động lại backend rồi chạy lại test",
      );
    }
  } else {
    require("./server.js");
    await new Promise((r) => setTimeout(r, 2500));
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  }

  console.log("--- 1. Đăng nhập + loại sự kiện ---");
  const adminLogin = await jf(`${BASE}/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email: "admin@badminton.com", password: "admin123" }),
  });
  ok(adminLogin.status === 200 && adminLogin.body.token, "login admin");
  const admin = adminLogin.body.token;

  const typeName = `${TAG} Giải giao hữu test`;
  const t1 = await jf(`${BASE}/event-types`, { method: "POST", body: JSON.stringify({ name: typeName }) }, admin);
  ok(t1.status === 201, "admin tạo loại sự kiện");
  const t2 = await jf(`${BASE}/event-types`, { method: "POST", body: JSON.stringify({ name: typeName }) }, admin);
  ok(t2.status === 400, "trùng tên loại sự kiện → 400");
  const tPub = await jf(`${BASE}/event-types`); // không token vẫn đọc được
  ok(tPub.status === 200 && tPub.body.types.some((x) => x.name === typeName), "list loại sự kiện (public)");

  console.log("--- 2. Validate sự kiện + nháp vô hình với khách ---");
  const badDeadline = await jf(`${BASE}/events`, {
    method: "POST",
    body: JSON.stringify({ name: `${TAG} Bad Deadline`, startDate: D(10), registrationDeadline: D(11) }),
  }, admin);
  ok(badDeadline.status === 400 && /Hạn đăng ký/.test(badDeadline.body.message), "deadline > startDate → 400");

  const evBody = {
    name: `${TAG} Cup Mở Rộng`,
    type: t1.body.type._id,
    startDate: D(20),
    endDate: D(21),
    registrationDeadline: D(15),
    maxRegistrations: 2,
    sponsors: "ABC Sport , abc SPORT ,, XYZ ",
    status: "draft",
  };
  const ev1 = await jf(`${BASE}/events`, { method: "POST", body: JSON.stringify(evBody) }, admin);
  ok(ev1.status === 201, "tạo sự kiện nháp (max=2)");
  const id1 = ev1.body.event._id;
  ok(
    JSON.stringify(ev1.body.event.sponsors) === JSON.stringify(["ABC Sport", "XYZ"]),
    "sponsors: split dấu phẩy + trim + dedup hoa thường",
  );
  const listPub = await jf(`${BASE}/events`);
  ok(!listPub.body.events.some((e) => e._id === id1), "draft không hiện cho khách");
  const detDraft = await jf(`${BASE}/events/${id1}`);
  ok(detDraft.status === 404, "đọc chi tiết draft (public) → 404");
  const detAdm = await jf(`${BASE}/events/manage/${id1}`, {}, admin);
  ok(detAdm.status === 200 && detAdm.body.event.state === "draft", "admin thấy draft, state=draft");

  console.log("--- 3. Publish + khách vãng lai xem được ---");
  const users = {};
  for (const [key, idx] of [["u1", 1], ["u2", 2], ["u3", 3]]) {
    const email = `${key}.${TAG.toLowerCase()}@test.local`;
    const reg = await jf(`${BASE}/auth/register`, {
      method: "POST",
      body: JSON.stringify({ name: `Test User ${idx}`, email, password: "123456", phone: `090000000${idx}` }),
    });
    if (!reg.body.token) {
      // đã tồn tại từ lần test trước → login
      const lg = await jf(`${BASE}/auth/login`, { method: "POST", body: JSON.stringify({ email, password: "123456" }) });
      users[key] = lg.body.token;
    } else users[key] = reg.body.token;
    ok(!!users[key], `tạo user test ${key}`);
  }

  const pub = await jf(`${BASE}/events/${id1}`, { method: "PUT", body: JSON.stringify({ status: "published" }) }, admin);
  ok(pub.status === 200 && pub.body.event.state === "open", "publish → state open");
  const detGuest = await jf(`${BASE}/events/${id1}`); // không token
  ok(detGuest.status === 200 && detGuest.body.event.stateLabel === "Đang mở đăng ký", "khách không đăng nhập vẫn xem chi tiết");

  console.log("--- 4. Đăng ký: 401 / 201 / trùng 409 / admin thấy ---");
  const noToken = await jf(`${BASE}/events/${id1}/register`, { method: "POST" });
  ok(noToken.status === 401, "chưa đăng nhập đăng ký → 401");
  const r1 = await jf(`${BASE}/events/${id1}/register`, { method: "POST" }, users.u1);
  ok(r1.status === 201, "u1 đăng ký → 201");
  const dup = await jf(`${BASE}/events/${id1}/register`, { method: "POST" }, users.u1);
  ok(dup.status === 409 && /đã đăng ký/.test(dup.body.message), "đăng ký trùng → 409");
  const evAfter = await jf(`${BASE}/events/manage/${id1}`, {}, admin);
  ok(evAfter.body.event.registeredCount === 1, "registeredCount = 1 sau 1 đăng ký");
  const regsList = await jf(`${BASE}/events/${id1}/registrations`, {}, admin);
  ok(
    regsList.status === 200 && regsList.body.registrations.length === 1 &&
    regsList.body.registrations[0].name && regsList.body.registrations[0].phone,
    "admin xem danh sách đăng ký (có snapshot tên + SĐT)",
  );

  console.log("--- 5. Admin hủy đăng ký: lý do bắt buộc, hoàn slot, đăng ký lại được ---");
  const regId = regsList.body.registrations[0]._id;
  const cancelNoReason = await jf(`${BASE}/registrations/${regId}/cancel`, { method: "PUT", body: JSON.stringify({}) }, admin);
  ok(cancelNoReason.status === 400, "hủy không lý do → 400");
  const cancelOk = await jf(`${BASE}/registrations/${regId}/cancel`, { method: "PUT", body: JSON.stringify({ reason: "SĐT sai" }) }, admin);
  ok(cancelOk.status === 200 && cancelOk.body.registration.status === "cancelled", "hủy có lý do → 200");
  const evAfterCancel = await jf(`${BASE}/events/manage/${id1}`, {}, admin);
  ok(evAfterCancel.body.event.registeredCount === 0, "hủy → registeredCount về 0");
  const cancelTwice = await jf(`${BASE}/registrations/${regId}/cancel`, { method: "PUT", body: JSON.stringify({ reason: "x" }) }, admin);
  ok(cancelTwice.status === 400, "hủy lần 2 → 400 (không trừ slot 2 lần)");
  const reReg = await jf(`${BASE}/events/${id1}/register`, { method: "POST" }, users.u1);
  ok(reReg.status === 201, "unique partial index giải phóng → u1 đăng ký lại được");

  console.log("--- 6. Hết hạn đăng ký ---");
  const evOld = await jf(`${BASE}/events`, {
    method: "POST",
    body: JSON.stringify({ name: `${TAG} Qúa Hạn`, startDate: D(2), registrationDeadline: D(-1), status: "published" }),
  }, admin);
  const idOld = evOld.body.event._id;
  ok(evOld.body.event.state === "closed_deadline", "state = closed_deadline");
  const regOld = await jf(`${BASE}/events/${idOld}/register`, { method: "POST" }, users.u3);
  ok(regOld.status === 400 && /Hết hạn/.test(regOld.body.message), "đăng ký sau deadline → 400 dù UI không thấy nút");

  console.log("--- 7. Đủ suất ---");
  const r2 = await jf(`${BASE}/events/${id1}/register`, { method: "POST" }, users.u2);
  ok(r2.status === 201, "u2 đăng ký (slot 2/2)");
  const r3 = await jf(`${BASE}/events/${id1}/register`, { method: "POST" }, users.u3);
  ok(r3.status === 400 && /đủ suất/.test(r3.body.message), "u3 đăng ký slot thứ 3 → 400 ĐÃ ĐẦY");
  const detFull = await jf(`${BASE}/events/${id1}`);
  ok(detFull.body.event.state === "closed_full" && detFull.body.event.stateLabel === "Đã đủ suất", "khách thấy badge 'Đã đủ suất'");

  console.log("--- 8. Đua slot cuối (2 request đồng thời, max=1) ---");
  const evRace = await jf(`${BASE}/events`, {
    method: "POST",
    body: JSON.stringify({ name: `${TAG} Đua Slot`, startDate: D(30), registrationDeadline: D(28), maxRegistrations: 1, status: "published" }),
  }, admin);
  const idRace = evRace.body.event._id;
  const race = await Promise.all([
    jf(`${BASE}/events/${idRace}/register`, { method: "POST" }, users.u1),
    jf(`${BASE}/events/${idRace}/register`, { method: "POST" }, users.u2),
  ]);
  const wins = race.filter((x) => x.status === 201).length;
  ok(wins === 1, `đúng 1/2 request cùng lúc thành công (được ${wins})`);
  const evRaceAfter = await jf(`${BASE}/events/manage/${idRace}`, {}, admin);
  ok(evRaceAfter.body.event.registeredCount === 1, "count sau đua = 1, không vượt max");
  const regsRace = await jf(`${BASE}/events/${idRace}/registrations`, {}, admin);
  ok(regsRace.body.registrations.filter((r) => r.status === "registered").length === 1, "danh sách đúng 1 người");

  console.log("--- 9. Kết quả Top 5 + sửa không mất data ---");
  const putRes = await jf(`${BASE}/events/${id1}`, {
    method: "PUT",
    body: JSON.stringify({
      results: [
        { rank: 2, name: "Trần B" },
        { rank: 1, name: "Nguyễn A" },
        { rank: 3, name: "Lê C" },
        { rank: 4, name: "   " }, // tên rỗng → bị lọc
        { rank: 9, name: "Quá rank" }, // ngoài 1..5 → bị lọc
      ],
    }),
  }, admin);
  ok(
    putRes.status === 200 &&
    JSON.stringify(putRes.body.event.results.map((r) => r.rank)) === JSON.stringify([1, 2, 3]) &&
    putRes.body.event.results[0].name === "Nguyễn A",
    "Top 5: lọc tên rỗng + rank ngoài 1-5, sắp theo rank",
  );
  const putDescOnly = await jf(`${BASE}/events/${id1}`, { method: "PUT", body: JSON.stringify({ description: "Sửa mỗi mô tả" }) }, admin);
  ok(
    putDescOnly.body.event.results.length === 3 &&
    JSON.stringify(putDescOnly.body.event.sponsors) === JSON.stringify(["ABC Sport", "XYZ"]),
    "PUT một phần không làm mất results/sponsors",
  );
  const detRes = await jf(`${BASE}/events/${id1}`);
  ok(detRes.body.event.results.length === 3, "khách đọc được Top 5");

  console.log("--- 10. Sự kiện kết thúc / bị hủy / xóa mềm ---");
  const evFin = await jf(`${BASE}/events`, {
    method: "POST",
    body: JSON.stringify({ name: `${TAG} Đã Xong`, startDate: D(-2), endDate: D(-1), registrationDeadline: D(-3), status: "published" }),
  }, admin);
  ok(evFin.body.event.state === "finished", "qua endDate → state finished");

  const cancelEv = await jf(`${BASE}/events/${id1}`, { method: "PUT", body: JSON.stringify({ status: "cancelled" }) }, admin);
  ok(cancelEv.status === 200, "admin hủy sự kiện");
  const regCancelled = await jf(`${BASE}/events/${id1}/register`, { method: "POST" }, users.u3);
  ok(regCancelled.status === 400 && /bị hủy/.test(regCancelled.body.message), "đăng ký vào sự kiện đã hủy → 400");
  const mine = await jf(`${BASE}/registrations/mine`, {}, users.u1);
  const mineEv1 = mine.body.registrations.find((r) => r.event && r.event._id === id1);
  ok(mine && mine.body.registrations.length >= 2 && mineEv1 && mineEv1.event.state === "cancelled", "trang 'của tôi': thấy đăng ký + state sự kiện (kể cả đã hủy)");
  const detCancelled = await jf(`${BASE}/events/${id1}`);
  ok(detCancelled.status === 404, "sự kiện cancelled ẩn khỏi trang khách");

  const del = await jf(`${BASE}/events/${idRace}`, { method: "DELETE" }, admin);
  ok(del.status === 200, "xóa mềm sự kiện");
  const mgList = await jf(`${BASE}/events/manage`, {}, admin);
  ok(!mgList.body.events.some((e) => e._id === idRace), "xóa mềm: admin list cũng ẩn");
  const detDel = await jf(`${BASE}/events/${idRace}`);
  ok(detDel.status === 404, "xóa mềm: chi tiết 404");

  console.log("--- 11. Phân quyền ---");
  const u3Create = await jf(`${BASE}/events`, { method: "POST", body: JSON.stringify({ name: `${TAG} Lậu Quyền`, startDate: D(5), registrationDeadline: D(4) }) }, users.u3);
  ok(u3Create.status === 403, "user thường không tạo được sự kiện");
  const staffList = await jf(`${BASE}/events/manage`, {}, admin);
  ok(staffList.body.events.some((e) => e.state === "closed_full"), "admin list có đủ state suy ra");

  console.log(`\n🎉 testEventsAPI: ${passed}/${passed} đạt`);
};

const cleanup = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      const Event = require("./src/models/Event");
      const Registration = require("./src/models/Registration");
      const EventType = require("./src/models/EventType");
      const User = require("./src/models/User");
      const testIds = await Event.find({ name: new RegExp(TAG) }).select("_id").lean();
      await Registration.deleteMany({ event: { $in: testIds.map((e) => e._id) } });
      await Event.deleteMany({ name: new RegExp(TAG) });
      await EventType.deleteMany({ name: new RegExp(TAG) });
      await User.deleteMany({ email: new RegExp(`^u\\d\\.${TAG.toLowerCase()}@test\\.local$`) });
      console.log("🧹 Đã dọn dữ liệu test");
    }
  } catch (e) {
    console.log("⚠️ Cleanup lỗi:", e.message);
  }
};

run()
  .then(cleanup)
  .then(() => process.exit(0))
  .catch(async (e) => {
    console.error("❌", e.message);
    await cleanup();
    process.exit(1);
  });
