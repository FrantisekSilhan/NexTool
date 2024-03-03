const shared = require("../../shared");
const express = require("express");
const router = express.Router();
const { isAuthenticatedShortener, isFromShortener, isNotFromShortener } = require(shared.files.middlewares);

const { formatFileSize } = require(shared.files.files);

router.path = "/";

router.get("/", isAuthenticatedShortener, async (req, res, next) => {
  try {
    if (req.headers.host === shared.config.shortener.host) {
      const err = new Error("Not found");
      err.status = 404;
      next(err);
    } else {
      const { db } = require(shared.files.database);
  
      const files = await new Promise((resolve, reject) => {
        db.all("SELECT fileName, displayName, fileSize, md5, mimeType FROM files WHERE indexFile = 1 ORDER BY id DESC LIMIT 35",
          (err, rows) => err ? reject(err) : resolve(rows)
        );
      });
  
      const formattedFiles = files.map(file => ({
        ...file,
        fileSize: formatFileSize(file.fileSize)
      }));
  
      res.render("index", { files: formattedFiles });
    }
  } catch (err) {
    next(err);
  }
});

router.get("/:key", isAuthenticatedShortener, isFromShortener, async (req, res, next) => {
  const { db } = require(shared.files.database);

  let isTransactionActive = false;

  try {
    const key = req.params.key;

    const url = await new Promise((resolve, reject) => {
      db.get("SELECT id, url FROM urls WHERE key = ?",
        [key],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (!url) {
      const err = new Error("Not found");
      err.status = 404;
      throw err;
    }

    // TODO: if discord user agent show embed preview and return

    await new Promise((resolve, reject) => {
      db.run("BEGIN TRANSACTION",
          (err) => err ? reject(err) : resolve(isTransactionActive = true)
      );
    });

    await new Promise((resolve, reject) => {
      db.run("UPDATE urlStats SET timestamp = CURRENT_TIMESTAMP, visitCount = visitCount + 1 WHERE id = ?",
        [url.id],
        (err) => err ? reject(err) : resolve()
      );
    });

    const stats = await new Promise((resolve, reject) => {
      db.get("SELECT maxVisitCount, visitCount FROM urlStats WHERE id = ?",
        [url.id],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (!stats) {
      const err = new Error("Stats not found");
      err.status = 500;
      throw err;
    }

    if (stats.maxVisitCount !== null && stats.visitCount >= stats.maxVisitCount) {
      await new Promise((resolve, reject) => {
        db.run("DELETE FROM urls WHERE id = ?",
          [url.id],
          (err) => err ? reject(err) : resolve()
        );
      });

      await new Promise((resolve, reject) => {
        db.run("DELETE FROM urlStats WHERE id = ?",
          [url.id],
          (err) => err ? reject(err) : resolve()
        );
      });
    }

    await new Promise((resolve, reject) => {
      db.run("COMMIT",
        (err) => err ? reject(err) : resolve(isTransactionActive = false)
      );
    });

    res.redirect(url.url);
  } catch (err) {
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

router.get("/robots.txt", isNotFromShortener, (_, res) => {
  res.type("text/plain");
  res.send("User-agent: *\nDisallow: /\nAllow: /login");
});

module.exports = router;
