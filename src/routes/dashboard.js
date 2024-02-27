const shared = require("../../shared");
const express = require("express");
const router = express.Router();
const { isAuthenticated } = require(shared.files.middlewares);

const { formatFileSize } = require(shared.files.files);

router.path = "/dashboard";

router.get("/", isAuthenticated, async (req, res, next) => {
  try {
    const { db } = require(shared.files.database);

    const userId = req.session.userId;
    
    const files = await new Promise((resolve, reject) => {
      db.all("SELECT fileName, displayName, fileSize, md5, mimeType FROM files WHERE owner = ?",
        [userId],
        (err, rows) => err ? reject(err) : resolve(rows)
      );
    });

    const formattedFiles = files.map(file => ({
      ...file,
      fileSize: formatFileSize(file.fileSize)
    }));

    res.render("dashboard", { userName: req.session.username, files: formattedFiles, userId });
  } catch (err) {
    next(err);
  }
});

module.exports = router;