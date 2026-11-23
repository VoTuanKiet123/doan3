/**
 * seedEvents.js — Loại sự kiện mặc định + 2 sự kiện demo (1 đang mở đăng ký, 1 đã có Top 5)
 * Chạy: node seedEvents.js   (idempotent — không tạo trùng)
 */
require("dotenv").config();
const connectDB = require("./src/config/db");

const daysFromNow = (d) => new Date(Date.now() + d * 86400000);

const DEFAULT_TYPES = [
  {
    name: "Giải cá nhân",
    note: "Thi đấu đơn nam / đơn nữ theo thể thức loại trực tiếp hoặc vòng bảng.",
  },
  {
    name: "Giải đôi",
    note: "Thi đấu đôi nam, đôi nữ hoặc đôi nam nữ (2 VĐV/đội).",
  },
  {
    name: "Giải đồng đội",
    note: "Thi đấu theo đội/CLB gồm nhiều nội dung đơn và đôi.",
  },
  {
    name: "Giải giao hữu",
    note: "Giao lưu cọ xát phong trào, không đặt nặng thành tích.",
  },
];

const main = async () => {
  await connectDB();
  const EventType = require("./src/models/EventType");
  const Event = require("./src/models/Event");
  const Court = require("./src/models/Court");

  const typeMap = {};
  for (const item of DEFAULT_TYPES) {
    let doc = await EventType.findOne({ name: item.name });
    if (!doc) {
      doc = await EventType.create(item);
    } else if (!doc.note) {
      doc.note = item.note;
      await doc.save();
    }
    typeMap[item.name] = doc._id;
  }
  console.log(`🏷  Loại sự kiện: ${await EventType.countDocuments()} bản ghi`);

  if ((await Event.countDocuments()) > 0) {
    // Bổ sung phân loại cho dữ liệu demo cũ nếu đang bị trống type
    await Event.updateOne(
      { name: "Giải cầu lông mở lần 1", type: null },
      { $set: { type: typeMap["Giải cá nhân"] } },
    );
    await Event.updateOne(
      { name: "Giải giao hữu tháng 10", type: null },
      { $set: { type: typeMap["Giải giao hữu"] } },
    );
    console.log("ℹ️  Đã có sự kiện — bỏ qua tạo mới demo");
  } else {
    const court = await Court.findOne({});
    const demo = [
      {
        name: "Giải cầu lông mở lần 1",
        type: typeMap["Giải cá nhân"],
        startDate: daysFromNow(20),
        endDate: daysFromNow(21),
        registrationDeadline: daysFromNow(14),
        maxRegistrations: 32,
        sponsors: ["Yonex Việt Nam", "Thành Long Sport"],
        status: "published",
        description: "Giải dành cho hội viên, thể thức loại trực tiếp.",
      },
      {
        name: "Giải giao hữu tháng 10",
        type: typeMap["Giải giao hữu"],
        startDate: daysFromNow(-30),
        endDate: daysFromNow(-29),
        registrationDeadline: daysFromNow(-35),
        maxRegistrations: 16,
        sponsors: ["CLB Phương Nam"],
        status: "published",
        results: [
          { rank: 1, name: "Nguyễn Văn A" },
          { rank: 2, name: "Trần Văn B" },
          { rank: 3, name: "Lê Văn C" },
        ],
      },
    ];
    for (const d of demo) {
      if (!(await Event.findOne({ name: d.name }))) {
        await Event.create({ ...d, court: court ? court._id : null });
      }
    }
    console.log("🎾 Đã tạo 2 sự kiện demo");
  }

  await require("mongoose").disconnect();
  console.log("✅ seedEvents xong");
  process.exit(0);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});