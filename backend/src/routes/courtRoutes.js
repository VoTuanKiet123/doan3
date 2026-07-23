const express = require("express");
const router = express.Router();
<<<<<<< HEAD
const multer = require("multer");
const path = require("path");
const {
  getCourts,
  getCourtById,
  createCourt,
  updateCourt,
  deleteCourt,
} = require("../controllers/courtController");
const { protect, adminOnly } = require("../middleware/auth");

// Cấu hình multer: lưu vào thư mục uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "court-" + uniqueSuffix + ext);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase(),
  );
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error("Chỉ chấp nhận file ảnh (jpg, png, gif, webp)"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

router.get("/", getCourts);
router.get("/:id", getCourtById);
router.post("/", protect, adminOnly, upload.array("images", 10), createCourt);
router.put("/:id", protect, adminOnly, upload.array("images", 10), updateCourt);
router.delete("/:id", protect, adminOnly, deleteCourt);
=======
const { getCourts, getCourtById, createCourt, updateCourt, deleteCourt } = require('../controllers/courtController');
const { getCourtReviews } = require('../controllers/bookingController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', getCourts);
router.get('/:id', getCourtById);
router.get('/:id/reviews', getCourtReviews);
router.post('/', protect, adminOnly, createCourt);
router.put('/:id', protect, adminOnly, updateCourt);
router.delete('/:id', protect, adminOnly, deleteCourt);
>>>>>>> c43715cc4445c1f84dec4c11d364f1bae6a9579e

module.exports = router;
