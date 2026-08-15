const multer = require("multer");

const allowedMimeTypes = new Set(["image/jpeg", "image/jpg", "image/png"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new Error("Only JPG, JPEG, or PNG files are allowed"));
      return;
    }

    callback(null, true);
  },
});

module.exports = upload;
