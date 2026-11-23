/**
 * seedEvents.js — Loại sự kiện mặc định + 2 sự kiện demo (1 đang mở đăng ký, 1 đã có Top 5)
 * Chạy: node seedEvents.js   (idempotent — không tạo trùng)
 */
require("dotenv").config();
const connectDB = require("./src/config/db");

const daysFromNow = (d) => new Date(Date.now() + d * 86400000);

const main = async () => {
  await connectDB();
  const EventType = require("./src/models/EventType");
  const Event = require("./src/models/Event");
  const Court = require("./src/models/Court");

  const types = ["Giải cá nhân", "Giải đôi", "Giải đồng đội", "Giải giao hữu"];
  for (const name of types) {
    if (!(await EventType.findOne({ name }))) await EventType.create({ name });
  }
  console.log(`🏷  Loại sự kiện: ${await EventType.countDocuments()} bản ghi`);

  if ((await Event.countDocuments()) > 0) {
    console.log("ℹ️  Đã có sự kiện — bỏ qua demo");
  } else {
    const court = await Court.findOne({});
    const demo = [
      {
        name: "Giải cầu lông mở lần 1",
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
      if (!(await Event.findOne({ name: d.name })))
        await Event.create({ ...d, court: court ? court._id : null });
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
