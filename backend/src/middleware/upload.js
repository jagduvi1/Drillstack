const multer = require("multer");
const path = require("path");

const uploadDir = path.join(__dirname, "..", "..", "uploads");

const ALLOWED_MIMES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/gif": [".gif"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${unique}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowedExts = ALLOWED_MIMES[file.mimetype];
  if (!allowedExts) {
    return cb(new Error("File type not allowed"), false);
  }
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExts.includes(ext)) {
    return cb(new Error("File extension does not match MIME type"), false);
  }
  cb(null, true);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

// Strip EXIF metadata from uploaded images (GDPR: removes GPS, device info)
async function stripExif(req, _res, next) {
  if (!req.file) return next();
  const imageMimes = ["image/jpeg", "image/png", "image/webp"];
  if (!imageMimes.includes(req.file.mimetype)) return next();
  try {
    const sharp = require("sharp");
    const filePath = path.join(uploadDir, req.file.filename);
    const buffer = await sharp(filePath).rotate().toBuffer();
    const fs = require("fs");
    await fs.promises.writeFile(filePath, buffer);
  } catch {
    // If stripping fails, continue — file is still usable
  }
  next();
}

module.exports = upload;
module.exports.stripExif = stripExif;
