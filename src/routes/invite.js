const shared = require("../../shared");
const express = require("express");
const router = express.Router();
const { isAuthenticated } = require(shared.files.middlewares);

const { generateInviteCode } = require(shared.files.invites);

router.path = "/invite";

router.get("/", isAuthenticated, async (req, res) => {
  res.render("invite", { csrfToken: req.csrfToken() });
});

router.post("/", isAuthenticated, async (_, res, next) => {
  const { db } = require(shared.files.database);

  let isTransactionActive = false;

  try {
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