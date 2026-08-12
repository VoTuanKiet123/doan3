// Script tạo tài khoản Admin - Không ảnh hưởng dữ liệu hiện có
// Chạy: node seedAdmin.js
require("dotenv").config();
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Dùng chung schema với Model chính
const User = require("./src/models/User");

const ADMIN_EMAIL = "admin@badminton.com";
const ADMIN_PASSWORD = "admin123";
const ADMIN_NAME = "Admin";
const ADMIN_PHONE = "0901234567";

const seedAdmin = async () => {
  try {
    // Kết nối MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Kết nối MongoDB Atlas thành công");

    // Kiểm tra admin đã tồn tại chưa
    const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });

    if (existingAdmin) {
      // Nếu đã có admin, cập nhật role = admin (phòng trường hợp bị sai role)
      if (existingAdmin.role !== "admin") {
        existingAdmin.role = "admin";
        await existingAdmin.save();
        console.log("⚠️  Tài khoản đã tồn tại, đã cập nhật role thành admin");
      } else {
        console.log("ℹ️  Tài khoản admin đã tồn tại, không cần tạo mới");
      }
    } else {
      // Tạo admin mới (hash password qua pre-save hook của Model)
      // KHÔNG hash thủ công - để Model tự hash qua pre-save middleware
      await User.create({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: "admin",
        phone: ADMIN_PHONE,
      });
      console.log("✅ Đã tạo tài khoản admin mới");
    }

    console.log("──────────────────────────────────────────");
    console.log("📌 THÔNG TIN ĐĂNG NHẬP ADMIN:");
    console.log(`   Email:    ${ADMIN_EMAIL}`);
    console.log(`   Mật khẩu: ${ADMIN_PASSWORD}`);
    console.log(`   Vai trò:  admin`);
    console.log("──────────────────────────────────────────");

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ Lỗi:", err.message);
    process.exit(1);
  }
};

seedAdmin();
