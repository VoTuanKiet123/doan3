const Court = require("../models/Court");

const SERVICES_A = [
  'Thảm Taraflex cao cấp thi đấu',
  'Đèn LED 800-1000 Lux chống lóa',
  'Điều hòa / Quạt mát công suất lớn',
  'Nước uống đóng chai miễn phí (2 chai)',
  'Wifi tốc độ cao miễn phí',
  'Dịch vụ lau thảm & Tủ đồ khóa từ'
];

const SERVICES_B = [
  'Thảm cao su tiêu chuẩn BWF',
  'Đèn LED 600 Lux chống lóa',
  'Quạt mát công suất lớn & Ghế chờ',
  'Wifi miễn phí',
  'Nước giải khát bán kèm'
];

const SERVICES_C = [
  'Sàn acrylic / thảm cao su cơ bản',
  'Hệ thống đèn chiếu sáng tiêu chuẩn',
  'Quạt xoay & Ghế ngồi nghỉ',
  'Cây nước uống miễn phí tự phục vụ'
];

// @desc    Lấy tất cả sân
// @route   GET /api/courts
const getCourts = async (req, res) => {
  try {
    let courts = await Court.find().sort({ createdAt: 1 });
    
    // Auto-normalize courts to ensure A1/A2 are Sân A (70k), B1/B2 are Sân B (50k), C1/C2 are Sân C (30k)
    for (let c of courts) {
      const nameUpper = c.name.toUpperCase();
      let targetType = c.type;
      let targetPrice = c.pricePerHour;
      let targetServices = c.services;

      if (nameUpper.includes('A1') || nameUpper.includes('A2') || nameUpper.includes('SÂN A') || nameUpper.includes('SAN A')) {
        targetType = 'A';
        targetPrice = 70000;
        targetServices = SERVICES_A;
      } else if (nameUpper.includes('B1') || nameUpper.includes('B2') || nameUpper.includes('SÂN B') || nameUpper.includes('SAN B')) {
        targetType = 'B';
        targetPrice = 50000;
        targetServices = SERVICES_B;
      } else if (nameUpper.includes('C1') || nameUpper.includes('C2') || nameUpper.includes('SÂN C') || nameUpper.includes('SAN C')) {
        targetType = 'C';
        targetPrice = 30000;
        targetServices = SERVICES_C;
      }

      let cleanName = c.name.replace(/\(Bảo trì\)/gi, '').trim();
      let targetStatus = c.status === 'maintenance' ? 'active' : c.status;

      if (c.type !== targetType || c.pricePerHour !== targetPrice || !c.services || c.services.length === 0 || c.status === 'maintenance' || c.name !== cleanName) {
        c.type = targetType;
        c.pricePerHour = targetPrice;
        c.services = targetServices;
        c.status = targetStatus;
        c.name = cleanName;
        await c.save();
      }
    }

    res.json({ success: true, count: courts.length, courts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Lấy chi tiết một sân
// @route   GET /api/courts/:id
const getCourtById = async (req, res) => {
  try {
    const court = await Court.findById(req.params.id);
    if (!court) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy sân" });
    }
    res.json({ success: true, court });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Thêm sân mới (admin)
// @route   POST /api/courts
const createCourt = async (req, res) => {
  try {
    const { name, description, pricePerHour, status, imageUrls } = req.body;

    // Gom ảnh: từ file upload + từ URL nhập tay
    const images = [];

    // Ảnh từ file upload (multer)
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        images.push("/uploads/" + file.filename);
      });
    }

    // Ảnh từ URL (người dùng paste)
    if (imageUrls) {
      const urls =
        typeof imageUrls === "string"
          ? imageUrls
              .split(",")
              .map((u) => u.trim())
              .filter(Boolean)
          : imageUrls;
      urls.forEach((url) => images.push(url));
    }

    const court = await Court.create({
      name,
      description,
      pricePerHour,
      status,
      images,
    });

    res
      .status(201)
      .json({ success: true, message: "Thêm sân thành công", court });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Cập nhật sân (admin)
// @route   PUT /api/courts/:id
const updateCourt = async (req, res) => {
  try {
    const { name, description, pricePerHour, status, imageUrls, keepImages } =
      req.body;

    // Parse keepImages (JSON string từ FormData)
    let existingImages = [];
    if (keepImages) {
      try {
        existingImages =
          typeof keepImages === "string" ? JSON.parse(keepImages) : keepImages;
      } catch {
        existingImages = [];
      }
    }

    // Ảnh mới từ file upload
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        existingImages.push("/uploads/" + file.filename);
      });
    }

    // Ảnh từ URL
    if (imageUrls) {
      const urls =
        typeof imageUrls === "string"
          ? imageUrls
              .split(",")
              .map((u) => u.trim())
              .filter(Boolean)
          : imageUrls;
      urls.forEach((url) => existingImages.push(url));
    }

    const updateData = {
      name,
      description,
      pricePerHour,
      status,
      images: existingImages,
    };

    const court = await Court.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });
    if (!court) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy sân" });
    }
    res.json({ success: true, message: "Cập nhật sân thành công", court });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Xóa sân (admin)
// @route   DELETE /api/courts/:id
const deleteCourt = async (req, res) => {
  try {
    const court = await Court.findByIdAndDelete(req.params.id);
    if (!court) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy sân" });
    }
    res.json({ success: true, message: "Xóa sân thành công" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getCourts,
  getCourtById,
  createCourt,
  updateCourt,
  deleteCourt,
};
