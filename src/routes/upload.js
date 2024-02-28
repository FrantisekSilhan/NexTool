const shared = require("../../shared");
const express = require("express");
const router = express.Router();
const { isAuthenticated } = require(shared.files.middlewares);
const crypto = require("crypto");

const { generateRandomFileName } = require(shared.files.files);

router.path = "/upload";

router.get("/", isAuthenticated, (req, res) => {
  const formData = req.session.formData ?? {};
  const errorMessage = req.session.errorMessage;
  delete req.session.formData;
  delete req.session.errorMessage;

  res.render("upload", {
    DownloadLen: shared.config.upload.downloadLen,
    DisplayLen: shared.config.upload.displayLen,
    formData,
    errorMessage
  });
});

router.post("/", isAuthenticated, async (req, res, next) => {
  const { db } = require(shared.files.database);

  let isTransactionActive = false;
  let redirectBack = false;

  try {
    req.session.formData = { downloadName: req.body.downloadName, displayName: req.body.displayName };

    if (!req.files || !req.files.file) {
      const err = new Error("No file uploaded");
      err.status = 400;
      redirectBack = true;
      throw err;
    }

    const file = req.files.file;

    if (file.size > shared.config.upload.maximumFileSize) {
      const err = new Error("File too large");
      err.status = 400;
      redirectBack = true;
      throw err;
    }

    const fileName = await generateRandomFileName(require(shared.files.database).db);
    const downloadName = req.body.downloadName.replace(/\s/g, "").length > 0 ? req.body.downloadName : fileName;
    const displayName = req.body.displayName.replace(/\s/g, "").length > 0 ? req.body.displayName : downloadName;
    const index = req.body.index !== undefined && req.body.index === "on";
    const language = req.body.language !== undefined && req.body.language === "none" ? null : req.body.language;

    if (downloadName.length > shared.config.upload.downloadLen) {
      const err = new Error("Download name too long");
      err.status = 400;
      redirectBack = true;
      throw err;
    }
    if (displayName.length > shared.config.upload.displayLen) {
      const err = new Error("Display name too long");
      err.status = 400;
      redirectBack = true;
      throw err;
    }

    await new Promise((resolve, reject) => {
      db.run("BEGIN TRANSACTION",
        (err) => err ? reject(err) : resolve(isTransactionActive = true)
      );
    });

    await new Promise((resolve, reject) => {
      db.run("INSERT INTO files (fileName, displayName, downloadName, indexFile, fileSize, md5, mimeType, language, owner) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [fileName, displayName, downloadName, index, file.size, crypto.createHash("md5").update(file.data).digest("hex"), file.mimetype, language, req.session.userId],
        (err) => err ? reject(err) : resolve()
      );
    });

    await new Promise((resolve, reject) => {
      file.mv(shared.path.join(shared.paths.files, fileName),
        (err) => err ? reject(err) : resolve()
      );
    });

    await new Promise((resolve, reject) => {
      db.run("COMMIT",
        (err) => err ? reject(err) : resolve(isTransactionActive = false)
      );
    });

    delete req.session.formData;
    if (index) {
      res.redirect("/");
    } else {
      res.redirect("/dashboard");
    }
  } catch (err) {
    if (redirectBack) {
      req.session.errorMessage = err.message;
      return res.redirect("/upload");
    }

    delete req.session.formData;

    if (isTransactionActive) {
      await new Promise((resolve, _) => {
        db.run("ROLLBACK",
          (rollbackErr) => rollbackErr ? console.error(rollbackErr) : resolve(err)
        );
      });
    }

    next(err);
  }
});

module.exports = router;