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

    files.forEach(file => {
      file.fileSize = formatFileSize(file.fileSize);
    });

    const urls = await new Promise((resolve, reject) => {
      db.all("SELECT u.id, u.key, u.url, s.visitCount, s.maxVisitCount FROM urls AS u LEFT JOIN urlStats AS s ON u.id = s.id WHERE owner = ? ORDER BY u.id DESC LIMIT 35",
        [userId],
        (err, rows) => err ? reject(err) : resolve(rows)
      );
    });

    const invites = await new Promise((resolve, reject) => {
      db.all(`
        SELECT i.id, i.invite, i.usedBy, u.username AS usedByUserName
        FROM invites as i
        LEFT JOIN users u ON i.usedBy = u.id
        WHERE createdBy = ?
      `,
        [userId],
        (err, rows) => err ? reject(err) : resolve(rows)
      );
    });

    res.render("dashboard", { userName: req.session.username, files, urls, shortenerBaseUrl: shared.config.shortener.baseUrl, userId, invites });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
