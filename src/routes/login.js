const shared = require("../../shared");
const express = require("express");
const router = express.Router();
const { isNotAuthenticated } = require(shared.files.middlewares);
const crypto = require("crypto");

router.path = "/login";

router.get("/", isNotAuthenticated, async (req, res) => {
  const formData = req.session.formData ?? {};
  const errorMessage = req.session.errorMessage;
  delete req.session.formData;
  delete req.session.errorMessage;

  res.render("login", { UserNameLen: shared.config.user.userNameLen, PasswordLen: shared.config.user.passwordLen, formData, errorMessage });
});

router.post("/", isNotAuthenticated, async (req, res, next) => {
  const { db } = require(shared.files.database);

  let isTransactionActive = false;
  let redirectBack = false;

  try {
    const { userName, password } = req.body;
    req.session.formData = { userName };

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

    if (userName.length === 0 || password.length === 0) {
      const err = new Error("Username or password is empty");
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

    if (!user) {
      const err = new Error("Username not found");
      err.status = 400;
      redirectBack = true;
      throw err;
    }

    const passwordHash = crypto.pbkdf2Sync(password, user.salt, 1000, 64, "sha512").toString("hex");

    if (passwordHash !== user.password) {
      const err = new Error("Password incorrect");
      err.status = 400;
      redirectBack = true;
      throw err;
    } else {
      req.session.userId = user.id;
      req.session.username = user.userName;
    }

    delete req.session.formData;
    res.redirect("/");

  } catch (err) {
    if (redirectBack) {
      req.session.errorMessage = err.message;
      return res.redirect("/login");
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