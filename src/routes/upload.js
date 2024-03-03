const shared = require("../../shared");
const express = require("express");
const router = express.Router();
const { isAuthenticated, isNotFromShortener } = require(shared.files.middlewares);
const crypto = require("crypto");

const { generateRandomFileName } = require(shared.files.files);
const sharp = require("sharp");
const ffmpeg = require("fluent-ffmpeg");
const {hasPermission, Permission} = require("../permissions");

router.path = "/upload";

router.get("/", isNotFromShortener, isAuthenticated, (req, res) => {
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

router.post("/", isNotFromShortener, isAuthenticated, async (req, res, next) => {
  const { db } = require(shared.files.database);

  let isTransactionActive = false;
  let redirectBack = false;

  try {

    const row = await new Promise((resolve, reject) => {
      db.get("SELECT permissions FROM users WHERE id = ?",
        [req.session.userId],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (!hasPermission(row.permissions, Permission.Upload)) {
      const err = new Error("You don't have permission to upload files");
      err.status = 403;
      redirectBack = true;
      throw err;
    }

    req.session.formData = { downloadName: req.body.downloadName, displayName: req.body.displayName };

    if (!req.files || !req.files.file) {
      const err = new Error("No file uploaded");
      err.status = 400;
      redirectBack = true;
      throw err;
    }

    let file = req.files.file;

    if (file.size > shared.config.upload.maximumFileSize) {
      const err = new Error("File too large");
      err.status = 400;
      redirectBack = true;
      throw err;
    }

    const fileName = await generateRandomFileName();
    let downloadName = req.body.downloadName.replace(/\s/g, "").length > 0 ? req.body.downloadName : fileName;
    const displayName = req.body.displayName.replace(/\s/g, "").length > 0 ? req.body.displayName : downloadName;
    const index = req.body.index !== undefined && req.body.index === "on";
    const gif = req.body.gif !== undefined && req.body.gif === "on";
    const language = req.body.language !== undefined && req.body.language === "none" ? null : req.body.language;

    if (index && !hasPermission(row.permissions, Permission.IncludeIndex)) {
      const err = new Error("You don't have permission to include files in the index");
      err.status = 403;
      redirectBack = true;
      throw err;
    }

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

    await new Promise(async (resolve, reject) => {
      if (gif && file.mimetype.startsWith("video/")) {
        if (!hasPermission(row.permissions, Permission.ConvertGIFVideo)) {
          const err = new Error("You don't have permission to convert videos to GIFs");
          err.status = 402;
          redirectBack = true;
          reject(err);
          return;
        }

        if (file.size > shared.config.upload.maximumVideoConvertSize) {
          const err = new Error("File too large");
          err.status = 400;
          redirectBack = true;
          reject(err);
          return;
        }

        const name = shared.path.join(shared.paths.files, fileName + ".orig");
        shared.fs.writeFileSync(name, file.data);

        await ffmpeg.ffprobe(name, (err, metadata) => {
          if (err) {
            shared.fs.unlinkSync(name);
            console.error(err);
            err = new Error("Invalid video file");
            err.status = 400;
            redirectBack = true;
            reject(err);
          } else {
            if (metadata.format.duration > shared.config.upload.maximumVideoConvertTime) {
              shared.fs.unlinkSync(name);
              err = new Error("Video too long");
              err.status = 400;
              redirectBack = true;
              reject(err);
              return;
            }
            let widthLongerSide = metadata.streams[0].width > metadata.streams[0].height;

            ffmpeg(name)
              .videoFilters([`scale=${widthLongerSide ? "560:-1" : "-1:560"}:flags=lanczos`, "split[s0][s1];[s0]palettegen=max_colors=256[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5"])
              .outputOptions(["-f", "gif"])
              .on("end", () => {
                file = {
                  data: shared.fs.readFileSync(shared.path.join(shared.paths.files, fileName)),
                  size: shared.fs.statSync(shared.path.join(shared.paths.files, fileName)).size,
                  mimetype: "image/gif"
                };
                downloadName = downloadName.split(".")[0] + ".gif";
                shared.fs.unlinkSync(name);
                if (file.size > shared.config.upload.maximumFileSize) {
                  shared.fs.unlinkSync(shared.path.join(shared.paths.files, fileName));
                  const err = new Error("File too large");
                  err.status = 400;
                  redirectBack = true;
                  reject(err);
                } else {
                  resolve();
                }
              })
              .on("error", (err) => {
                console.error(err);
                reject(err);
              })
              .save(shared.path.join(shared.paths.files, fileName));
          }
        });
      } else if (gif && file.mimetype.startsWith("image/")) {
        if (!hasPermission(row.permissions, Permission.ConvertGIFImage)) {
          const err = new Error("You don't have permission to convert images to GIFs");
          err.status = 403;
          redirectBack = true;
          reject(err);
          return;
        }

        await sharp(file.data)
          .resize( 560, 560, {fit: "inside"})
          .gif({colors: 256, dither: 1.0})
          .toBuffer((err, buffer, info) => {
            if (err) {
              console.error(err);
              reject(err);
            }

            file = {
              data: buffer,
              size: buffer.length,
              mimetype: "image/gif"
            };
            downloadName = downloadName.split(".")[0] + ".gif";

            if (file.size > shared.config.upload.maximumFileSize) {
              const err = new Error("File too large");
              err.status = 400;
              redirectBack = true;
              reject(err);
            } else {
              shared.fs.writeFileSync(shared.path.join(shared.paths.files, fileName), buffer);
              resolve();
            }
        });
      } else if (gif) {
        const err = new Error("File is not an image or a video");
        err.status = 400;
        redirectBack = true;
        reject(err);
      } else if (hasPermission(row.permissions, Permission.NoCompression)) {
        await file.mv(shared.path.join(shared.paths.files, fileName),
          (err) => err ? reject(err) : resolve()
        );
      } else if (file.mimetype.startsWith("image/")) {
        sharp(file.data)
          .webp()
          .toBuffer((err, buffer, info) => {
            if (err || buffer.length > file.size) {
              // console.error(err);
              file.mv(shared.path.join(shared.paths.files, fileName),
                  (err) => err ? reject(err) : resolve()
              );
              resolve();
            } else {
              file = {
                data: buffer,
                size: buffer.length,
                mimetype: "image/webp"
              };
              downloadName = downloadName.split(".")[0] + ".webp";
              shared.fs.writeFileSync(shared.path.join(shared.paths.files, fileName), buffer);
              resolve();
            }
          })
      } else {
        await file.mv(shared.path.join(shared.paths.files, fileName),
          (err) => err ? reject(err) : resolve()
        );
      }
    });

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
