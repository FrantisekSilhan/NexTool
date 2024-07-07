const express = require("express");
const router = express.Router();
const { isAuthenticated, isNotFromShortener } = require(shared.files.middlewares);

const { generateInviteCode } = require(shared.files.invites);
const {Permission, hasPermission} = require(shared.files.permissions);

router.path = "/invite";

router.get("/", isNotFromShortener, isAuthenticated, async (req, res, next) => {
  const { db } = require(shared.files.database);

  const errorMessage = req.session.errorMessage;
  delete req.session.errorMessage;

  try {
    const userId = req.session.userId;

    const invites = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM invites WHERE createdBy = ? AND usedBy IS NULL",
        [userId],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    res.render("invite", { invites, errorMessage });
  } catch (err) {
    next(err);
  }
});

router.post("/", isNotFromShortener, isAuthenticated, async (req, res, next) => {
  const { db } = require(shared.files.database);

  let redirectBack = false;
  let isTransactionActive = false;

  try {
    const userId = req.session.userId;

    const row = await new Promise((resolve, reject) => {
      db.get("SELECT permissions FROM users WHERE id = ?",
          [userId],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (!hasPermission(row.permissions, Permission.CreateInvite)) {
      const err = new Error("You don't have permission to create invites");
      err.status = 403;
      redirectBack = true;
      throw err;
    }

    const invites = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM invites WHERE createdBy = ? AND usedBy IS NULL",
        [userId],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (invites.length >= shared.config.invites.maxPerUser) {
      const err = new Error("You have reached the maximum number of unused invites you can create");
      err.status = 403;
      redirectBack = true;
      throw err;
    }

    await new Promise((resolve, reject) => {
      db.run("BEGIN TRANSACTION",
        (err) => err ? reject(err) : resolve(isTransactionActive = true)
      );
    });

    await new Promise((resolve, reject) => {
      db.run("INSERT INTO invites (createdBy, invite) VALUES (?, ?)",
        [userId, generateInviteCode(userId)],
        (err) => err ? reject(err) : resolve()
      );
    });

    await new Promise((resolve, reject) => {
      db.run("COMMIT",
        (err) => err ? reject(err) : resolve(isTransactionActive = false)
      );
    });

    res.redirect("/invite");

  } catch (err) {
    if (isTransactionActive) {
      await new Promise((resolve, _) => {
        db.run("ROLLBACK",
          (rollbackErr) => rollbackErr ? console.error(rollbackErr) : resolve(err)
        );
      });
    }

    if (redirectBack) {
      req.session.errorMessage = err.message;
      return res.redirect("/invite");
    }

    next(err);
  }
});

module.exports = router;
