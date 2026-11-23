const path = require("path");
const fs = require("fs");
const multer = require("multer");

const eventUploadsDir = path.join(__dirname, "../../uploads/events");
if (!fs.existsSync(eventUploadsDir)) {
  fs.mkdirSync(eventUploadsDir, { recursive: true });
}

const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, eventUploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)
      ? ext
      : ".jpg";
    cb(null, `poster-${Date.now()}-${Math.round(Math.random() * 1e6)}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // tối đa 5MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMES.has(file.mimetype)) cb(null, true);
    else cb(new Error("Chỉ chấp nhận ảnh định dạng JPG, PNG, WEBP hoặc GIF"));
  },
});

const uploadEventPoster = (req, res, next) => {
  upload.single("poster")(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ success: false, message: "Ảnh bìa vượt quá dung lượng tối đa 5MB" });
    }
    return res
      .status(400)
      .json({ success: false, message: err.message || "Lỗi tải ảnh bìa" });
  });
};

module.exports = uploadEventPoster;