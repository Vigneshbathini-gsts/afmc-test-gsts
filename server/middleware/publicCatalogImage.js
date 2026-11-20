const path = require("path");
const db = require("../config/db");
const upload = require("../utils/uploadMiddleware");

module.exports = async function publicCatalogImage(req, res) {
  const filename = req.params.filename;
  if (
    typeof filename !== "string" ||
    !/^[\w.-]+\.jpg$/i.test(filename) ||
    filename.includes("..") ||
    path.basename(filename) !== filename
  ) {
    return res.sendStatus(404);
  }

  try {
    const [rows] = await db.execute(
      `SELECT 1
       FROM xxafmc_inventory
       WHERE FILE_NAME = ?
         AND MIME_TYPE = 'image/jpeg'
       LIMIT 1`,
      [filename]
    );

    if (!rows.length) {
      return res.sendStatus(404);
    }

    res.set("Content-Type", "image/jpeg");
    res.set("X-Content-Type-Options", "nosniff");
    return res.sendFile(filename, { root: upload.uploadPath }, (error) => {
      if (error && !res.headersSent) {
        res.sendStatus(error.statusCode === 404 ? 404 : 500);
      }
    });
  } catch {
    return res.status(503).json({
      success: false,
      message: "Image service is temporarily unavailable.",
    });
  }
};
