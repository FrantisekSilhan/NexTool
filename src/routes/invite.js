const shared = require("../../shared");
const express = require("express");
const router = express.Router();
const { isAuthenticated, isNotFromShortener } = require(shared.files.middlewares);

const { generateInviteCode } = require(shared.files.invites);
const {Permission, hasPermission} = require("../permissions");

router.path = "/invite";

router.get("/", isNotFromShortener, isAuthenticated, async (req, res, next) => {
  const { db } = require(shared.files.database);

  let isTransactionActive = false;

  try {
    const userId = req.session.userId;

    const invites = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM invites WHERE createdBy = ? AND usedBy IS NULL",
        [userId],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    res.render("invite", { invites });
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

router.post("/", isNotFromShortener, isAuthenticated, async (req, res, next) => {
  const { db } = require(shared.files.database);

  let isTransactionActive = false;

  try {

    const row = await new Promise((resolve, reject) => {
      db.get("SELECT permissions FROM users WHERE id = ?",
          [req.session.userId],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (!hasPermission(row.permissions, Permission.CreateInvite)) {
      const err = new Error("You don't have permission to create invites");
      err.status = 403;
      throw err;
    }

    const userId = req.session.userId;

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

    next(err);
  }
});

module.exports = router;
