const shared = require("../../shared");
const express = require("express");
const router = express.Router();

const { isAuthenticated } = require(shared.files.middlewares);

router.path = "/d";

router.get("/:file", isAuthenticated, async (req, res, next) => {
  const { db } = require(shared.files.database);

  let isTransactionActive = false;

  try {
    const fileName = req.params.file;
    const userId = req.session.userId;

    const fileInfo = await new Promise((resolve, reject) => {
      db.get("SELECT id FROM files WHERE fileName = ? AND owner = ?",
        [fileName, userId],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (!fileInfo) {
      const err = new Error("File doesn't exist or you don't have permission to delete it");
      err.status = 400;
      throw err;
    }

    await new Promise((resolve, reject) => {
      db.run("BEGIN TRANSACTION",
        (err) => err ? reject(err) : resolve(isTransactionActive = true)
      );
    });

    await new Promise((resolve, reject) => {
      db.run("DELETE FROM files WHERE id = ?",
        [fileInfo.id],
        (err) => err ? reject(err) : resolve()
      );
    });

    await new Promise((resolve, reject) => {
      shared.fs.unlink(shared.path.join(shared.paths.files, fileName),
        (err) => err ? reject(err) : resolve());
    });

    await new Promise((resolve, reject) => {
      db.run("COMMIT",
        (err) => err ? reject(err) : resolve(isTransactionActive = false)
      );
    });

    res.redirect("/dashboard");
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