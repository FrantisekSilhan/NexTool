const express = require("express");
const router = express.Router();
const { isAuthenticated, isNotFromShortener } = require(shared.files.middlewares);

const { isValidUrl, isValidShortCode, generateRandomKey } = require(shared.files.shortener);

router.path = "/shortener";

router.get("/", isNotFromShortener, isAuthenticated, async (req, res) => {
  const errorMessage = req.session.errorMessage;
  const formData = req.session.formData ?? {};
  const shortenedUrl = req.session.shortenedUrl;
  delete req.session.errorMessage;
  delete req.session.formData;
  delete req.session.shortenedUrl;

  res.render("shortener", { errorMessage, formData, urlLen: shared.config.shortener.maximumUrlLen, customUrlLen: shared.config.shortener.maximumCustomUrlLen, shortenedUrl });
});

router.post("/", isNotFromShortener, isAuthenticated, async (req, res, next) => {
  const { db } = require(shared.files.database);

  let isTransactionActive = false;
  let redirectBack = false;

  try {
    req.session.formData = { url: req.body.url, useCustomUrl: req.body.useCustomUrl, customUrl: req.body.customUrl, useVisits: req.body.useVisits, visits: req.body.visits };

    const url = req.body.url;
    const useCustomUrl = req.body.useCustomUrl !== undefined && req.body.useCustomUrl === "on";
    const customUrl = useCustomUrl ? req.body.customUrl.replace("/", "") : null;
    const useVisits = req.body.useVisits !== undefined && req.body.useVisits === "on";
    const visits = parseInt(req.body.visits);

    if (useCustomUrl) {
      if (isValidShortCode(customUrl)) {
        const exists = await new Promise((resolve, reject) => {
          db.get("SELECT * FROM urls WHERE key = ?",
            [customUrl],
            (err, row) => err ? reject(err) : resolve(row)
          );
        });

        if (exists) {
          const err = new Error("Custom URL already exists");
          err.status = 400;
          redirectBack = true;
          throw err;
        }
      } else {
        const err = new Error("Invalid custom URL");
        err.status = 400;
        redirectBack = true;
        throw err;
      }
    }

    if (useVisits && (isNaN(visits) || visits < 1)) {
      const err = new Error("Invalid number of visits");
      err.status = 400;
      redirectBack = true;
      throw err;
    }

    if (url.length > shared.config.shortener.maximumUrlLen) {
      const err = new Error("URL too long");
      err.status = 400;
      redirectBack = true;
      throw err;
    }

    if (!isValidUrl(url)) {
      const err = new Error("Invalid URL");
      err.status = 400;
      redirectBack = true;
      throw err;
    }

    await new Promise(async (resolve, reject) => {
      db.run("BEGIN TRANSACTION",
        (err) => err ? reject(err) : resolve(isTransactionActive = true)
      );
    });

    const key = useCustomUrl ? customUrl : await generateRandomKey();

    const keyId = await new Promise((resolve, reject) => {
      db.run("INSERT INTO urls (key, url) VALUES (?, ?)",
        [key, url],
        function (err) {
          err ? reject(err) : resolve(this.lastID)
        }  
      );
    });

    await new Promise((resolve, reject) => {
      db.run("INSERT INTO urlStats (id, maxVisitCount, owner) VALUES (?, ?, ?)",
        [keyId, useVisits ? visits : null, req.session.userId],
        (err) => err ? reject(err) : resolve()
      );
    });

    await new Promise(async (resolve, reject) => {
      db.run("COMMIT",
        (err) => err ? reject(err) : resolve(isTransactionActive = true)
      );
    });

    req.session.shortenedUrl = shared.config.shortener.baseUrl + key;
    delete req.session.formData;

    res.redirect("/shortener");

  } catch (err) {
    if (redirectBack) {
      req.session.errorMessage = err.message;
      return res.redirect("/shortener");
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