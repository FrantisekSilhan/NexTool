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
      db.all("SELECT fileName, displayName, fileSize, md5, mimeType FROM files WHERE owner = ? ORDER BY id DESC LIMIT 35",
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

router.get("/api/files", isAuthenticated, async (req, res, next) => {
  try {
    const { db } = require(shared.files.database);

    const userId = req.session.userId;
    const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
    if (isNaN(offset) || offset <= 0) {
      const err = new Error("Invalid offset");
      err.status = 400;
      throw err;
    }

    const files = await new Promise((resolve, reject) => {
      db.all(`SELECT fileName, displayName, fileSize, md5, mimeType FROM files WHERE owner = ? ORDER BY added DESC LIMIT 35 OFFSET ${offset}`,
        [userId],
        (err, rows) => err ? reject(err) : resolve(rows)
      );
    });

    const formattedFiles = files.map(file => ({
      ...file,
      fileSize: formatFileSize(file.fileSize)
    }));

    res.json(formattedFiles);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
