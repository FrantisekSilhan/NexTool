const shared = require("../../shared");
const express = require("express");
const router = express.Router();
const { isAuthenticated, isNotFromShortener } = require(shared.files.middlewares);

const { Permission, hasPermission, hasHigherPermission } = require(shared.files.permissions);

router.path = "/invites";

router.delete("/:id", isNotFromShortener, isAuthenticated, async (req, res) => {
  const { db } = require(shared.files.database);

  let isTransactionActive = false;

  try {
    const id = req.params.id;
    const userId = req.session.userId;

    const invite = await new Promise((resolve, reject) => {
      db.get("SELECT id, usedBy FROM invites WHERE id = ?",
        [id],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (!invite.id) {
      const err = new Error("Invite doesn't exist");
      err.status = 400;
      throw err;
    }

    if (invite.usedBy) {
      const err = new Error("Can't delete used invite");
      err.status = 403;
      throw err;
    }

    const modifierUser = await new Promise((resolve, reject) => {
      db.get("SELECT permissions FROM users WHERE id = ?",
        [userId],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    const createdBy = await new Promise((resolve, reject) => {
      db.get("SELECT createdBy FROM invites WHERE id = ?",
        [invite.id],
        (err, row) => err ? reject(err) : resolve(row.createdBy)
      );
    });

    if (createdBy !== userId) {
      const targetUser = await new Promise((resolve, reject) => {
        db.get("SELECT permissions FROM users WHERE id = ?",
          [createdBy],
          (err, row) => err ? reject(err) : resolve(row)
        );
      });

      if (!targetUser) {
        const err = new Error("TargetUser Not Found");
        err.status = 500;
        throw err;
      }

      if (!(hasPermission(modifierUser.permissions, Permission.Admin) || hasPermission(modifierUser.permissions, Permission.Owner)) || !hasHigherPermission(modifierUser.permissions, targetUser.permissions)) {
        const err = new Error("You don't have permission to delete this invite");
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
      db.run("DELETE FROM invites WHERE id = ?",
        [invite.id],
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
    console.error(err);
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