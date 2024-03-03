const shared = require("../../shared");
const express = require("express");
const router = express.Router();
const { isAuthenticated, isNotFromShortener } = require(shared.files.middlewares);

const { formatFileSize } = require(shared.files.files);

router.path = "/dashboard";

router.get("/", isNotFromShortener, isAuthenticated, async (req, res, next) => {
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

    const urls = await new Promise((resolve, reject) => {
      db.all("SELECT u.id, u.key, u.url, s.visitCount, s.maxVisitCount FROM urls AS u LEFT JOIN urlStats AS s ON u.id = s.id WHERE owner = ? ORDER BY u.id DESC LIMIT 35",
        [userId],
        (err, rows) => err ? reject(err) : resolve(rows)
      );
    });

    res.render("dashboard", { userName: req.session.username, files: formattedFiles, urls, shortenerBaseUrl: shared.config.shortener.baseUrl, userId });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
