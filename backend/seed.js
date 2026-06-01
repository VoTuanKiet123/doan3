require('dotenv').config();
const dns = require('dns');
// Set Google DNS to bypass local VNPT DNS timeouts
dns.setServers(['8.8.8.8', '1.1.1.1']);

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB Atlas');
};

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true },
  password: { type: String, select: false },
  phone: String,
  role: { type: String, default: 'user' },
}, { timestamps: true });

const courtSchema = new mongoose.Schema({
  name: String,
  description: String,
  pricePerHour: Number,
  imageUrl: { type: String, default: '' },
  status: { type: String, default: 'active' },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Court = mongoose.models.Court || mongoose.model('Court', courtSchema);

const courts = [
  {
    name: 'Sân A1 - Tiêu chuẩn',
    description: 'Sân cầu lông tiêu chuẩn BWF, sàn gỗ cứng, hệ thống đèn LED 600 lux. Phù hợp luyện tập và thi đấu phong trào.',
    pricePerHour: 80000,
    status: 'active',
  },
  {
    name: 'Sân A2 - Tiêu chuẩn',
    description: 'Sân cầu lông tiêu chuẩn BWF, sàn gỗ cứng, hệ thống đèn LED 600 lux. Phù hợp luyện tập và thi đấu phong trào.',
    pricePerHour: 80000,
    status: 'active',
  },
  {
    name: 'Sân B1 - VIP',
    description: 'Sân VIP cao cấp, sàn PVC chuyên dụng, hệ thống đèn LED 800 lux, điều hòa không khí. Tiêu chuẩn thi đấu quốc gia.',
    pricePerHour: 150000,
    status: 'active',
  },
  {
    name: 'Sân B2 - VIP',
    description: 'Sân VIP cao cấp, sàn PVC chuyên dụng, hệ thống đèn LED 800 lux, điều hòa không khí. Tiêu chuẩn thi đấu quốc gia.',
    pricePerHour: 150000,
    status: 'active',
  },
  {
    name: 'Sân C1 - Premium',
    description: 'Sân Premium đẳng cấp nhất, sàn gỗ maple nhập khẩu, hệ thống chiếu sáng chuyên nghiệp 1000 lux, phòng thay đồ riêng.',
    pricePerHour: 220000,
    status: 'active',
  },
  {
    name: 'Sân C2 - Bảo trì',
    description: 'Sân đang trong quá trình nâng cấp và bảo trì. Dự kiến mở cửa trở lại trong tuần tới.',
    pricePerHour: 120000,
    status: 'maintenance',
  },
];

const seedDB = async () => {
  try {
    await connectDB();

    // Clear old data
    await Court.deleteMany({});
    console.log('🗑️  Đã xóa dữ liệu sân cũ');

    // Seed courts
    const createdCourts = await Court.insertMany(courts);
    console.log(`✅ Đã thêm ${createdCourts.length} sân`);

    // Seed admin user
    const existingAdmin = await User.findOne({ email: 'admin@badminton.com' });
    if (!existingAdmin) {
      const hashedPass = await bcrypt.hash('admin123', 10);
      await User.create({
        name: 'Admin',
        email: 'admin@badminton.com',
        password: hashedPass,
        role: 'admin',
        phone: '0901234567',
      });
      console.log('✅ Đã tạo tài khoản admin: admin@badminton.com / admin123');
    } else {
      console.log('ℹ️  Tài khoản admin đã tồn tại');
    }

    console.log('\n🎉 Seed data hoàn tất!');
    console.log('📌 Admin login: admin@badminton.com / admin123');
    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi seed:', err.message);
    process.exit(1);
  }
};

seedDB();
