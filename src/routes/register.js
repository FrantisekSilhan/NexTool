const shared = require("../../shared");
const express = require("express");
const router = express.Router();
const { isNotAuthenticated } = require(shared.files.middlewares);
const crypto = require("crypto");

router.path = "/register";

router.get("/", isNotAuthenticated, async (req, res) => {
  const formData = req.session.formData ?? {};
  const errorMessage = req.session.errorMessage;
  delete req.session.formData;
  delete req.session.errorMessage;

  res.render("register", { UserNameLen: shared.config.user.userNameLen, PasswordLen: shared.config.user.passwordLen, InviteCodeLen: shared.config.user.inviteCodeLen, formData, errorMessage });
});

router.post("/", isNotAuthenticated, async (req, res, next) => {
  const { db } = require(shared.files.database);

  let isTransactionActive = false;
  let redirectBack = false;

  try {
    const { userName, password, inviteCode } = req.body;
    req.session.formData = { userName, inviteCode };

    if (userName.length > shared.config.user.userNameLen) {
      const err = new Error("Username too long");
      err.status = 400;
      redirectBack = true;
      throw err;
    }
    if (password.length > shared.config.user.passwordLen) {
      const err = new Error("Password too long");
      err.status = 400;
      redirectBack = true;
      throw err;
    }
    if (inviteCode.length != shared.config.user.inviteCodeLen) {
      const err = new Error("Invite code must be 32 characters long");
      err.status = 400;
      redirectBack = true;
      throw err;
    }

    if (userName.length === 0 || password.length === 0 || inviteCode.length === 0) {
      const err = new Error("Username, password, or invite code is empty");
      err.status = 400;
      redirectBack = true;
      throw err;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(userName)) {
      const err = new Error("Username must be alphanumeric or underscore only");
      err.status = 400;
      redirectBack = true;
      throw err;
    }
    
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()-_+=]).{8,}$/g
    if (!regex.test(password)) {
      const err = new Error(`Password must pass this regex: ${regex}`);
      err.status = 400;
      redirectBack = true;
      throw err;
    }

    const user = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM users WHERE LOWER(userName) = ?",
        [userName.toLowerCase()],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (user) {
      const err = new Error("Username already taken");
      err.status = 400;
      redirectBack = true;
      throw err;
    }

    const invite = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM invites WHERE invite = ? AND usedBy IS NULL",
        [inviteCode],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (!invite) {
      const err = new Error("Invite code is invalid or already used");
      err.status = 400;
      redirectBack = true;
      throw err;
    }

    await new Promise((resolve, reject) => {
      db.run("BEGIN TRANSACTION",
        (err) => err ? reject(err) : resolve(isTransactionActive = true)
      );
    });

    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
    
    const userId = await new Promise((resolve, reject) => {
      db.run("INSERT INTO users (userName, password, salt) VALUES (?, ?, ?)",
        [userName, passwordHash, salt],
        function(err) {
          err ? reject(err) : resolve(this.lastID);
        }
      );
    });

    await new Promise((resolve, reject) => {
      db.run("UPDATE invites SET usedBy = ? WHERE invite = ?",
        [userId, inviteCode],
        (err) => err ? reject(err) : resolve()
      );
    });
    
    await new Promise((resolve, reject) => {
      db.run("COMMIT",
        (err) => err ? reject(err) : resolve(isTransactionActive = false)
      );
    });

    delete req.session.formData;
    res.redirect("/login");

  } catch (err) {
    if (redirectBack) {
      req.session.errorMessage = err.message;
      return res.redirect("/register");
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