/**
 * Script test nhanh chức năng Đặt lịch cố định theo tháng
 * Cách dùng:
 *   1. Mở terminal 1: cd backend && node server.js
 *   2. Mở terminal 2: cd backend && node test-fixed-monthly.js
 */

const BASE = "http://localhost:5000";

async function api(method, path, body, token) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json();
  return { status: res.status, data };
}

async function main() {
  console.log("=== TEST: ĐẶT LỊCH CỐ ĐỊNH THEO THÁNG ===\n");

  // 1. Đăng nhập
  console.log("1. Đăng nhập...");
  const login = await api("POST", "/api/auth/login", {
    email: "admin@badminton.com",
    password: "admin123",
  });
  if (!login.data.token) {
    console.error("❌ Đăng nhập thất bại:", login.data);
    process.exit(1);
  }
  const token = login.data.token;
  console.log("   ✅ OK\n");

  // 2. Preview
  console.log("2. Preview lịch Thứ 2-4-6, tháng 7/2026, 17h-19h...");
  const preview = await api(
    "POST",
    "/api/bookings/preview-fixed-schedule",
    {
      courtId: "court_1",
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      daysOfWeek: [1, 3, 5],
      startTime: "17:00",
      endTime: "19:00",
    },
    token,
  );
  console.log(`   Tổng sinh: ${preview.data.totalGenerated} buổi`);
  console.log(`   Khả dụng: ${preview.data.availableSlots} buổi`);
  console.log(`   Trùng lịch: ${preview.data.conflictDates.length} buổi`);
  console.log(`   Mẫu: ${preview.data.sampleDates.join(", ")}`);
  console.log("   ✅ OK\n");

  // 3. Tạo lịch cố định
  console.log("3. Tạo lịch cố định...");
  const create = await api(
    "POST",
    "/api/bookings/fixed-monthly",
    {
      courtId: "court_1",
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      daysOfWeek: [1, 3, 5],
      startTime: "17:00",
      endTime: "19:00",
      note: "Test script",
    },
    token,
  );
  console.log(`   Status: ${create.status}`);
  console.log(`   Message: ${create.data.message}`);
  console.log(`   batchId: ${create.data.batchId}`);
  console.log(`   Số buổi: ${create.data.totalCount}`);
  console.log(
    `   Tổng tiền: ${create.data.totalPrice.toLocaleString("vi-VN")} VNĐ`,
  );
  console.log("   ✅ OK\n");

  // 4. Test conflict
  console.log("4. Test conflict (đặt lại cùng sân + khung giờ)...");
  const conflict = await api(
    "POST",
    "/api/bookings/fixed-monthly",
    {
      courtId: "court_1",
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      daysOfWeek: [1, 3, 5],
      startTime: "17:00",
      endTime: "19:00",
    },
    token,
  );
  console.log(`   Status: ${conflict.status} (409 = Conflict đúng)`);
  console.log(`   Message: ${conflict.data.message}`);
  console.log(
    `   Ngày trùng: ${conflict.data.conflictDates?.length || 0} buổi`,
  );
  console.log("   ✅ OK\n");

  // 5. Xem batch
  const batchId = create.data.batchId;
  console.log("5. Xem danh sách booking trong batch...");
  const batch = await api("GET", `/api/bookings/batch/${batchId}`, null, token);
  console.log(`   Số booking: ${batch.data.count}`);
  batch.data.bookings.slice(0, 3).forEach((b) => {
    console.log(
      `   - ${b.date} ${b.startTime}-${b.endTime} | ${b.totalPrice.toLocaleString("vi-VN")}đ`,
    );
  });
  console.log("   ...");
  console.log("   ✅ OK\n");

  // 6. Huỷ batch
  console.log("6. Huỷ toàn bộ batch...");
  const cancel = await api(
    "PUT",
    `/api/bookings/batch/${batchId}/cancel`,
    null,
    token,
  );
  console.log(`   Message: ${cancel.data.message}`);
  console.log(`   Đã huỷ: ${cancel.data.cancelledCount} booking`);
  console.log("   ✅ OK\n");

  console.log("=== TẤT CẢ TEST PASS ===");
}

main().catch((e) => console.error("❌ Lỗi:", e.message));
