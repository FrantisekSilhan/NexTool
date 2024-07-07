const express = require("express");
const router = express.Router();
const { isAuthenticated, isNotFromShortener } = require(shared.files.middlewares);

const { Permission, hasPermission, hasHigherPermission } = require(shared.files.permissions);

router.path = "/urls";

router.delete("/:key", isNotFromShortener, isAuthenticated, async (req, res) => {
  const { db } = require(shared.files.database);

  let isTransactionActive = false;

  try {
    const key = req.params.key;
    const userId = req.session.userId;

    const keyId = await new Promise((resolve, reject) => {
      db.get("SELECT id FROM urls WHERE key = ?",
        [key],
        (err, row) => err ? reject(err) : resolve(row.id)
      );
    });

    if (!keyId) {
      const err = new Error("URL doesn't exist");
      err.status = 400;
      throw err;
    }

    const modifierUser = await new Promise((resolve, reject) => {
      db.get("SELECT permissions FROM users WHERE id = ?",
        [userId],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    const owner = await new Promise((resolve, reject) => {
      db.get("SELECT owner FROM urlStats WHERE id = ?",
        [keyId],
        (err, row) => err ? reject(err) : resolve(row.owner)
      );
    });

    if (owner !== userId) {
      const targetUser = await new Promise((resolve, reject) => {
        db.get("SELECT permissions FROM users WHERE id = ?",
          [owner],
          (err, row) => err ? reject(err) : resolve(row)
        );
      });

      if (!targetUser) {
        const err = new Error("Owner Not Found");
        err.status = 500;
        throw err;
      }

      if (!(hasPermission(modifierUser.permissions, Permission.Admin) || hasPermission(modifierUser.permissions, Permission.Owner)) || !hasHigherPermission(modifierUser.permissions, targetUser.permissions)) {
        const err = new Error("You don't have permission to delete this URL");
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
      db.run("DELETE FROM urls WHERE id = ?",
        [keyId],
        (err) => err ? reject(err) : resolve()
      );
    });

    await new Promise((resolve, reject) => {
      db.run("DELETE FROM urlStats WHERE id = ?",
        [keyId],
        (err) => err ? reject(err) : resolve()
      );
    });

    await new Promise((resolve, reject) => {
      db.run("COMMIT",
        (err) => err ? reject(err) : resolve(isTransactionActive = false)
      );
    });

    res.sendStatus(204);

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