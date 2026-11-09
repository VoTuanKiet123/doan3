/**
 * migrateMaintenanceV2.js
 * Migration cho Bảo trì nâng cao (v2) — chạy 1 lần sau khi deploy schema mới:
 *   node migrateMaintenanceV2.js
 *
 * - Gán ticketCode (hook pre-save tự sinh qua Counter) + giá trị mặc định field v2 cho phiếu cũ
 * - Phiếu cũ đã completed/cancelled có cost > 0 → map cost vào costContractor/costTotal
 * - Dropped các index cũ không còn khai báo trong schema
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Maintenance = require("./src/models/Maintenance");

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Connected to MongoDB");

  // ---- 1. Gán ticketCode + default field v2 cho phiếu cũ ----
  const legacy = await Maintenance.find({ ticketCode: { $exists: false } });
  console.log(`🔧 Phiếu chưa có mã: ${legacy.length}`);
  for (const doc of legacy) {
    // save() kích hook pre-save sinh mã + áp default cho field mới còn thiếu
    if (
      (doc.status === "completed" || doc.status === "cancelled") &&
      doc.cost > 0 &&
      doc.costContractor === 0
    ) {
      doc.costContractor = doc.cost;
      doc.costTotal = doc.cost;
    }
    await doc.save();
    console.log(`   ${doc._id} → ${doc.ticketCode}`);
  }

  // ---- 2. Drop index cũ (không khai báo nữa trong schema) ----
  const dropNames = [
    "court_1_status_1",
    "startDate_1_endDate_1_status_1",
    "maintenanceType_1",
  ];
  for (const name of dropNames) {
    try {
      await Maintenance.collection.dropIndex(name);
      console.log(`🗑️ Đã drop index ${name}`);
    } catch {
      // Index không tồn tại (DB mới) hoặc tên khác — bỏ qua
    }
  }

  console.log("🎉 Migration maintenance v2 hoàn tất");
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error("❌ Migration lỗi:", err.message);
  process.exit(1);
});
