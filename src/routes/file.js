const shared = require("../../shared");
const express = require("express");
const router = express.Router();

router.path = "/f";

router.get("/:file", async (req, res, next) => {
  const { db } = require(shared.files.database);

  try {
    const fileName = req.params.file;

    const fileInfo = await new Promise((resolve, reject) => {
      db.get("SELECT downloadName, mimeType FROM files WHERE fileName = ?",
        [fileName],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (!fileInfo) {
      const err = new Error("File not found");
      err.status = 404;
      throw err;
    }

    if (fileInfo.mimeType.startsWith("text")) {
      const fileContent = await filesModule.readFileLines(shared.path.join(shared.paths.files, fileName), 10, "... (More content available)");
      res.render("file", { fileName, downloadName: fileInfo.downloadName, mimeType: fileInfo.mimeType, fileContent });
      return;
    }

    res.render("file", { fileName, downloadName: fileInfo.downloadName, mimeType: fileInfo.mimeType })
  } catch (err) {
    next(err);
  }
});

router.get("/:file/:downloadName", async (req, res, next) => {
  const { db } = require(shared.files.database);

  try {
    const fileName = req.params.file;
    const downloadName = req.params.downloadName;

    const fileInfo = await new Promise((resolve, reject) => {
      db.get("SELECT downloadName FROM files WHERE fileName = ? AND downloadName = ?",
        [fileName, downloadName],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (!fileInfo) {
      const err = new Error("File not found");
      err.status = 404;
      throw err;
    }

    res.download(shared.path.join(shared.paths.files, fileName), downloadName);
  } catch (err) {
    next(err);
  }
});

module.exports = router;