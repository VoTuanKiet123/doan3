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
  type: { type: String, enum: ['A', 'B', 'C'], default: 'A' },
  description: String,
  pricePerHour: Number,
  services: [String],
  imageUrl: { type: String, default: '' },
  status: { type: String, default: 'active' },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Court = mongoose.models.Court || mongoose.model('Court', courtSchema);

const courts = [
  {
    name: 'Sân A1 - VIP Premium',
    type: 'A',
    description: 'Sân VIP cao cấp nhất với thảm Taraflex thi đấu quốc tế, hệ thống đèn LED 1000 Lux chống lóa và điều hòa không khí.',
    pricePerHour: 70000,
    services: [
      'Thảm Taraflex cao cấp thi đấu',
      'Đèn LED 800-1000 Lux chống lóa',
      'Điều hòa / Quạt mát công suất lớn',
      'Nước uống đóng chai miễn phí',
      'Wifi tốc độ cao miễn phí',
      'Dịch vụ lau thảm & Tủ đồ khóa từ'
    ],
    status: 'active',
  },
  {
    name: 'Sân A2 - VIP Premium',
    type: 'A',
    description: 'Sân VIP cao cấp đạt tiêu chuẩn thi đấu quốc gia, đầy đủ máy lạnh, nước uống và tủ khóa an toàn.',
    pricePerHour: 70000,
    services: [
      'Thảm Taraflex cao cấp thi đấu',
      'Đèn LED 800-1000 Lux chống lóa',
      'Điều hòa / Quạt mát công suất lớn',
      'Nước uống đóng chai miễn phí',
      'Wifi tốc độ cao miễn phí',
      'Dịch vụ lau thảm & Tủ đồ khóa từ'
    ],
    status: 'active',
  },
  {
    name: 'Sân B1 - Tiêu Chuẩn',
    type: 'B',
    description: 'Sân cầu lông tiêu chuẩn chất lượng cao, thảm BWF độ đàn hồi tốt, phù hợp tập luyện hàng ngày và giao lưu phong trào.',
    pricePerHour: 50000,
    services: [
      'Thảm cao su tiêu chuẩn BWF',
      'Đèn LED 600 Lux chống lóa',
      'Quạt mát công suất lớn & Ghế chờ',
      'Wifi miễn phí',
      'Nước giải khát bán kèm'
    ],
    status: 'active',
  },
  {
    name: 'Sân B2 - Tiêu Chuẩn',
    type: 'B',
    description: 'Sân tiêu chuẩn BWF sạch đẹp, quạt mát công suất lớn, ánh sáng chống lóa dễ quan sát cầu.',
    pricePerHour: 50000,
    services: [
      'Thảm cao su tiêu chuẩn BWF',
      'Đèn LED 600 Lux chống lóa',
      'Quạt mát công suất lớn & Ghế chờ',
      'Wifi miễn phí',
      'Nước giải khát bán kèm'
    ],
    status: 'active',
  },
  {
    name: 'Sân C1 - Tiết Kiệm',
    type: 'C',
    description: 'Sân tiết kiệm chi phí cho nhóm bạn trẻ và sinh viên, sàn phủ cao su êm ái, đầy đủ quạt gió và cây nước uống.',
    pricePerHour: 30000,
    services: [
      'Sàn acrylic / thảm cao su cơ bản',
      'Hệ thống đèn chiếu sáng tiêu chuẩn',
      'Quạt xoay & Ghế ngồi nghỉ',
      'Cây nước uống miễn phí tự phục vụ'
    ],
    status: 'active',
  },
  {
    name: 'Sân C2 - Tiết Kiệm',
    type: 'C',
    description: 'Sân C2 tiết kiệm chi phí cho nhóm bạn trẻ và sinh viên, sàn phủ cao su êm ái, đầy đủ quạt gió và cây nước uống.',
    pricePerHour: 30000,
    services: [
      'Sàn acrylic / thảm cao su cơ bản',
      'Hệ thống đèn chiếu sáng tiêu chuẩn',
      'Quạt xoay & Ghế ngồi nghỉ',
      'Cây nước uống miễn phí tự phục vụ'
    ],
    status: 'active',
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
