const express = require("express");
const router = express.Router();
const { isNotFromShortener, isAuthenticated, isAdminOrHigher } = require(shared.files.middlewares);
const { hasHigherPermission, getHighestPermission } = require(shared.files.permissions);

router.path = "/users";

router.patch("/:id", isNotFromShortener, isAuthenticated, isAdminOrHigher, async (req, res) => {
  const {db} = require(shared.files.database);

  let isTransactionActive = false;

  try {
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

    if (!targetUser) {
      const err = new Error("User Not Found");
      err.status = 404;
      throw err;
    }

    if (targetUser.id !== userId && !hasHigherPermission(modifierUser.permissions, targetUser.permissions)) {
      const err = new Error("You can't edit this");
      err.status = 403;
      throw err;
    }

    const newUserName = req.body.userName ?? targetUser.userName;
    const newPermissions = req.body.permissions ?? targetUser.permissions;
    if ((newUserName === targetUser.userName && modifierUser.permissions === targetUser.permissions) && targetUser.id !== userId) {
      res.sendStatus(304);
      return;
    }

    if (targetUser.id === userId) {
      if (getHighestPermission(modifierUser.permissions) !== getHighestPermission(newPermissions)) {
        const err = new Error("You can't change your own highest permission level");
        err.status = 403;
        throw err;
      }
    } else {
      if (!hasHigherPermission(modifierUser.permissions, newPermissions)) {
        const err = new Error("You can't set higher permissions than your own");
        err.status = 403;
        throw err;
      }
    }

    await new Promise((resolve, reject) => {
      db.run("BEGIN TRANSACTION",
          (err) => err ? reject(err) : resolve(isTransactionActive = true)
      );
    });

    await new Promise((resolve, reject) => {
      db.run("UPDATE users SET permissions = ?, userName = ? WHERE id = ?",
        [newPermissions, newUserName, req.params.id],
        (err) => err ? reject(err) : resolve()
      );
    });

    await new Promise((resolve, reject) => {
      db.run("COMMIT",
        (err) => err ? reject(err) : resolve(isTransactionActive = false)
      );
    });

    res.sendStatus(200)
  } catch (err) {
    if (isTransactionActive) {
      await new Promise((resolve, _) => {
        db.run("ROLLBACK",
          (rollbackErr) => rollbackErr ? console.error(rollbackErr) : resolve(err)
        );
      });
    }

    const errorCode = (err.status !== undefined && err.status >= 500 && err.status < 600) ? 500 : err.status || 500;
    const errorMessage = (errorCode >= 500 && errorCode < 600) ? "Internal Server Error" : err.message || "Internal Server Error";

    res.status(errorCode).json({ error: errorMessage });
  }
});

router.delete("/:id", isNotFromShortener, isAuthenticated, isAdminOrHigher, async (req, res) => {
  const {db} = require(shared.files.database);

  let isTransactionActive = false;

  try {
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

    if (!targetUser) {
      const err = new Error("User Not Found");
      err.status = 404;
      throw err;
    }

    if (Number(req.params.id) === userId || !hasHigherPermission(modifierUser.permissions, targetUser.permissions)) {
      const err = new Error("You can't delete this");
      err.status = 403;
      throw err;
    }

    await new Promise((resolve, reject) => {
      db.run("BEGIN TRANSACTION",
        (err) => err ? reject(err) : resolve(isTransactionActive = true)
      );
    });

    await new Promise((resolve, reject) => {
      db.run("DELETE FROM files WHERE owner = ?",
        [req.params.id],
        (err) => err ? reject(err) : resolve()
      );
    });

    await new Promise((resolve, reject) => {
      db.run("DELETE FROM users WHERE id = ?",
        [req.params.id],
        (err) => err ? reject(err) : resolve()
      );
    });

    await new Promise((resolve, reject) => {
      db.run("COMMIT",
        (err) => err ? reject(err) : resolve(isTransactionActive = false)
      );
    });

    res.sendStatus(200);
  } catch (err) {
    if (isTransactionActive) {
      await new Promise((resolve, _) => {
        db.run("ROLLBACK",
          (rollbackErr) => rollbackErr ? console.error(rollbackErr) : resolve(err)
        );
      });
    }

    const errorCode = (err.status !== undefined && err.status >= 500 && err.status < 600) ? 500 : err.status || 500;
    const errorMessage = (errorCode >= 500 && errorCode < 600) ? "Internal Server Error" : err.message || "Internal Server Error";

    res.status(errorCode).json({ error: errorMessage });
  }
});

module.exports = router;
