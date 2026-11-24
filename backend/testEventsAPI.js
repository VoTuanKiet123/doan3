/**
 * testEventsAPI.js
 * Test end-to-end Quản lý giải đấu qua HTTP API thật:
 *   node testEventsAPI.js   (dùng server đang chạy hoặc tự khởi động + tự dọn dữ liệu & ảnh test)
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const net = require("net");
const mongoose = require("mongoose");

const PORT = process.env.PORT || 5000;
const ORIGIN = `http://localhost:${PORT}`;
const BASE = `${ORIGIN}/api`;
const LOCAL_MONGO_URI = "mongodb://127.0.0.1:27018/badminton_db?replicaSet=rs0";
const TAG = "TEST-EVENTS";
const D = (days, hours = 0) => new Date(Date.now() + (days * 24 + hours) * 3600000);

// Ảnh PNG 1x1 hợp lệ dùng để test upload poster mà không cần file ảnh có sẵn trên máy
const TINY_PNG_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);
const uploadedPosters = [];

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

// Helper riêng cho multipart/form-data (không tự gán Content-Type để fetch tự sinh boundary)
const uf = async (url, formData, token) => {
  const res = await fetch(url, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
};

const connectForTest = async () => {
  if (mongoose.connection.readyState !== 0) return;
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
  } catch {
    console.log("ℹ️ Atlas không kết nối được — dùng MongoDB cục bộ cổng 27018 để cleanup");
    await mongoose.connect(LOCAL_MONGO_URI, { serverSelectionTimeoutMS: 3000 });
  }
};

const run = async () => {
  const portBusy = await new Promise((resolve) => {
    const s = net.connect(PORT, "localhost", () => {
      s.destroy();
      resolve(true);
    });
    s.on("error", () => resolve(false));
    s.setTimeout(700);
    s.on("timeout", () => {
      s.destroy();
      resolve(false);
    });
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

  await connectForTest();

  console.log("--- 1. Đăng nhập + phân loại sự kiện (thêm / trùng / ẩn-hiện) ---");
  const adminLogin = await jf(`${BASE}/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email: "admin@badminton.com", password: "admin123" }),
  });
  ok(adminLogin.status === 200 && adminLogin.body.token, "login admin");
  const admin = adminLogin.body.token;

  const typeName = `${TAG} Giải giao hữu test`;
  const t1 = await jf(
    `${BASE}/event-types`,
    { method: "POST", body: JSON.stringify({ name: typeName, note: "Thể thức giao lưu" }) },
    admin,
  );
  ok(t1.status === 201 && t1.body.type.note === "Thể thức giao lưu", "admin tạo loại sự kiện có mô tả");
  const t1Id = t1.body.type._id;

  const t2 = await jf(
    `${BASE}/event-types`,
    { method: "POST", body: JSON.stringify({ name: typeName }) },
    admin,
  );
  ok(t2.status === 400, "trùng tên loại sự kiện → 400");

  const tHidden = await jf(
    `${BASE}/event-types`,
    { method: "POST", body: JSON.stringify({ name: `${TAG} Loại ẩn test` }) },
    admin,
  );
  ok(tHidden.status === 201, "tạo loại thứ 2 để test ẩn/hiện");
  const hideRes = await jf(
    `${BASE}/event-types/${tHidden.body.type._id}`,
    { method: "PUT", body: JSON.stringify({ isActive: false }) },
    admin,
  );
  ok(hideRes.status === 200 && hideRes.body.type.isActive === false, "ẩn loại sự kiện → isActive=false");

  const tPub = await jf(`${BASE}/event-types`);
  ok(
    tPub.status === 200 &&
      tPub.body.types.some((x) => x._id === t1Id) &&
      !tPub.body.types.some((x) => x._id === tHidden.body.type._id),
    "public list loại sự kiện chỉ trả loại đang bật",
  );
  const tAll = await jf(`${BASE}/event-types?includeInactive=true`);
  ok(
    tAll.status === 200 && tAll.body.types.some((x) => x._id === tHidden.body.type._id),
    "admin list (?includeInactive=true) vẫn thấy loại đã ẩn để bật lại",
  );

  console.log("--- 2. Upload ảnh bìa (Poster) + validate sự kiện + nháp vô hình ---");
  const emptyUpload = await uf(`${BASE}/events/upload-poster`, new FormData(), admin);
  ok(emptyUpload.status === 400, "upload poster không chọn file → 400");

  const badFd = new FormData();
  badFd.append("poster", new Blob(["not-an-image"], { type: "text/plain" }), "fake.txt");
  const badUpload = await uf(`${BASE}/events/upload-poster`, badFd, admin);
  ok(
    badUpload.status === 400 && /Chỉ chấp nhận ảnh/i.test(badUpload.body.message),
    "upload file không phải ảnh → 400",
  );

  const okFd = new FormData();
  okFd.append("poster", new Blob([TINY_PNG_BUFFER], { type: "image/png" }), "banner.png");
  const okUpload = await uf(`${BASE}/events/upload-poster`, okFd, admin);
  ok(
    okUpload.status === 201 && /^\/uploads\/events\/poster-.*\.png$/.test(okUpload.body.posterUrl),
    "admin upload ảnh bìa PNG hợp lệ → 201",
  );
  const posterUrl = okUpload.body.posterUrl;
  uploadedPosters.push(posterUrl);

  const staticCheck = await fetch(`${ORIGIN}${posterUrl}`);
  ok(staticCheck.status === 200, "ảnh bìa truy cập được qua static /uploads/events/...");

  const noType = await jf(
    `${BASE}/events`,
    {
      method: "POST",
      body: JSON.stringify({ name: `${TAG} No Type`, startDate: D(10), registrationDeadline: D(8) }),
    },
    admin,
  );
  ok(noType.status === 400 && /loại sự kiện/i.test(noType.body.message), "thiếu loại sự kiện → 400");

  const badDeadline = await jf(
    `${BASE}/events`,
    {
      method: "POST",
      body: JSON.stringify({
        name: `${TAG} Bad Deadline`,
        type: t1Id,
        startDate: D(10),
        registrationDeadline: D(11),
      }),
    },
    admin,
  );
  ok(badDeadline.status === 400 && /Hạn đăng ký/.test(badDeadline.body.message), "deadline > startDate → 400");

  const evBody = {
    name: `${TAG} Cup Mở Rộng`,
    type: t1Id,
    posterUrl,
    startDate: D(20),
    endDate: D(21),
    registrationDeadline: D(15),
    maxRegistrations: 2,
    sponsors: "ABC Sport , abc SPORT ,, XYZ ",
    status: "draft",
  };
  const ev1 = await jf(`${BASE}/events`, { method: "POST", body: JSON.stringify(evBody) }, admin);
  ok(ev1.status === 201 && ev1.body.event.posterUrl === posterUrl, "tạo sự kiện nháp kèm posterUrl (max=2)");
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

  console.log("--- 3. Publish + khách vãng lai xem được (kèm posterUrl) ---");
  const users = {};
  for (const [key, idx] of [
    ["u1", 1],
    ["u2", 2],
    ["u3", 3],
  ]) {
    const email = `${key}.${TAG.toLowerCase()}@test.local`;
    const reg = await jf(`${BASE}/auth/register`, {
      method: "POST",
      body: JSON.stringify({
        name: `Test User ${idx}`,
        email,
        password: "123456",
        phone: `090000000${idx}`,
      }),
    });
    if (!reg.body.token) {
      const lg = await jf(`${BASE}/auth/login`, {
        method: "POST",
        body: JSON.stringify({ email, password: "123456" }),
      });
      users[key] = lg.body.token;
    } else {
      users[key] = reg.body.token;
    }
    ok(!!users[key], `tạo user test ${key}`);
  }

  const pub = await jf(
    `${BASE}/events/${id1}`,
    { method: "PUT", body: JSON.stringify({ status: "published" }) },
    admin,
  );
  ok(pub.status === 200 && pub.body.event.state === "open", "publish → state open");
  const detGuest = await jf(`${BASE}/events/${id1}`);
  ok(
    detGuest.status === 200 &&
      detGuest.body.event.stateLabel === "Đang mở đăng ký" &&
      detGuest.body.event.posterUrl === posterUrl,
    "khách không đăng nhập xem chi tiết thấy đúng state và posterUrl",
  );

  console.log("--- 4. Form đăng ký & Chỉnh sửa phiếu đăng ký trước hạn ---");
  const noToken = await jf(`${BASE}/events/${id1}/register`, { method: "POST" });
  ok(noToken.status === 401, "chưa đăng nhập đăng ký → 401");

  const badPhone = await jf(
    `${BASE}/events/${id1}/register`,
    { method: "POST", body: JSON.stringify({ name: "Test User 1", phone: "12345" }) },
    users.u1,
  );
  ok(badPhone.status === 400 && /Số điện thoại/.test(badPhone.body.message), "SĐT sai định dạng → 400");

  const r1 = await jf(
    `${BASE}/events/${id1}/register`,
    {
      method: "POST",
      body: JSON.stringify({
        name: "Test User 1",
        phone: "0900000001",
        gender: "Nam",
        skillLevel: "Khá",
        partnerOrTeamName: "CLB Ninh Kiều",
        note: "Đánh buổi sáng",
      }),
    },
    users.u1,
  );
  ok(r1.status === 201 && r1.body.registration.skillLevel === "Khá", "u1 đăng ký kèm form đầy đủ → 201");

  const dup = await jf(`${BASE}/events/${id1}/register`, { method: "POST" }, users.u1);
  ok(dup.status === 409 && /đã đăng ký/.test(dup.body.message), "đăng ký trùng → 409");

  // Chỉnh sửa phiếu đăng ký trước hạn
  const editBadPhone = await jf(
    `${BASE}/events/${id1}/register`,
    { method: "PUT", body: JSON.stringify({ name: "Test User 1", phone: "999" }) },
    users.u1,
  );
  ok(editBadPhone.status === 400 && /Số điện thoại/.test(editBadPhone.body.message), "sửa phiếu SĐT sai → 400");

  const editNotReg = await jf(
    `${BASE}/events/${id1}/register`,
    { method: "PUT", body: JSON.stringify({ name: "Test User 3", phone: "0900000003" }) },
    users.u3,
  );
  ok(editNotReg.status === 404, "người chưa đăng ký gọi sửa phiếu → 404");

  const editOk = await jf(
    `${BASE}/events/${id1}/register`,
    {
      method: "PUT",
      body: JSON.stringify({
        name: "Test User 1 (Updated)",
        phone: "0988777666",
        gender: "Nam",
        skillLevel: "Bán chuyên",
        partnerOrTeamName: "CLB Cần Thơ Pro",
        note: "Đổi sang buổi chiều",
      }),
    },
    users.u1,
  );
  ok(
    editOk.status === 200 &&
      editOk.body.registration.phone === "0988777666" &&
      editOk.body.registration.skillLevel === "Bán chuyên" &&
      editOk.body.registration.note === "Đổi sang buổi chiều",
    "u1 sửa phiếu trước hạn thành công → 200",
  );

  const evAfter = await jf(`${BASE}/events/manage/${id1}`, {}, admin);
  ok(evAfter.body.event.registeredCount === 1, "sau khi sửa phiếu registeredCount vẫn giữ nguyên = 1");
  const regsList = await jf(`${BASE}/events/${id1}/registrations`, {}, admin);
  ok(
    regsList.status === 200 &&
      regsList.body.registrations.length === 1 &&
      regsList.body.registrations[0].phone === "0988777666" &&
      regsList.body.registrations[0].skillLevel === "Bán chuyên" &&
      regsList.body.registrations[0].note === "Đổi sang buổi chiều",
    "admin xem danh sách đăng ký thấy đúng thông tin sau khi sửa",
  );

  // Test giải đôi: bắt buộc nhập tên đồng đội cả lúc đăng ký lẫn lúc sửa phiếu
  const tDouble = await jf(
    `${BASE}/event-types`,
    { method: "POST", body: JSON.stringify({ name: `${TAG} Giải đôi test` }) },
    admin,
  );
  const evDouble = await jf(
    `${BASE}/events`,
    {
      method: "POST",
      body: JSON.stringify({
        name: `${TAG} Cúp Đôi Nam`,
        type: tDouble.body.type._id,
        startDate: D(22),
        registrationDeadline: D(18),
        status: "published",
      }),
    },
    admin,
  );
  const idDouble = evDouble.body.event._id;
  const regNoPartner = await jf(
    `${BASE}/events/${idDouble}/register`,
    { method: "POST", body: JSON.stringify({ name: "Test User 1", phone: "0900000001" }) },
    users.u1,
  );
  ok(regNoPartner.status === 400 && /đồng đội/i.test(regNoPartner.body.message), "giải đôi thiếu tên đồng đội → 400");
  const regWithPartner = await jf(
    `${BASE}/events/${idDouble}/register`,
    {
      method: "POST",
      body: JSON.stringify({
        name: "Test User 1",
        phone: "0900000001",
        partnerOrTeamName: "Trần Văn B",
      }),
    },
    users.u1,
  );
  ok(regWithPartner.status === 201, "giải đôi có tên đồng đội → 201");

  const editDoubleNoPartner = await jf(
    `${BASE}/events/${idDouble}/register`,
    {
      method: "PUT",
      body: JSON.stringify({
        name: "Test User 1",
        phone: "0900000001",
        partnerOrTeamName: "   ",
      }),
    },
    users.u1,
  );
  ok(
    editDoubleNoPartner.status === 400 && /đồng đội/i.test(editDoubleNoPartner.body.message),
    "sửa phiếu giải đôi xóa trống tên đồng đội → 400",
  );
  const editDoubleOk = await jf(
    `${BASE}/events/${idDouble}/register`,
    {
      method: "PUT",
      body: JSON.stringify({
        name: "Test User 1",
        phone: "0900000001",
        partnerOrTeamName: "Lê Văn C",
      }),
    },
    users.u1,
  );
  ok(
    editDoubleOk.status === 200 && editDoubleOk.body.registration.partnerOrTeamName === "Lê Văn C",
    "sửa tên đồng đội giải đôi trước hạn → 200",
  );

  console.log("--- 5. Admin hủy + Người dùng tự hủy trước hạn & đăng ký lại ---");
  const regId = regsList.body.registrations[0]._id;
  const cancelNoReason = await jf(
    `${BASE}/registrations/${regId}/cancel`,
    { method: "PUT", body: JSON.stringify({}) },
    admin,
  );
  ok(cancelNoReason.status === 400, "admin hủy không lý do → 400");
  const cancelOk = await jf(
    `${BASE}/registrations/${regId}/cancel`,
    { method: "PUT", body: JSON.stringify({ reason: "SĐT sai" }) },
    admin,
  );
  ok(cancelOk.status === 200 && cancelOk.body.registration.status === "cancelled", "admin hủy có lý do → 200");
  const evAfterCancel = await jf(`${BASE}/events/manage/${id1}`, {}, admin);
  ok(evAfterCancel.body.event.registeredCount === 0, "admin hủy → registeredCount về 0");
  const cancelTwice = await jf(
    `${BASE}/registrations/${regId}/cancel`,
    { method: "PUT", body: JSON.stringify({ reason: "x" }) },
    admin,
  );
  ok(cancelTwice.status === 400, "hủy lần 2 → 400 (không trừ slot 2 lần)");

  const reReg = await jf(`${BASE}/events/${id1}/register`, { method: "POST" }, users.u1);
  ok(reReg.status === 201, "unique partial index giải phóng → u1 đăng ký lại được");

  const selfCancel = await jf(
    `${BASE}/events/${id1}/register/cancel`,
    { method: "PUT", body: JSON.stringify({ reason: "Bận đột xuất" }) },
    users.u1,
  );
  ok(
    selfCancel.status === 200 &&
      selfCancel.body.registration.status === "cancelled" &&
      /Bận đột xuất/.test(selfCancel.body.registration.cancelNote),
    "u1 tự hủy trước hạn → 200 và lưu lý do",
  );
  const evAfterSelfCancel = await jf(`${BASE}/events/manage/${id1}`, {}, admin);
  ok(evAfterSelfCancel.body.event.registeredCount === 0, "tự hủy → hoàn slot về 0");

  const reRegAfterSelf = await jf(`${BASE}/events/${id1}/register`, { method: "POST" }, users.u1);
  ok(reRegAfterSelf.status === 201, "sau khi tự hủy vẫn đăng ký lại được");

  console.log("--- 6. Hết hạn đăng ký (chặn đăng ký + chặn sửa phiếu + chặn tự hủy) ---");
  const evOld = await jf(
    `${BASE}/events`,
    {
      method: "POST",
      body: JSON.stringify({
        name: `${TAG} Quá Hạn`,
        type: t1Id,
        startDate: D(2),
        registrationDeadline: D(-1),
        status: "published",
      }),
    },
    admin,
  );
  const idOld = evOld.body.event._id;
  ok(evOld.body.event.state === "closed_deadline", "state = closed_deadline");
  const regOld = await jf(`${BASE}/events/${idOld}/register`, { method: "POST" }, users.u3);
  ok(regOld.status === 400 && /Hết hạn/.test(regOld.body.message), "đăng ký sau deadline → 400");

  // Chuyển deadline của evDouble về quá khứ rồi test u1 sửa phiếu và tự hủy → đều phải chặn 400
  const Event = require("./src/models/Event");
  await Event.updateOne({ _id: idDouble }, { $set: { registrationDeadline: D(-1) } });

  const editLate = await jf(
    `${BASE}/events/${idDouble}/register`,
    {
      method: "PUT",
      body: JSON.stringify({
        name: "Test User 1",
        phone: "0900000001",
        partnerOrTeamName: "Đổi trễ",
      }),
    },
    users.u1,
  );
  ok(editLate.status === 400 && /quá hạn/i.test(editLate.body.message), "sửa phiếu sau deadline → 400");

  const selfCancelLate = await jf(
    `${BASE}/events/${idDouble}/register/cancel`,
    { method: "PUT", body: JSON.stringify({ reason: "Quá hạn rồi" }) },
    users.u1,
  );
  ok(selfCancelLate.status === 400 && /quá hạn/i.test(selfCancelLate.body.message), "tự hủy sau deadline → 400");

  console.log("--- 7. Đủ suất ---");
  const r2 = await jf(`${BASE}/events/${id1}/register`, { method: "POST" }, users.u2);
  ok(r2.status === 201, "u2 đăng ký (slot 2/2)");
  const r3 = await jf(`${BASE}/events/${id1}/register`, { method: "POST" }, users.u3);
  ok(r3.status === 400 && /đủ suất/.test(r3.body.message), "u3 đăng ký slot thứ 3 → 400 ĐÃ ĐẦY");
  const detFull = await jf(`${BASE}/events/${id1}`);
  ok(
    detFull.body.event.state === "closed_full" && detFull.body.event.stateLabel === "Đã đủ suất",
    "khách thấy badge 'Đã đủ suất'",
  );

  console.log("--- 8. Đua slot cuối (2 request đồng thời, max=1) ---");
  const evRace = await jf(
    `${BASE}/events`,
    {
      method: "POST",
      body: JSON.stringify({
        name: `${TAG} Đua Slot`,
        type: t1Id,
        startDate: D(30),
        registrationDeadline: D(28),
        maxRegistrations: 1,
        status: "published",
      }),
    },
    admin,
  );
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
  ok(
    regsRace.body.registrations.filter((r) => r.status === "registered").length === 1,
    "danh sách đúng 1 người",
  );
  const manageBeforeDel = await jf(`${BASE}/events/manage`, {}, admin);
  ok(
    manageBeforeDel.body.events.some((e) => e._id === idRace && e.state === "closed_full"),
    "admin list suy ra state closed_full cho sự kiện đầy suất",
  );

  console.log("--- 9. Kết quả Top 5 + sửa không mất poster/results/sponsors ---");
  const putRes = await jf(
    `${BASE}/events/${id1}`,
    {
      method: "PUT",
      body: JSON.stringify({
        results: [
          { rank: 2, name: "Trần B" },
          { rank: 1, name: "Nguyễn A" },
          { rank: 3, name: "Lê C" },
          { rank: 4, name: "   " },
          { rank: 9, name: "Quá rank" },
        ],
      }),
    },
    admin,
  );
  ok(
    putRes.status === 200 &&
      JSON.stringify(putRes.body.event.results.map((r) => r.rank)) === JSON.stringify([1, 2, 3]) &&
      putRes.body.event.results[0].name === "Nguyễn A",
    "Top 5: lọc tên rỗng + rank ngoài 1-5, sắp theo rank",
  );
  const putDescOnly = await jf(
    `${BASE}/events/${id1}`,
    { method: "PUT", body: JSON.stringify({ description: "Sửa mỗi mô tả" }) },
    admin,
  );
  ok(
    putDescOnly.body.event.results.length === 3 &&
      putDescOnly.body.event.posterUrl === posterUrl &&
      JSON.stringify(putDescOnly.body.event.sponsors) === JSON.stringify(["ABC Sport", "XYZ"]),
    "PUT một phần không làm mất posterUrl/results/sponsors/type",
  );
  const detRes = await jf(`${BASE}/events/${id1}`);
  ok(detRes.body.event.results.length === 3, "khách đọc được Top 5");

  console.log("--- 10. Sự kiện kết thúc / bị hủy / xóa mềm ---");
  const evFin = await jf(
    `${BASE}/events`,
    {
      method: "POST",
      body: JSON.stringify({
        name: `${TAG} Đã Xong`,
        type: t1Id,
        startDate: D(-2),
        endDate: D(-1),
        registrationDeadline: D(-3),
        status: "published",
      }),
    },
    admin,
  );
  ok(evFin.body.event.state === "finished", "qua endDate → state finished");

  const cancelEv = await jf(
    `${BASE}/events/${id1}`,
    { method: "PUT", body: JSON.stringify({ status: "cancelled" }) },
    admin,
  );
  ok(cancelEv.status === 200, "admin hủy sự kiện");
  const regCancelled = await jf(`${BASE}/events/${id1}/register`, { method: "POST" }, users.u3);
  ok(regCancelled.status === 400 && /bị hủy/.test(regCancelled.body.message), "đăng ký vào sự kiện đã hủy → 400");
  const mine = await jf(`${BASE}/registrations/mine`, {}, users.u1);
  const mineEv1 = mine.body.registrations.find((r) => r.event && r.event._id === id1);
  ok(
    mine && mine.body.registrations.length >= 2 && mineEv1 && mineEv1.event.state === "cancelled",
    "trang 'của tôi': thấy đăng ký + state sự kiện (kể cả đã hủy)",
  );
  const detCancelled = await jf(`${BASE}/events/${id1}`);
  ok(detCancelled.status === 404, "sự kiện cancelled ẩn khỏi trang khách");

  const del = await jf(`${BASE}/events/${idRace}`, { method: "DELETE" }, admin);
  ok(del.status === 200, "xóa mềm sự kiện");
  const mgList = await jf(`${BASE}/events/manage`, {}, admin);
  ok(!mgList.body.events.some((e) => e._id === idRace), "xóa mềm: admin list cũng ẩn");
  const detDel = await jf(`${BASE}/events/${idRace}`);
  ok(detDel.status === 404, "xóa mềm: chi tiết 404");

  console.log("--- 11. Phân quyền ---");
  const u3Create = await jf(
    `${BASE}/events`,
    {
      method: "POST",
      body: JSON.stringify({
        name: `${TAG} Lậu Quyền`,
        type: t1Id,
        startDate: D(5),
        registrationDeadline: D(4),
      }),
    },
    users.u3,
  );
  ok(u3Create.status === 403, "user thường không tạo được sự kiện");

  const u3PosterFd = new FormData();
  u3PosterFd.append("poster", new Blob([TINY_PNG_BUFFER], { type: "image/png" }), "u3.png");
  const u3Upload = await uf(`${BASE}/events/upload-poster`, u3PosterFd, users.u3);
  ok(u3Upload.status === 403, "user thường không upload được ảnh bìa sự kiện");

  const staffList = await jf(`${BASE}/events/manage`, {}, admin);
  ok(
    staffList.body.events.some((e) => e.state === "closed_deadline") &&
      staffList.body.events.some((e) => e.state === "finished") &&
      staffList.body.events.some((e) => e.state === "cancelled"),
    "admin list trả đủ các state suy ra",
  );

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
    }
    for (const rel of uploadedPosters) {
      const fullPath = path.join(__dirname, rel.replace(/^\/+/, ""));
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }
    console.log("🧹 Đã dọn sạch dữ liệu & ảnh bìa test");
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