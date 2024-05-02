const shared = require("../../shared");
const express = require("express");
const router = express.Router();
const { isAuthenticated, isNotFromShortener } = require(shared.files.middlewares);

const { formatFileSize } = require(shared.files.files);
const { Permission, hasPermission, hasHigherPermission } = require(shared.files.permissions);

router.path = "/files";

router.get("/", isNotFromShortener, isAuthenticated, async (req, res) => {
  try {
    const { db } = require(shared.files.database);

    const userId = req.session.userId;
    const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
    if (isNaN(offset) || offset <= 0) {
      const err = new Error("Invalid offset");
      err.status = 400;
      throw err;
    }
    const isOwner = req.query.isOwner && req.query.isOwner === "true";

    const files = await new Promise((resolve, reject) => {
      if (isOwner) {
        db.all(`SELECT fileName, displayName, fileSize, md5, mimeType FROM files WHERE owner = ? ORDER BY added DESC LIMIT 35 OFFSET ?`,
          [userId, offset],
          (err, rows) => err ? reject(err) : resolve(rows)
        );
      } else {
        db.all(`SELECT fileName, displayName, fileSize, md5, mimeType FROM files WHERE indexFile = 1 ORDER BY added DESC LIMIT 35 OFFSET ?`,
          [offset],
          (err, rows) => err ? reject(err) : resolve(rows)
        );
      }
    });

    const formattedFiles = files.map(file => ({
      ...file,
      fileSize: formatFileSize(file.fileSize)
    }));

    res.json(formattedFiles);
  } catch (err) {
    const errorCode = (err.status !== undefined && err.status >= 500 && err.status < 600) ? 500 : err.status || 500;
    const errorMessage = (errorCode >= 500 && errorCode < 600) ? "Internal Server Error" : err.message || "Internal Server Error";

    res.status(errorCode).json({ error: errorMessage });
  }
});

router.delete("/:file", isNotFromShortener, isAuthenticated, async (req, res) => {
  const { db } = require(shared.files.database);

  let isTransactionActive = false;

  try {
    const fileName = req.params.file;
    const userId = req.session.userId;

    const modifierUser = await new Promise((resolve, reject) => {
      db.get("SELECT permissions FROM users WHERE id = ?",
        [userId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });

    const fileInfo = await new Promise((resolve, reject) => {
      db.get("SELECT id, owner FROM files WHERE fileName = ?",
        [fileName],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (!fileInfo) {
      const err = new Error("File doesn't exist");
      err.status = 400;
      throw err;
    }

    if (fileInfo.owner !== userId) {
      const targetUser = await new Promise((resolve, reject) => {
        db.get("SELECT permissions FROM users WHERE id = ?",
          [fileInfo.owner],
          (err, row) => err ? reject(err) : resolve(row)
        );
      });

      if (!targetUser) {
        const err = new Error("Owner Not Found");
        err.status = 500;
        throw err;
      }

      if (!(hasPermission(modifierUser.permissions, Permission.Admin) || hasPermission(modifierUser.permissions, Permission.Owner)) || !hasHigherPermission(modifierUser.permissions, targetUser.permissions)) {
        const err = new Error("You don't have permission to delete this file");
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

router.patch("/:file", isNotFromShortener, isAuthenticated, async (req, res) => {
  const { db } = require(shared.files.database);

  try {
    const languages = [
      { name: "None", value: "none", exts: [] },
      { name: "C#", value: "cs", exts: ["cs"] },
      { name: "C", value: "c", exts: ["c"] },
      { name: "C++", value: "cpp", exts: ["cpp", "cc", "cxx", "c++"] },
      { name: "CSS", value: "css", exts: ["css"] },
      { name: "Go", value: "go", exts: ["go"] },
      { name: "HTML", value: "html", exts: ["html", "htm"] },
      { name: "Java", value: "java", exts: ["java"] },
      { name: "JavaScript", value: "js", exts: ["js", "jsx"] },
      { name: "JSON", value: "json", exts: ["json"] },
      { name: "Kotlin", value: "kt", exts: ["kt"] },
      { name: "Lua", value: "lua", exts: ["lua"] },
      { name: "Markdown", value: "md", exts: ["md"] },
      { name: "PowerShell", value: "ps1", exts: ["ps1"] },
      { name: "Python", value: "py", exts: ["py"] },
      { name: "Ruby", value: "rb", exts: ["rb"] },
      { name: "Rust", value: "rs", exts: ["rs"] },
      { name: "Shell", value: "sh", exts: ["sh"] },
      { name: "SQL", value: "sql", exts: ["sql"] },
      { name: "TypeScript", value: "ts", exts: ["ts", "tsx"] },
      { name: "YAML", value: "yaml", exts: ["yaml", "yml"] },
    ];
    const fileName = req.params.file;
    const userId = req.session.userId;
    const language = req.query.language;
    
    if (!languages.some(lang => lang.value === language)) {
      const err = new Error("Invalid language");
      err.status = 400;
      throw err;
    }
    
    const fileInfo = await new Promise((resolve, reject) => {
      db.get("SELECT id, language FROM files WHERE fileName = ? AND owner = ?",
      [fileName, userId],
      (err, row) => err ? reject(err) : resolve(row)
      );
    });
    
    if (!fileInfo) {
      const err = new Error("File Not Found or you don't have permission to edit it");
      err.status = 404;
      throw err;
    }
    
    if (fileInfo.language === language) {
      res.sendStatus(204);
      return;
    }
    
    await new Promise((resolve, reject) => {
      db.run("UPDATE files SET language = ? WHERE id = ?",
        [language, fileInfo.id],
        (err) => err ? reject(err) : resolve()
      );
    });

    res.sendStatus(204);
  } catch (err) {
    const errorCode = (err.status !== undefined && err.status >= 500 && err.status < 600) ? 500 : err.status || 500;
    const errorMessage = (errorCode >= 500 && errorCode < 600) ? "Internal Server Error" : err.message || "Internal Server Error";

    res.status(errorCode).json({ error: errorMessage });
  }
});

module.exports = router;