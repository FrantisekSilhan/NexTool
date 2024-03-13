const shared = require("../../shared");
const express = require("express");
const router = express.Router();

const { isNotFromShortener } = require(shared.files.middlewares);

const { readFileLines } = require(shared.files.files);

router.path = "/f";

router.get("/:file", isNotFromShortener, async (req, res, next) => {
  const { db } = require(shared.files.database);

  try {
    const fileName = req.params.file;
    const userId = req.session.userId;

    const fileInfo = await new Promise((resolve, reject) => {
      db.get("SELECT downloadName, mimeType, language, owner FROM files WHERE fileName = ?",
        [fileName],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (!fileInfo) {
      const err = new Error("File not found");
      err.status = 404;
      throw err;
    }

    const userInfo = await new Promise((resolve, reject) => {
      db.get("SELECT username FROM users WHERE id = ?",
        [fileInfo.owner],
        (err, row) => err ? reject(err) : resolve(row)
      );
    })

    if (!userInfo) {
      const err = new Error("User not found");
      err.status = 500;
      throw err;
    }

    if (fileInfo.mimeType.startsWith("text") || fileInfo.language !== null) {
      const fileContent = await readFileLines(shared.path.join(shared.paths.files, fileName), 0);
      res.render("file", { fileName, displayName: fileInfo.displayName, downloadName: fileInfo.downloadName, language: fileInfo.language, mimeType: fileInfo.mimeType, fileContent, layout: shared.layouts.file, user: userId, isOwner: fileInfo.owner === userId, owner: userInfo.userName });
      return;
    }

    res.render("file", { fileName, displayName: fileInfo.displayName, downloadName: fileInfo.downloadName, language: undefined, mimeType: fileInfo.mimeType, layout: shared.layouts.file, user: userId, isOwner: fileInfo.owner === userId, owner: userInfo.userName })
  } catch (err) {
    next(err);
  }
});

router.get("/:file/:downloadName", isNotFromShortener, async (req, res, next) => {
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