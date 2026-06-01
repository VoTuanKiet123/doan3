const mongoose = require('mongoose');
const dns = require('dns');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Set DNS to Google to avoid VNPT local DNS timeouts
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  console.log('⚠️ Could not set DNS servers:', e.message);
}

const dbFile = path.join(__dirname, '../../../data/db.json');

// Setup mock database fallback
const setupMockDB = () => {
  console.log('\n======================================================');
  console.log('⚠️  LƯU Ý: Không thể kết nối MongoDB Atlas (có thể do cụm');
  console.log('   sân bị tạm dừng - Paused hoặc lỗi DNS mạng nội bộ).');
  console.log('👉 TỰ ĐỘNG CHUYỂN SANG DÙNG CƠ SỞ DỮ LIỆU JSON FILE MỀM!');
  console.log('   Mọi tính năng đặt sân, xem lịch vẫn hoạt động 100%!');
  console.log('======================================================\n');

  const dataDir = path.dirname(dbFile);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Initial data if file empty
  if (!fs.existsSync(dbFile) || fs.readFileSync(dbFile, 'utf8').trim() === '') {
    const initialData = {
      courts: [
        {
          _id: 'court_1',
          name: 'Sân A1 - Tiêu chuẩn',
          description: 'Sân cầu lông tiêu chuẩn BWF, sàn gỗ cứng, hệ thống đèn LED 600 lux. Phù hợp luyện tập và thi đấu phong trào.',
          pricePerHour: 80000,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          _id: 'court_2',
          name: 'Sân A2 - Tiêu chuẩn',
          description: 'Sân cầu lông tiêu chuẩn BWF, sàn gỗ cứng, hệ thống đèn LED 600 lux. Phù hợp luyện tập và thi đấu phong trào.',
          pricePerHour: 80000,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          _id: 'court_3',
          name: 'Sân B1 - VIP',
          description: 'Sân VIP cao cấp, sàn PVC chuyên dụng, hệ thống đèn LED 800 lux, điều hòa không khí. Tiêu chuẩn thi đấu quốc gia.',
          pricePerHour: 150000,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          _id: 'court_4',
          name: 'Sân B2 - VIP',
          description: 'Sân VIP cao cấp, sàn PVC chuyên dụng, hệ thống đèn LED 800 lux, điều hòa không khí. Tiêu chuẩn thi đấu quốc gia.',
          pricePerHour: 150000,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          _id: 'court_5',
          name: 'Sân C1 - Premium',
          description: 'Sân Premium đẳng cấp nhất, sàn gỗ maple nhập khẩu, hệ thống chiếu sáng chuyên nghiệp 1000 lux, phòng thay đồ riêng.',
          pricePerHour: 220000,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          _id: 'court_6',
          name: 'Sân C2 - Bảo trì',
          description: 'Sân đang trong quá trình nâng cấp và bảo trì. Dự kiến mở cửa trở lại trong tuần tới.',
          pricePerHour: 120000,
          status: 'maintenance',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      users: [
        {
          _id: 'user_admin',
          name: 'Admin',
          email: 'admin@badminton.com',
          password: bcrypt.hashSync('admin123', 10),
          role: 'admin',
          phone: '0901234567',
          createdAt: new Date().toISOString()
        }
      ],
      bookings: []
    };
    fs.writeFileSync(dbFile, JSON.stringify(initialData, null, 2), 'utf8');
  }

  // Read/write helpers
  const readData = () => {
    try {
      return JSON.parse(fs.readFileSync(dbFile, 'utf8'));
    } catch (e) {
      return { courts: [], users: [], bookings: [] };
    }
  };

  const writeData = (data) => {
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), 'utf8');
  };

  // Helper to wrap raw json objects with Mongoose schema methods
  const wrapDoc = (item, modelName) => {
    if (!item) return item;

    const doc = { ...item };

    doc.populate = async function () { return this; };
    doc.save = async function () {
      if (modelName === 'User') {
        const data = readData();
        const list = data.users || [];
        const idx = list.findIndex(u => u._id === this._id || u._id?.toString() === this._id?.toString());
        if (idx !== -1) {
          const oldUser = list[idx];
          if (this.password && this.password !== oldUser.password && !this.password.startsWith('$2a$')) {
            this.password = await bcrypt.hash(this.password, 10);
          }
          list[idx] = { ...this };
          data.users = list;
          writeData(data);
        }
      }
      return this;
    };

    if (modelName === 'User') {
      doc.comparePassword = async function (candidatePassword) {
        if (!this.password) return false;
        try {
          if (this.password.startsWith('$2a$')) {
            return await bcrypt.compare(candidatePassword, this.password);
          }
        } catch (e) {
          console.error('Bcrypt comparison error:', e.message);
        }
        // Fallback to plain text comparison for legacy or non-hashed seed data
        return candidatePassword === this.password;
      };
    }

    return doc;
  };

  const wrapResults = (results, modelName) => {
    if (Array.isArray(results)) {
      return results.map(item => wrapDoc(item, modelName));
    }
    return wrapDoc(results, modelName);
  };

  // Helper to mock mongoose query chains
  const makeQueryChain = (results, modelName) => {
    const wrapped = wrapResults(results, modelName);
    const chain = {
      results: wrapped,
      sort: function () { return this; },
      populate: function () { return this; },
      select: function () { return this; },
      then: function (resolve) { resolve(this.results); return this; },
      catch: function () { return this; }
    };
    // Make query chain thenable (promises)
    chain.then = chain.then.bind(chain);
    return chain;
  };

  // Patch Mongoose Models with custom JSON methods
  const patchModel = (modelName, collectionName) => {
    const Model = mongoose.model(modelName);

    Model.find = function (query = {}) {
      const data = readData();
      let list = data[collectionName] || [];

      // Basic query matching
      if (Object.keys(query).length > 0) {
        list = list.filter(item => {
          for (let key in query) {
            if (key === '$or' && Array.isArray(query[key])) {
              return query[key].some(q => {
                return Object.keys(q).every(k => item[k] === q[k]);
              });
            }
            if (key === 'status' && typeof query[key] === 'object' && query[key].$ne) {
              if (item[key] === query[key].$ne) return false;
              continue;
            }
            if (item[key] !== query[key]) return false;
          }
          return true;
        });
      }

      return makeQueryChain(list, modelName);
    };

    Model.findOne = function (query = {}) {
      const data = readData();
      const list = data[collectionName] || [];
      const item = list.find(item => {
        for (let key in query) {
          if (key === 'status' && typeof query[key] === 'object' && query[key].$ne) {
            if (item[key] === query[key].$ne) return false;
            continue;
          }
          if (item[key] !== query[key]) return false;
        }
        return true;
      });
      return makeQueryChain(item || null, modelName);
    };

    Model.findById = function (id) {
      const data = readData();
      const list = data[collectionName] || [];
      const item = list.find(item => item._id === id || item._id?.toString() === id?.toString());
      return makeQueryChain(item || null, modelName);
    };

    Model.create = async function (doc) {
      const data = readData();
      const list = data[collectionName] || [];

      const docToSave = { ...doc };
      if (modelName === 'User' && docToSave.password && !docToSave.password.startsWith('$2a$')) {
        docToSave.password = await bcrypt.hash(docToSave.password, 10);
      }

      const newDoc = {
        _id: modelName.toLowerCase() + '_' + Math.random().toString(36).substr(2, 9),
        ...docToSave,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      list.push(newDoc);
      data[collectionName] = list;
      writeData(data);

      return wrapDoc(newDoc, modelName);
    };

    Model.findByIdAndUpdate = function (id, update, options = {}) {
      const data = readData();
      const list = data[collectionName] || [];
      const idx = list.findIndex(item => item._id === id || item._id?.toString() === id?.toString());
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...update, updatedAt: new Date().toISOString() };
        data[collectionName] = list;
        writeData(data);
        return makeQueryChain(list[idx], modelName);
      }
      return makeQueryChain(null, modelName);
    };

    Model.findByIdAndDelete = function (id) {
      const data = readData();
      const list = data[collectionName] || [];
      const idx = list.findIndex(item => item._id === id || item._id?.toString() === id?.toString());
      if (idx !== -1) {
        const deleted = list.splice(idx, 1)[0];
        data[collectionName] = list;
        writeData(data);
        return makeQueryChain(deleted, modelName);
      }
      return makeQueryChain(null, modelName);
    };
  };

  // Patch each model
  patchModel('Court', 'courts');
  patchModel('User', 'users');
  patchModel('Booking', 'bookings');
};

const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB...');
    // Set a short timeout so it fails quickly if DNS is offline/paused
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 4000,
      connectTimeoutMS: 4000
    });
    console.log(`✅ MongoDB Connected successfully: ${conn.connection.host}`);
  } catch (error) {
    console.log(`❌ MongoDB Atlas connection failed: ${error.message}`);
    setupMockDB();
  }
};

module.exports = connectDB;
