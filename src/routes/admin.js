const shared = require("../../shared");
const express = require("express");
const router = express.Router();
const { isAuthenticated } = require(shared.files.middlewares);
const {hasPermission, Permission} = require("../permissions");

router.path = "/admin";

router.get("/", isAuthenticated, async (req, res, next) => {
  try {
    const { db } = require(shared.files.database);

    const userId = req.session.userId;

    const row = await new Promise((resolve, reject) => {
      db.get("SELECT permissions FROM users WHERE id = ?",
        [userId],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (!hasPermission(row.permissions, Permission.A)) {
      const err = new Error("You don't have permission to access the admin panel");
      err.status = 403;
      throw err;
    }

    res.render("admin", { userName: req.session.username, userId });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
