const shared = require("../../shared");
const express = require("express");
const router = express.Router();
const { isAuthenticated, isAdminOrHigher } = require(shared.files.middlewares);
const { getUserPermissions, getPermissionNames, hasHigherPermission } = require(shared.files.permissions);

router.path = "/admin";

router.get("/", isAuthenticated, isAdminOrHigher, async (req, res, next) => {
  try {
    const { db } = require(shared.files.database);

    const userId = req.session.userId;

    const modifierUser = await new Promise((resolve, reject) => {
      db.get("SELECT permissions FROM users WHERE id = ?",
          [userId],
          (err, row) => err ? reject(err) : resolve(row)
      );
    });

    const users = await new Promise((resolve, reject) => {
      db.all("SELECT id, userName, permissions FROM users",
        (err, rows) => err ? reject(err) : resolve(rows)
      );
    });

    users.forEach(user => {
      user.permissionList = getUserPermissions(user.permissions);
      user.isHigher = !hasHigherPermission(modifierUser.permissions, user.permissions);
    });

    const permissionList = getPermissionNames();

    res.render("admin/index", { userName: req.session.username, permissionList, users, userId });
  } catch (err) {
    next(err);
  }
});

router.get("/users/:id", isAuthenticated, isAdminOrHigher, async (req, res, next) => {
  try {
    const {db} = require(shared.files.database);

    const userId = req.session.userId;

    const modifierUser = await new Promise((resolve, reject) => {
      db.get("SELECT permissions FROM users WHERE id = ?",
        [userId],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    const targetUser = await new Promise((resolve, reject) => {
      db.get("SELECT id, userName, permissions FROM users WHERE id = ?",
        [req.params.id],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });
    
    if (Number(req.params.id) === userId || !hasHigherPermission(modifierUser.permissions, targetUser.permissions)) {
      const err = new Error("You can't edit this");
      err.status = 403;
      throw err;
    }

    if (!targetUser) {
      const err = new Error("User not found");
      err.status = 404;
      throw err;
    }

    targetUser.permissionList = getUserPermissions(targetUser.permissions);

    res.render("admin/user/index", {userName: req.session.username, targetUser, userId});
  } catch (err) {
    next(err);
  }
});

module.exports = router;
