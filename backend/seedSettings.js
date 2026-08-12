require("dotenv").config();
const SystemSettings = require("./src/models/SystemSettings");
const connectDB = require("./src/config/db");

const seedSettings = async () => {
  try {
    await connectDB();
    console.log("📦 Đang seed SystemSettings...\n");

    const existing = await SystemSettings.findOne();
    if (existing) {
      console.log("⚙️  SystemSettings đã tồn tại:");
      console.log(`   floatAmount: ${existing.floatAmount.toLocaleString()}đ`);
      console.log(`   venueName: ${existing.venueName}`);
      console.log("   (Dùng API PUT /api/settings/admin để cập nhật)");
    } else {
      const settings = await SystemSettings.create({
        floatAmount: 500000,
        venueName: "Sân Cầu Lông Badminton Center",
        venueAddress: "123 Nguyễn Huệ, Quận 1, TP.HCM",
        venuePhone: "0901234567",
        openTime: "06:00",
        closeTime: "22:00",
      });
      console.log("✅ Đã tạo SystemSettings mặc định:");
      console.log(`   floatAmount: ${settings.floatAmount.toLocaleString()}đ`);
      console.log(`   venueName: ${settings.venueName}`);
    }

    console.log("\n✨ Seed SystemSettings hoàn tất!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi seed SystemSettings:", error.message);
    process.exit(1);
  }
};

seedSettings();
