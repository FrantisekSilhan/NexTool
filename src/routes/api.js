const shared = require("../../shared");
const express = require("express");
const router = express.Router();
const { isAuthenticated, isNotFromShortener } = require(shared.files.middlewares);

const { formatFileSize } = require(shared.files.files);

router.path = "/api";

router.get("/files", isNotFromShortener, isAuthenticated, async (req, res) => {
  try {
    const { db } = require(shared.files.database);

    const userId = req.session.userId;
    const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
    if (isNaN(offset) || offset <= 0) {
      const err = new Error("Invalid offset");
      err.status = 400;
      throw err;
    }
    const isOwner = req.query.isOwner && req.query.isOwner === "true";

    const files = await new Promise((resolve, reject) => {
      if (isOwner) {
        db.all(`SELECT fileName, displayName, fileSize, md5, mimeType FROM files WHERE owner = ? ORDER BY added DESC LIMIT 35 OFFSET ?`,
          [userId, offset],
          (err, rows) => err ? reject(err) : resolve(rows)
        );
      } else {
        db.all(`SELECT fileName, displayName, fileSize, md5, mimeType FROM files WHERE indexFile = 1 ORDER BY added DESC LIMIT 35 OFFSET ?`,
          [offset],
          (err, rows) => err ? reject(err) : resolve(rows)
        );
      }
    });

    const formattedFiles = files.map(file => ({
      ...file,
      fileSize: formatFileSize(file.fileSize)
    }));

    res.json(formattedFiles);
  } catch (err) {
    res.json({ error: err.message }).status(err.status || 500);
  }
});

module.exports = router;