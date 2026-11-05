const mongoose = require("mongoose");
const dns = require("dns");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

// Set DNS to Google to avoid VNPT local DNS timeouts
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {
  console.log("⚠️ Could not set DNS servers:", e.message);
}

const DATA_DIR = path.join(__dirname, "../../../data");
const LOCAL_DB_DIR = path.join(DATA_DIR, "mongo"); // dữ liệu MongoDB cục bộ (giữ lại khi tắt server)
const LEGACY_JSON = path.join(DATA_DIR, "db.json"); // dữ liệu cũ của chế độ JSON
const LOCAL_PORT = Number(process.env.LOCAL_MONGO_PORT) || 27018;

let localServer = null;

// Nạp tất cả model để mongoose biết schema khi import / seed
const loadModels = () => {
  const dir = path.join(__dirname, "../models");
  for (const f of fs.readdirSync(dir)) {
    if (f.endsWith(".js")) require(path.join(dir, f));
  }
};

// ---------------------------------------------------------------
// Import dữ liệu cũ từ data/db.json (id dạng "court_1" → ObjectId)
// ---------------------------------------------------------------
const COLLECTION_MODEL = {
  courts: "Court",
  users: "User",
  bookings: "Booking",
  pricingrules: "PricingRule",
  products: "Product",
  serviceorders: "ServiceOrder",
};

const importLegacyJson = async () => {
  if (!fs.existsSync(LEGACY_JSON)) return;
  let data;
  try {
    data = JSON.parse(fs.readFileSync(LEGACY_JSON, "utf8"));
  } catch (e) {
    console.log("⚠️  Không đọc được data/db.json, bỏ qua import:", e.message);
    return;
  }

  // 1) Cấp ObjectId mới cho mọi id không hợp lệ
  const idMap = new Map();
  for (const key of Object.keys(COLLECTION_MODEL)) {
    for (const doc of data[key] || []) {
      const id = String(doc._id || "");
      if (!mongoose.isValidObjectId(id) || id.length !== 24) {
        idMap.set(id, new mongoose.Types.ObjectId().toString());
      }
    }
  }
  const remap = (v) => {
    if (typeof v === "string") return idMap.get(v) || v;
    if (Array.isArray(v)) return v.map(remap);
    if (v && typeof v === "object") {
      const out = {};
      for (const k of Object.keys(v)) out[k] = remap(v[k]);
      return out;
    }
    return v;
  };

  // 2) Ép kiểu theo schema rồi ghi thẳng vào collection (bỏ qua hook để không hash 2 lần)
  let total = 0;
  for (const [key, modelName] of Object.entries(COLLECTION_MODEL)) {
    const list = data[key] || [];
    if (!list.length) continue;
    const Model = mongoose.model(modelName);
    const docs = [];
    for (const raw of list) {
      const plain = remap(raw);
      if (modelName === "User" && plain.password && !/^\$2[aby]\$/.test(plain.password)) {
        plain.password = bcrypt.hashSync(String(plain.password), 10);
      }
      const doc = new Model(plain).toObject({ depopulate: true });
      if (raw.createdAt) doc.createdAt = new Date(raw.createdAt);
      if (raw.updatedAt) doc.updatedAt = new Date(raw.updatedAt);
      docs.push(doc);
    }
    try {
      await Model.collection.insertMany(docs, { ordered: false });
      total += docs.length;
    } catch (e) {
      console.log(`⚠️  Import ${key} lỗi một phần:`, e.message);
    }
  }
  console.log(`📥 Đã nhập ${total} bản ghi từ data/db.json`);
};

// ---------------------------------------------------------------
// Dữ liệu mặc định cho các actor (admin, nhân viên quầy) và cấu hình
// ---------------------------------------------------------------
const ensureDefaults = async () => {
  const User = mongoose.model("User");
  const CancellationPolicy = mongoose.model("CancellationPolicy");
  const SystemSettings = mongoose.model("SystemSettings");

  const accounts = [
    { name: "Admin", email: "admin@badminton.com", password: "admin123", phone: "0901234567", role: "admin" },
    { name: "Nhân Viên Quầy", email: "posstaff@badminton.com", password: "123456", phone: "0987654321", role: "pos_staff" },
    { name: "Lễ Tân Ca 2", email: "posstaff2@badminton.com", password: "123456", phone: "0987654322", role: "pos_staff" },
  ];
  for (const acc of accounts) {
    if (!(await User.findOne({ email: acc.email }))) {
      await User.create(acc);
      console.log(`👤 Đã tạo tài khoản ${acc.role}: ${acc.email} / ${acc.password}`);
    }
  }

  if (!(await CancellationPolicy.findOne({ isActive: true }))) {
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
    console.log("📄 Đã tạo chính sách huỷ mặc định");
  }

  await SystemSettings.getSettings();
};

// ---------------------------------------------------------------
// MongoDB chạy trên máy (dùng khi không vào được Atlas)
// ---------------------------------------------------------------
const startLocalMongo = async () => {
  // Replica set 1 node: bắt buộc vì code dùng transaction (session.startTransaction)
  const { MongoMemoryReplSet } = require("mongodb-memory-server");
  fs.mkdirSync(LOCAL_DB_DIR, { recursive: true });
  const isFresh = fs.readdirSync(LOCAL_DB_DIR).length === 0;

  localServer = await MongoMemoryReplSet.create({
    replSet: { count: 1, name: "rs0", storageEngine: "wiredTiger" },
    instanceOpts: [{ dbPath: LOCAL_DB_DIR, port: LOCAL_PORT }],
  });
  await localServer.waitUntilRunning();
  const uri = localServer.getUri("badminton_db");
  await mongoose.connect(uri);
  console.log(`✅ MongoDB cục bộ đang chạy (${uri}), dữ liệu lưu tại data/mongo`);

  if (isFresh || (await mongoose.model("User").countDocuments()) === 0) {
    await importLegacyJson();
  }
};

const connectDB = async () => {
  loadModels();
  try {
    if (!process.env.MONGODB_URI || process.env.USE_LOCAL_DB === "true") {
      throw new Error("Dùng MongoDB cục bộ theo cấu hình");
    }
    console.log("Connecting to MongoDB Atlas...");
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB Connected successfully: ${conn.connection.host}`);
  } catch (error) {
    console.log(`❌ Không kết nối được MongoDB Atlas: ${error.message}`);
    console.log("👉 Chuyển sang MongoDB chạy trên máy (đầy đủ chức năng)...");
    await mongoose.disconnect().catch(() => {});
    await startLocalMongo();
  }
  await ensureDefaults();
};

const stopLocalMongo = async () => {
  await mongoose.disconnect().catch(() => {});
  if (localServer) await localServer.stop({ doCleanup: false }).catch(() => {});
};

module.exports = connectDB;
module.exports.stopLocalMongo = stopLocalMongo;
