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

const dbFile = path.join(__dirname, "../../../data/db.json");

// Setup mock database fallback
const setupMockDB = () => {
  console.log("\n======================================================");
  console.log("⚠️  LƯU Ý: Không thể kết nối MongoDB Atlas (có thể do cụm");
  console.log("   sân bị tạm dừng - Paused hoặc lỗi DNS mạng nội bộ).");
  console.log("👉 TỰ ĐỘNG CHUYỂN SANG DÙNG CƠ SỞ DỮ LIỆU JSON FILE MỀM!");
  console.log("   Mọi tính năng đặt sân, xem lịch vẫn hoạt động 100%!");
  console.log("======================================================\n");

  const dataDir = path.dirname(dbFile);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Initial data if file empty
  if (!fs.existsSync(dbFile) || fs.readFileSync(dbFile, "utf8").trim() === "") {
    const initialData = {
      courts: [
        {
          _id: "court_1",
          name: "Sân A1 - Tiêu chuẩn",
          description:
            "Sân cầu lông tiêu chuẩn BWF, sàn gỗ cứng, hệ thống đèn LED 600 lux. Phù hợp luyện tập và thi đấu phong trào.",
          pricePerHour: 80000,
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          _id: "court_2",
          name: "Sân A2 - Tiêu chuẩn",
          description:
            "Sân cầu lông tiêu chuẩn BWF, sàn gỗ cứng, hệ thống đèn LED 600 lux. Phù hợp luyện tập và thi đấu phong trào.",
          pricePerHour: 80000,
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          _id: "court_3",
          name: "Sân B1 - VIP",
          description:
            "Sân VIP cao cấp, sàn PVC chuyên dụng, hệ thống đèn LED 800 lux, điều hòa không khí. Tiêu chuẩn thi đấu quốc gia.",
          pricePerHour: 150000,
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          _id: "court_4",
          name: "Sân B2 - VIP",
          description:
            "Sân VIP cao cấp, sàn PVC chuyên dụng, hệ thống đèn LED 800 lux, điều hòa không khí. Tiêu chuẩn thi đấu quốc gia.",
          pricePerHour: 150000,
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          _id: "court_5",
          name: "Sân C1 - Premium",
          description:
            "Sân Premium đẳng cấp nhất, sàn gỗ maple nhập khẩu, hệ thống chiếu sáng chuyên nghiệp 1000 lux, phòng thay đồ riêng.",
          pricePerHour: 220000,
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          _id: "court_6",
          name: "Sân C2 - Bảo trì",
          description:
            "Sân đang trong quá trình nâng cấp và bảo trì. Dự kiến mở cửa trở lại trong tuần tới.",
          pricePerHour: 120000,
          status: "maintenance",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      users: [
        {
          _id: "user_admin",
          name: "Admin",
          email: "admin@badminton.com",
          password: bcrypt.hashSync("admin123", 10),
          role: "admin",
          phone: "0901234567",
          createdAt: new Date().toISOString(),
        },
      ],
      bookings: [],
      pricingrules: [
        {
          _id: "rule_1",
          name: "Giờ vàng tối (Thứ 2 - Thứ 6)",
          type: "peak",
          daysOfWeek: [1, 2, 3, 4, 5],
          startHour: 17,
          endHour: 22,
          priceMultiplier: 1.5,
          priority: 2,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          _id: "rule_2",
          name: "Cuối tuần (Thứ 7 & Chủ Nhật)",
          type: "weekend",
          daysOfWeek: [0, 6],
          startHour: 6,
          endHour: 22,
          priceMultiplier: 1.8,
          priority: 1,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };
    fs.writeFileSync(dbFile, JSON.stringify(initialData, null, 2), "utf8");
  }

  // Read/write helpers
  const readData = () => {
    try {
      const data = JSON.parse(fs.readFileSync(dbFile, "utf8"));
      let modified = false;
      if (!data.courts) {
        data.courts = [];
        modified = true;
      }
      if (!data.users) {
        data.users = [];
        modified = true;
      }
      if (!data.bookings) {
        data.bookings = [];
        modified = true;
      }
      if (!data.pricingrules) {
        data.pricingrules = [
          {
            _id: "rule_1",
            name: "Giờ vàng tối (Thứ 2 - Thứ 6)",
            type: "peak",
            daysOfWeek: [1, 2, 3, 4, 5],
            startHour: 17,
            endHour: 22,
            priceMultiplier: 1.5,
            priority: 2,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            _id: "rule_2",
            name: "Cuối tuần (Thứ 7 & Chủ Nhật)",
            type: "weekend",
            daysOfWeek: [0, 6],
            startHour: 6,
            endHour: 22,
            priceMultiplier: 1.8,
            priority: 1,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];
        modified = true;
      }
      if (modified) {
        fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), "utf8");
      }
      return data;
    } catch (e) {
      return { courts: [], users: [], bookings: [], pricingrules: [] };
    }
  };

  const writeData = (data) => {
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), "utf8");
  };

  // Helper to wrap raw json objects with Mongoose schema methods
  const wrapDoc = (item, modelName) => {
    if (!item) return item;

    const doc = { ...item };

    // Default status for Booking and Court
    if (modelName === "Booking" && !doc.status) {
      doc.status = "pending";
    }
    if (modelName === "Court" && !doc.status) {
      doc.status = "active";
    }

    doc.populate = async function (path) {
      const data = readData();
      if (path === "user") {
        const userId =
          typeof this.user === "string"
            ? this.user
            : this.user?._id || this.user;
        const u = data.users.find(
          (x) => x._id === userId || x._id?.toString() === userId?.toString(),
        );
        if (u) this.user = { ...u };
      }
      if (path === "court") {
        const courtId =
          typeof this.court === "string"
            ? this.court
            : this.court?._id || this.court;
        const c = data.courts.find(
          (x) => x._id === courtId || x._id?.toString() === courtId?.toString(),
        );
        if (c) this.court = { ...c };
      }
      return this;
    };

    doc.save = async function () {
      const data = readData();
      if (modelName === "User") {
        const list = data.users || [];
        const idx = list.findIndex(
          (u) =>
            u._id === this._id || u._id?.toString() === this._id?.toString(),
        );
        if (idx !== -1) {
          const oldUser = list[idx];
          if (
            this.password &&
            this.password !== oldUser.password &&
            !this.password.startsWith("$2a$")
          ) {
            this.password = await bcrypt.hash(this.password, 10);
          }
          const rawDoc = { ...this };
          delete rawDoc.populate;
          delete rawDoc.save;
          list[idx] = rawDoc;
          data.users = list;
          writeData(data);
        }
      }
      if (modelName === "Booking") {
        const list = data.bookings || [];
        const idx = list.findIndex(
          (b) =>
            b._id === this._id || b._id?.toString() === this._id?.toString(),
        );
        if (idx !== -1) {
          const rawDoc = { ...this };
          delete rawDoc.populate;
          delete rawDoc.save;
          // Ensure we don't save populated user/court structures, keep them as IDs
          if (rawDoc.user && typeof rawDoc.user === "object") {
            rawDoc.user = rawDoc.user._id || rawDoc.user;
          }
          if (rawDoc.court && typeof rawDoc.court === "object") {
            rawDoc.court = rawDoc.court._id || rawDoc.court;
          }
          list[idx] = rawDoc;
          data.bookings = list;
          writeData(data);
        }
      }
      if (modelName === "PricingRule") {
        const list = data.pricingrules || [];
        const idx = list.findIndex(
          (r) =>
            r._id === this._id || r._id?.toString() === this._id?.toString(),
        );
        if (idx !== -1) {
          const rawDoc = { ...this };
          delete rawDoc.populate;
          delete rawDoc.save;
          list[idx] = rawDoc;
          data.pricingrules = list;
          writeData(data);
        }
      }
      return this;
    };

    if (modelName === "User") {
      doc.comparePassword = async function (candidatePassword) {
        if (!this.password) return false;
        try {
          if (this.password.startsWith("$2a$")) {
            return await bcrypt.compare(candidatePassword, this.password);
          }
        } catch (e) {
          console.error("Bcrypt comparison error:", e.message);
        }
        // Fallback to plain text comparison for legacy or non-hashed seed data
        return candidatePassword === this.password;
      };
    }

    return doc;
  };

  const wrapResults = (results, modelName) => {
    if (Array.isArray(results)) {
      return results.map((item) => wrapDoc(item, modelName));
    }
    return wrapDoc(results, modelName);
  };

  // Helper to mock mongoose query chains
  const makeQueryChain = (results, modelName) => {
    const wrapped = wrapResults(results, modelName);
    const chain = {
      results: wrapped,
      sort: function () {
        return this;
      },
      populate: function (path, select) {
        const data = readData();
        const items = Array.isArray(this.results)
          ? this.results
          : this.results
            ? [this.results]
            : [];

        items.forEach((item) => {
          if (path === "user") {
            const userId =
              typeof item.user === "string"
                ? item.user
                : item.user?._id || item.user;
            const u = data.users.find(
              (x) =>
                x._id === userId || x._id?.toString() === userId?.toString(),
            );
            if (u) item.user = { ...u };
          }
          if (path === "court") {
            const courtId =
              typeof item.court === "string"
                ? item.court
                : item.court?._id || item.court;
            const c = data.courts.find(
              (x) =>
                x._id === courtId || x._id?.toString() === courtId?.toString(),
            );
            if (c) item.court = { ...c };
          }
        });
        return this;
      },
      select: function () {
        return this;
      },
      lean: function () {
        return this;
      },
      then: function (resolve) {
        resolve(this.results);
        return this;
      },
      catch: function () {
        return this;
      },
    };
    // Make query chain thenable (promises)
    chain.then = chain.then.bind(chain);
    return chain;
  };

  // Patch Mongoose Models with custom JSON methods
  const patchModel = (modelName, collectionName) => {
    const Model = mongoose.model(modelName);

    // ----- Hàm helper: so khớp 1 item với query object -----
    const matchItem = (item, query) => {
      for (let key in query) {
        const queryVal = query[key];

        // Xử lý toán tử $or
        if (key === "$or" && Array.isArray(queryVal)) {
          const anyMatch = queryVal.some((subQuery) =>
            matchItem(item, subQuery),
          );
          if (!anyMatch) return false;
          continue;
        }

        // Xử lý $and
        if (key === "$and" && Array.isArray(queryVal)) {
          const allMatch = queryVal.every((subQuery) =>
            matchItem(item, subQuery),
          );
          if (!allMatch) return false;
          continue;
        }

        const itemVal = item[key];

        // Nếu queryVal là object chứa toán tử MongoDB ($ne, $lt, $gt, $gte, $lte, $in)
        if (
          typeof queryVal === "object" &&
          queryVal !== null &&
          !Array.isArray(queryVal)
        ) {
          if ("$ne" in queryVal) {
            if (
              itemVal === queryVal.$ne ||
              (itemVal && itemVal.toString() === queryVal.$ne?.toString())
            )
              return false;
          }
          if ("$lt" in queryVal) {
            if (!(itemVal < queryVal.$lt)) return false;
          }
          if ("$gt" in queryVal) {
            if (!(itemVal > queryVal.$gt)) return false;
          }
          if ("$lte" in queryVal) {
            if (!(itemVal <= queryVal.$lte)) return false;
          }
          if ("$gte" in queryVal) {
            if (!(itemVal >= queryVal.$gte)) return false;
          }
          if ("$in" in queryVal) {
            if (!queryVal.$in.includes(itemVal)) return false;
          }
          continue;
        }

        // So sánh bằng (hỗ trợ ObjectId string comparison)
        if (itemVal === queryVal) continue;
        if (itemVal && itemVal.toString() === queryVal?.toString()) continue;
        return false;
      }
      return true;
    };

    Model.find = function (query = {}) {
      const data = readData();
      let list = data[collectionName] || [];

      if (Object.keys(query).length > 0) {
        list = list.filter((item) => matchItem(item, query));
      }

      return makeQueryChain(list, modelName);
    };

    Model.findOne = function (query = {}) {
      const data = readData();
      const list = data[collectionName] || [];
      const item = list.find((item) => matchItem(item, query));
      return makeQueryChain(item || null, modelName);
    };

    Model.findById = function (id) {
      const data = readData();
      const list = data[collectionName] || [];
      const item = list.find(
        (item) => item._id === id || item._id?.toString() === id?.toString(),
      );
      return makeQueryChain(item || null, modelName);
    };

    Model.create = async function (doc) {
      const data = readData();
      const list = data[collectionName] || [];

      const docToSave = { ...doc };
      if (
        modelName === "User" &&
        docToSave.password &&
        !docToSave.password.startsWith("$2a$")
      ) {
        docToSave.password = await bcrypt.hash(docToSave.password, 10);
      }

      const newDoc = {
        _id:
          modelName.toLowerCase() +
          "_" +
          Math.random().toString(36).substr(2, 9),
        ...docToSave,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      list.push(newDoc);
      data[collectionName] = list;
      writeData(data);

      return wrapDoc(newDoc, modelName);
    };

    // insertMany: dùng cho đặt lịch cố định hàng loạt
    Model.insertMany = async function (docs) {
      const data = readData();
      const list = data[collectionName] || [];
      const results = [];

      for (const doc of docs) {
        const docToSave = { ...doc };
        if (
          modelName === "User" &&
          docToSave.password &&
          !docToSave.password.startsWith("$2a$")
        ) {
          docToSave.password = await bcrypt.hash(docToSave.password, 10);
        }
        const newDoc = {
          _id:
            modelName.toLowerCase() +
            "_" +
            Math.random().toString(36).substr(2, 9),
          ...docToSave,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        list.push(newDoc);
        results.push(wrapDoc(newDoc, modelName));
      }

      data[collectionName] = list;
      writeData(data);
      return results;
    };

    Model.findByIdAndUpdate = function (id, update, options = {}) {
      const data = readData();
      const list = data[collectionName] || [];
      const idx = list.findIndex(
        (item) => item._id === id || item._id?.toString() === id?.toString(),
      );
      if (idx !== -1) {
        list[idx] = {
          ...list[idx],
          ...update,
          updatedAt: new Date().toISOString(),
        };
        data[collectionName] = list;
        writeData(data);
        return makeQueryChain(list[idx], modelName);
      }
      return makeQueryChain(null, modelName);
    };

    // updateMany: dùng để huỷ batch
    Model.updateMany = async function (query, update) {
      const data = readData();
      const list = data[collectionName] || [];
      let modifiedCount = 0;

      for (let i = 0; i < list.length; i++) {
        if (matchItem(list[i], query)) {
          list[i] = {
            ...list[i],
            ...update,
            updatedAt: new Date().toISOString(),
          };
          modifiedCount++;
        }
      }

      data[collectionName] = list;
      writeData(data);
      return { modifiedCount, matchedCount: modifiedCount };
    };

    Model.findByIdAndDelete = function (id) {
      const data = readData();
      const list = data[collectionName] || [];
      const idx = list.findIndex(
        (item) => item._id === id || item._id?.toString() === id?.toString(),
      );
      if (idx !== -1) {
        const deleted = list.splice(idx, 1)[0];
        data[collectionName] = list;
        writeData(data);
        return makeQueryChain(deleted, modelName);
      }
      return makeQueryChain(null, modelName);
    };
  };

  // Patch each model (chỉ patch nếu model đã được mongoose đăng ký)
  const modelNames = ["Court", "User", "Booking", "PricingRule"];
  const collectionMap = {
    Court: "courts",
    User: "users",
    Booking: "bookings",
    PricingRule: "pricingrules",
  };

  for (const name of modelNames) {
    try {
      mongoose.model(name); // Kiểm tra model đã đăng ký chưa
      patchModel(name, collectionMap[name]);
    } catch (e) {
      console.log(`   ⚠️ Model ${name} chưa đăng ký, bỏ qua mock patch.`);
    }
  }
};

const connectDB = async () => {
  try {
    console.log("Connecting to MongoDB...");
    // Set a short timeout so it fails quickly if DNS is offline/paused
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 4000,
      connectTimeoutMS: 4000,
    });
    console.log(`✅ MongoDB Connected successfully: ${conn.connection.host}`);
  } catch (error) {
    console.log(`❌ MongoDB Atlas connection failed: ${error.message}`);
    setupMockDB();
  }
};

module.exports = connectDB;
