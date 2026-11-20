const multer = require("multer");
const path = require("path");
const fs = require("fs");
const configuredUploadPath =
  process.env.AFMC_IMAGE_UPLOAD_PATH || "/var/www/AFMCMESSTEST";
const uploadPath = path.resolve(configuredUploadPath);
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    let itemName = require("crypto").randomBytes(16).toString("hex");
  // sanitize item name
  itemName = itemName
    .trim()
    .replace(/\s+/g, "_")     // spaces → _
    .replace(/[^\w.-]/g, ""); // remove special chars
  const ext = path.extname(file.originalname); // .jpg, .png
    const finalName = `${itemName}.jpg`;

  cb(null, finalName);
}

});

const fileFilter = (req, file, cb) => {
  const extname = path.extname(file.originalname).toLowerCase() === ".jpg";
  const mimetype = file.mimetype === "image/jpeg";

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error("Only JPG image files are allowed."));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter,
});

const publicBaseUrl =
  process.env.AFMC_IMAGE_PUBLIC_BASE_URL ||
  "https://afmc.globalsparkteksolutions.com/AFMCMESSTEST";

upload.uploadPath = uploadPath;
upload.publicBaseUrl = publicBaseUrl.replace(/\/+$/, "");

upload.validateImageSignature = (req, res, next) => {
  if (!req.file) return next();
  const fd = fs.openSync(req.file.path, "r");
  const header = Buffer.alloc(3);
  fs.readSync(fd, header, 0, 3, 0);
  fs.closeSync(fd);
  if (header[0] !== 0xff || header[1] !== 0xd8 || header[2] !== 0xff) {
    fs.rmSync(req.file.path, { force: true });
    return res.status(400).json({ success: false, message: "Invalid image content" });
  }
  return next();
};

module.exports = upload;

