/**
 * seedMaintenance.js
 * Seed dữ liệu mẫu cho tính năng Bảo trì sân (Maintenance).
 *
 * Chạy: node seedMaintenance.js
 *
 * Tạo ra:
 * - 1 phiếu pending (chờ xử lý - sân vẫn active, KHÔNG block toàn bộ sân)
 * - 1 phiếu in_progress (đang bảo trì - sân bị khóa)
 * - 1 phiếu completed (đã hoàn thành) + chi phí
 * - 1 phiếu cancelled (đã hủy)
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Maintenance = require("./src/models/Maintenance");
const Court = require("./src/models/Court");
const User = require("./src/models/User");
const ChecklistTemplate = require("./src/models/ChecklistTemplate");

// Mục kiểm tra mẫu mặc định (N2.1) — Admin chỉnh lại được trên DB
const DEFAULT_CHECKLIST = [
  { item: "Mặt sân khô, sạch, không phồng/bong mép", category: "floor" },
  { item: "Sàn không trơn rít, không ẩm do dột", category: "floor" },
  { item: "Lưới căng đều, không rách/xệ", category: "net_post" },
  { item: "Trụ lưới chắc, không lung lay", category: "net_post" },
  { item: "Đèn đủ sáng, không nhấp nháy", category: "lighting" },
  { item: "Vạch kẻ sân rõ, không mờ", category: "line_marking" },
  { item: "Quạt/thông gió chạy tốt", category: "ventilation" },
  { item: "Mái/trần/tường không dột, không ẩm", category: "roof_wall" },
];

const connectDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Connected to MongoDB");
};

const seedMaintenance = async () => {
  try {
    await connectDB();

    // Lấy court và admin user
    const courts = await Court.find().lean();
    const admin = await User.findOne({ email: "admin@badminton.com" }).lean();

    if (!admin) {
      console.log("❌ Cần tạo admin trước. Hãy chạy: node seedAdmin.js");
      process.exit(1);
    }
    if (courts.length === 0) {
      console.log("❌ Cần tạo sân trước. Hãy chạy: node seed.js");
      process.exit(1);
    }

    // Xóa phiếu bảo trì cũ
    await Maintenance.deleteMany({});
    console.log("🗑️ Đã xóa phiếu bảo trì cũ");

    // Seed mục kiểm tra mẫu (chỉ khi trống — không đè chỉnh sửa của Admin)
    const checklistCount = await ChecklistTemplate.countDocuments();
    if (checklistCount === 0) {
      await ChecklistTemplate.insertMany(DEFAULT_CHECKLIST);
      console.log(`✅ Seed ${DEFAULT_CHECKLIST.length} mục kiểm tra mẫu`);
    } else {
      console.log("⏭️ ChecklistTemplate đã có dữ liệu, bỏ qua seed");
    }

    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    const todayStr = `${y}-${m}-${d}`;

    // Tính ngày mai, ngày kia...
    const addDays = (dateStr, days) => {
      const [yy, mm, dd] = dateStr.split("-").map(Number);
      const dt = new Date(Date.UTC(yy, mm - 1, dd + days, 12, 0, 0));
      const ny = dt.getUTCFullYear();
      const nm = String(dt.getUTCMonth() + 1).padStart(2, "0");
      const nd = String(dt.getUTCDate()).padStart(2, "0");
      return `${ny}-${nm}-${nd}`;
    };

    const tomorrow = addDays(todayStr, 1);
    const dayAfter = addDays(todayStr, 2);
    const nextWeek = addDays(todayStr, 7);
    const nextWeekEnd = addDays(todayStr, 9);
    const twoDaysAgo = addDays(todayStr, -2);
    const threeDaysAgo = addDays(todayStr, -3);
    const fiveDaysAgo = addDays(todayStr, -5);

    console.log(`📅 Hôm nay: ${todayStr}`);
    console.log(`📅 Ngày mai: ${tomorrow}`);

    // ========== 1. Phiếu PENDING: Bảo trì có kế hoạch vào ngày mai ==========
    const pendingMaint = await Maintenance.create({
      court: courts[0]._id,
      title: "Bảo dưỡng lưới & vệ sinh sàn",
      description: "Thay lưới mới, vệ sinh sàn gỗ, kiểm tra đèn LED định kỳ.",
      startDate: tomorrow,
      endDate: tomorrow,
      startTime: "06:00",
      endTime: "12:00",
      maintenanceType: "scheduled",
      status: "pending",
      category: "net_post",
      priority: "medium",
      requiresClosure: true,
      createdBy: admin._id,
      assignedTo: "Anh Tuấn (Kỹ thuật)",
    });
    console.log(
      `✅ Tạo phiếu PENDING: "${pendingMaint.title}" - Ngày ${tomorrow}`,
    );

    // ========== 2. Phiếu IN_PROGRESS: Đang bảo trì (sân bị khóa) ==========
    // Set court[1] về maintenance
    await Court.findByIdAndUpdate(courts[1]._id, { status: "maintenance" });
    const inProgressMaint = await Maintenance.create({
      court: courts[1]._id,
      title: "Sửa chữa sàn gỗ bị hư hỏng",
      description:
        "Sàn gỗ khu vực giữa sân bị bong tróc, cần thay thế 3 tấm ván.",
      startDate: todayStr,
      endDate: dayAfter,
      startTime: "06:00",
      endTime: "22:00",
      maintenanceType: "emergency",
      status: "in_progress",
      category: "floor",
      priority: "urgent",
      requiresClosure: true,
      executorType: "contractor",
      contractor: {
        name: "Đội thi công sàn HCM",
        phone: "0900000000",
        invoiceNo: "HC/25-001",
      },
      createdBy: admin._id,
      assignedTo: "Đội thi công sàn",
      conflictResolution: {
        strategy: "force_override",
        resolutionNote: "Bảo trì khẩn cấp! Đã hủy 2 booking trong ngày.",
      },
    });
    console.log(
      `✅ Tạo phiếu IN_PROGRESS: "${inProgressMaint.title}" - Sân ${courts[1].name} bị khóa`,
    );

    // ========== 3. Phiếu COMPLETED: Đã hoàn thành ==========
    const completedMaint = await Maintenance.create({
      court: courts[2]._id,
      title: "Thay hệ thống đèn LED",
      description: "Thay toàn bộ 12 bóng đèn LED mới, công suất 800 lux.",
      startDate: fiveDaysAgo,
      endDate: threeDaysAgo,
      startTime: "06:00",
      endTime: "18:00",
      maintenanceType: "scheduled",
      status: "completed",
      category: "lighting",
      priority: "medium",
      cost: 4800000,
      costNote: "12 bóng LED x 350.000đ + công thợ 600.000đ",
      completionNote: "Đã thay xong toàn bộ, ánh sáng đạt chuẩn thi đấu.",
      completedAt: new Date(
        Date.UTC(y, today.getMonth(), today.getDate() - 1, 14, 0, 0),
      ),
      createdBy: admin._id,
      assignedTo: "Anh Tuấn (Kỹ thuật)",
    });
    console.log(
      `✅ Tạo phiếu COMPLETED: "${completedMaint.title}" - Chi phí ${completedMaint.cost.toLocaleString("vi-VN")}đ`,
    );

    // ========== 4. Phiếu CANCELLED: Đã hủy ==========
    const cancelledMaint = await Maintenance.create({
      court: courts[3]._id,
      title: "Bảo trì điều hòa (ĐÃ HỦY)",
      description: "Dự kiến bảo trì điều hòa nhưng đã dời lịch do có giải đấu.",
      startDate: twoDaysAgo,
      endDate: twoDaysAgo,
      startTime: "08:00",
      endTime: "17:00",
      maintenanceType: "scheduled",
      status: "cancelled",
      createdBy: admin._id,
      assignedTo: "Đội bảo trì HVAC",
      conflictResolution: {
        strategy: "cancel_booking",
        resolutionNote: "Đã hủy do có giải đấu đột xuất. Dời sang tuần sau.",
      },
    });
    console.log(`✅ Tạo phiếu CANCELLED: "${cancelledMaint.title}"`);

    // ========== 5. Phiếu PENDING cho tuần sau (định kỳ) ==========
    const periodicMaint = await Maintenance.create({
      court: courts[4]?._id || courts[0]._id,
      title: "Bảo trì định kỳ quý 3",
      description: "Kiểm tra tổng thể: sàn, lưới, đèn, quạt, điều hòa.",
      startDate: nextWeek,
      endDate: nextWeekEnd,
      startTime: "06:00",
      endTime: "14:00",
      maintenanceType: "periodic",
      status: "pending",
      createdBy: admin._id,
      assignedTo: "Đội bảo trì tổng hợp",
    });
    console.log(
      `✅ Tạo phiếu PERIODIC: "${periodicMaint.title}" - ${nextWeek} → ${nextWeekEnd}`,
    );

    // ========== 6. Phiếu VIỆC NHỎ không đóng sân (requiresClosure = false) ==========
    const minorMaint = await Maintenance.create({
      court: courts[5]?._id || courts[0]._id,
      title: "Siết lại trụ lưới sân",
      description: "Trụ hơi lỏng, chỉ cần siết lại — không cần ngưng nhận khách.",
      startDate: todayStr,
      endDate: todayStr,
      startTime: "07:00",
      endTime: "08:00",
      maintenanceType: "scheduled",
      status: "pending",
      category: "net_post",
      priority: "low",
      requiresClosure: false,
      createdBy: admin._id,
      assignedTo: "Nhân viên trực sân",
    });
    console.log(
      `✅ Tạo phiếu VIỆC NHỎ (không đóng sân): "${minorMaint.title}"`,
    );

    // ========== TÓM TẮT ==========
    console.log("\n🎉 ========== SEED MAINTENANCE HOÀN TẤT! ==========");
    console.log("📊 Các phiếu đã tạo:");
    console.log(
      `   🔵 Pending (chờ):     2 phiếu - Sân VẪN active, nhưng chặn đặt lịch trùng giờ`,
    );
    console.log(
      `   🟠 In Progress (đang): 1 phiếu - Sân bị KHÓA (maintenance)`,
    );
    console.log(
      `   🟢 Completed (xong):   1 phiếu - Đã hoàn thành, có chi phí`,
    );
    console.log(`   🔴 Cancelled (hủy):    1 phiếu - Đã hủy`);
    console.log("\n💡 CÁCH TEST:");
    console.log("   1. Admin → vào /admin/maintenance xem danh sách phiếu");
    console.log(
      "   2. Bấm 'Bắt đầu' trên phiếu pending → sân chuyển maintenance",
    );
    console.log(
      "   3. Khách vào đặt sân → các slot bảo trì bị xám + tag 'Bảo trì'",
    );
    console.log(
      "   4. Bấm 'Hoàn thành' trên phiếu in_progress → nhập chi phí → sân về active",
    );

    process.exit(0);
  } catch (err) {
    console.error("❌ Lỗi seed maintenance:", err.message);
    process.exit(1);
  }
};

seedMaintenance();
