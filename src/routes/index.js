const shared = require("../../shared");
const express = require("express");
const router = express.Router();
const { isAuthenticated } = require(shared.files.middlewares);

const { formatFileSize } = require(shared.files.files);

router.path = "/";

router.get("/", isAuthenticated, async (_, res, next) => {
  try {
    const { db } = require(shared.files.database);

    const files = await new Promise((resolve, reject) => {
      db.all("SELECT fileName, displayName, fileSize, md5, mimeType FROM files WHERE indexFile = 1 ORDER BY added DESC",
        (err, rows) => err ? reject(err) : resolve(rows)
      );
    });

    const formattedFiles = files.map(file => ({
      ...file,
      fileSize: formatFileSize(file.fileSize)
    }));

    res.render("index", { files: formattedFiles });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
