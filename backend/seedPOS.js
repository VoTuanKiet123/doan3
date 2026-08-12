require("dotenv").config();
const User = require("./src/models/User");
const CancellationPolicy = require("./src/models/CancellationPolicy");
const connectDB = require("./src/config/db");

const seedPOSData = async () => {
  try {
    await connectDB();
    console.log("📦 Đang seed dữ liệu POS...\n");

    // ========== Tạo tài khoản POS Staff ==========
    const posStaffEmail = "posstaff@badminton.com";
    const existingStaff = await User.findOne({ email: posStaffEmail });

    if (!existingStaff) {
      await User.create({
        name: "Nhân Viên Quầy",
        email: posStaffEmail,
        password: "123456", // Không hash thủ công - Mongoose pre-save hook sẽ tự hash
        phone: "0987654321",
        role: "pos_staff",
      });
      console.log("✅ Đã tạo tài khoản POS Staff:");
      console.log(`   Email: ${posStaffEmail}`);
      console.log("   Password: 123456");
      console.log("");
    } else {
      // Fix: Xoá tài khoản cũ (bị hash sai) và tạo lại
      await User.findByIdAndDelete(existingStaff._id);
      await User.create({
        name: "Nhân Viên Quầy",
        email: posStaffEmail,
        password: "123456",
        phone: "0987654321",
        role: "pos_staff",
      });
      console.log("🔧 Đã tạo lại tài khoản POS Staff (fix lỗi hash):");
      console.log(`   Email: ${posStaffEmail}`);
      console.log("   Password: 123456");
      console.log("");
    }

    // ========== Tạo tài khoản POS Staff 2 ==========
    const posStaffEmail2 = "posstaff2@badminton.com";
    const existingStaff2 = await User.findOne({ email: posStaffEmail2 });

    if (!existingStaff2) {
      await User.create({
        name: "Lễ Tân Ca 2",
        email: posStaffEmail2,
        password: "123456", // Không hash thủ công - Mongoose pre-save hook sẽ tự hash
        phone: "0987654322",
        role: "pos_staff",
      });
      console.log("✅ Đã tạo tài khoản POS Staff 2:");
      console.log(`   Email: ${posStaffEmail2}`);
      console.log("   Password: 123456");
      console.log("");
    } else {
      await User.findByIdAndDelete(existingStaff2._id);
      await User.create({
        name: "Lễ Tân Ca 2",
        email: posStaffEmail2,
        password: "123456",
        phone: "0987654322",
        role: "pos_staff",
      });
      console.log("🔧 Đã tạo lại tài khoản POS Staff 2 (fix lỗi hash):");
      console.log(`   Email: ${posStaffEmail2}`);
      console.log("   Password: 123456");
      console.log("");
    }

    // ========== Tạo Cancellation Policy mặc định ==========
    const existingPolicy = await CancellationPolicy.findOne({ isActive: true });

    if (!existingPolicy) {
      await CancellationPolicy.create({
        name: "Chính sách hủy mặc định",
        isActive: true,
        rules: [
          { hoursBefore: 24, refundPercent: 100 },
          { hoursBefore: 2, refundPercent: 50 },
          { hoursBefore: 0, refundPercent: 0 },
        ],
        noShowMinutes: 15,
        description:
          "Huỷ trước 24h: hoàn 100%. Huỷ trước 2-24h: hoàn 50%. Huỷ dưới 2h: không hoàn.",
      });
      console.log("✅ Đã tạo Chính sách huỷ mặc định:");
      console.log("   - Trước 24h: Hoàn 100%");
      console.log("   - Trước 2-24h: Hoàn 50%");
      console.log("   - Dưới 2h: Không hoàn");
      console.log("   - No-show sau: 15 phút");
    } else {
      console.log("ℹ️  Chính sách huỷ đã tồn tại:", existingPolicy.name);
    }

    console.log("\n🎉 Seed dữ liệu POS hoàn tất!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi seed:", error.message);
    process.exit(1);
  }
};

seedPOSData();
