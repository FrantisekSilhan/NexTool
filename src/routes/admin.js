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

    if (!hasPermission(row.permissions, Permission.Admin) && !hasPermission(row.permissions, Permission.Owner)) {
      const err = new Error("You don't have permission to access the admin panel");
      err.status = 403;
      throw err;
    }

    res.render("admin", { userName: req.session.username, userId });
  } catch (err) {
    next(err);
  }
});

router.get("/users", isAuthenticated, async (req, res, next) => {
  try {
    const {db} = require(shared.files.database);

    const userId = req.session.userId;

    const row = await new Promise((resolve, reject) => {
      db.get("SELECT permissions FROM users WHERE id = ?",
          [userId],
          (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (!hasPermission(row.permissions, Permission.Admin) && !hasPermission(row.permissions, Permission.Owner)) {
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

    res.render("admin/users", {userName: req.session.username, permissionList, users, userId});
  } catch (err) {
    next(err);
  }
});

router.get("/users/:id", isAuthenticated, async (req, res, next) => {
  try {
    const {db} = require(shared.files.database);

    const userId = req.session.userId;

    const row = await new Promise((resolve, reject) => {
      db.get("SELECT permissions FROM users WHERE id = ?",
        [userId],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (!hasPermission(row.permissions, Permission.Admin) && !hasPermission(row.permissions, Permission.Owner)) {
      const err = new Error("You don't have permission to access the admin panel");
      err.status = 403;
      throw err;
    }

    const user = await new Promise((resolve, reject) => {
      db.get("SELECT id, userName, permissions FROM users WHERE id = ?", [req.params.id], (err, row) => err ? reject(err) : resolve(row));
    });

    if (!user) {
      const err = new Error("User not found");
      err.status = 404;
      throw err;
    }

    user.permissionList = getUserPermissions(user.permissions);

    res.render("admin/user/index", {userName: req.session.username, user, userId});
  } catch (err) {
    next(err);
  }
});

router.patch("/users/:id", isAuthenticated, async (req, res, next) => {
  try {
    const {db} = require(shared.files.database);

    const userId = req.session.userId;

    const row = await new Promise((resolve, reject) => {
      db.get("SELECT permissions FROM users WHERE id = ?",
        [userId],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (!hasPermission(row.permissions, Permission.Admin) && !hasPermission(row.permissions, Permission.Owner)) {
      const err = new Error("You don't have permission to access the admin panel");
      err.status = 403;
      throw err;
    }

    if (Number(req.params.id) == userId && !hasPermission(row.permissions, Permission.Owner)) {
      const err = new Error("You can't edit your own permissions");
      err.status = 403;
      throw err;
    }

    const user = await new Promise((resolve, reject) => {
      db.get("SELECT id, userName, permissions FROM users WHERE id = ?", [req.params.id], (err, row) => err ? reject(err) : resolve(row));
    });

    if (!user) {
      const err = new Error("User not found");
      err.status = 404;
      throw err;
    }

    const userName = req.body.userName ?? user.userName;
    const permissions = req.body.permissions ?? user.permissions;
    if (userName === user.userName && permissions === user.permissions) {
      res.sendStatus(200);
      return;
    }

    await new Promise((resolve, reject) => {
      db.run("BEGIN TRANSACTION",
          (err) => err ? reject(err) : resolve(isTransactionActive = true)
      );
    });

    await new Promise((resolve, reject) => {
      db.run("UPDATE users SET permissions = ?, userName = ? WHERE id = ?", [permissions, userName, req.params.id], err => err ? reject(err) : resolve());
    });

    await new Promise((resolve, reject) => {
      db.run("COMMIT",
          (err) => err ? reject(err) : resolve(isTransactionActive = false)
      );
    });

    res.sendStatus(200)
  } catch (err) {
    next(err);
  }
});

router.delete("/users/:id", isAuthenticated, async (req, res, next) => {
  try {
    const {db} = require(shared.files.database);

    const userId = req.session.userId;

    const row = await new Promise((resolve, reject) => {
      db.get("SELECT permissions FROM users WHERE id = ?",
        [userId],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (!hasPermission(row.permissions, Permission.Admin) && !hasPermission(row.permissions, Permission.Owner)) {
      const err = new Error("You don't have permission to access the admin panel");
      err.status = 403;
      throw err;
    }

    const user = await new Promise((resolve, reject) => {
      db.get("SELECT id, userName, permissions FROM users WHERE id = ?", [req.params.id], (err, row) => err ? reject(err) : resolve(row));
    });

    if (!user) {
      const err = new Error("User not found");
      err.status = 404;
      throw err;
    }

    await new Promise((resolve, reject) => {
      db.run("BEGIN TRANSACTION",
        (err) => err ? reject(err) : resolve(isTransactionActive = true)
      );
    });

    await new Promise((resolve, reject) => {
      db.run("DELETE FROM files WHERE owner = ?", [req.params.id], err => err ? reject(err) : resolve());
    });

    await new Promise((resolve, reject) => {
      db.run("DELETE FROM users WHERE id = ?", [req.params.id], err => err ? reject(err) : resolve());
    });

    await new Promise((resolve, reject) => {
      db.run("COMMIT",
          (err) => err ? reject(err) : resolve(isTransactionActive = false)
      );
    });

    res.sendStatus(200);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
