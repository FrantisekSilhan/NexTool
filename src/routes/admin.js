const shared = require("../../shared");
const express = require("express");
const router = express.Router();
const { isAuthenticated } = require(shared.files.middlewares);
const {hasPermission, Permission, getUserPermissions, getPermissionNames} = require("../permissions");

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

    if (!hasPermission(row.permissions, Permission.Admin)) {
      const err = new Error("You don't have permission to access the admin panel");
      err.status = 403;
      throw err;
    }

    const users = await new Promise((resolve, reject) => {
      db.all("SELECT id, userName, permissions FROM users", (err, rows) => err ? reject(err) : resolve(rows));
    });

    users.forEach(user => {
      user.permissionList = getUserPermissions(user.permissions);
    });

    const permissionList = getPermissionNames();

    res.render("admin", { userName: req.session.username, permissionList, users, userId });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
