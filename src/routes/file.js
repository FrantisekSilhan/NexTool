const shared = require("../../shared");
const express = require("express");
const router = express.Router();

const { isAuthenticated, isNotFromShortener } = require(shared.files.middlewares);

const { readFileLines } = require(shared.files.files);

router.path = "/f";

router.get("/:file", isNotFromShortener, async (req, res, next) => {
  const { db } = require(shared.files.database);

  try {
    const fileName = req.params.file;
    const userId = req.session.userId;

    const fileInfo = await new Promise((resolve, reject) => {
      db.get("SELECT downloadName, mimeType, language, owner FROM files WHERE fileName = ?",
        [fileName],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (!fileInfo) {
      const err = new Error("File not found");
      err.status = 404;
      throw err;
    }

    const userInfo = await new Promise((resolve, reject) => {
      db.get("SELECT username FROM users WHERE id = ?",
        [fileInfo.owner],
        (err, row) => err ? reject(err) : resolve(row)
      );
    })

    if (!userInfo) {
      const err = new Error("User not found");
      err.status = 500;
      throw err;
    }

    if (fileInfo.mimeType.startsWith("text") || fileInfo.language !== null) {
      const fileContent = await readFileLines(shared.path.join(shared.paths.files, fileName), 0);
      res.render("file", { fileName, downloadName: fileInfo.downloadName, language: fileInfo.language, mimeType: fileInfo.mimeType, fileContent, layout: shared.layouts.file, user: userId, isOwner: fileInfo.owner === userId, owner: userInfo.userName });
      return;
    }

    res.render("file", { fileName, downloadName: fileInfo.downloadName, language: undefined, mimeType: fileInfo.mimeType, layout: shared.layouts.file, user: userId, isOwner: fileInfo.owner === userId, owner: userInfo.userName })
  } catch (err) {
    next(err);
  }
});

router.get("/:file/:downloadName", isNotFromShortener, async (req, res, next) => {
  const { db } = require(shared.files.database);

  try {
    const fileName = req.params.file;
    const downloadName = req.params.downloadName;

    const fileInfo = await new Promise((resolve, reject) => {
      db.get("SELECT downloadName FROM files WHERE fileName = ? AND downloadName = ?",
        [fileName, downloadName],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (!fileInfo) {
      const err = new Error("File not found");
      err.status = 404;
      throw err;
    }

    res.download(shared.path.join(shared.paths.files, fileName), downloadName);
  } catch (err) {
    next(err);
  }
});

router.delete("/:file", isAuthenticated, async (req, res) => {
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

    res.sendStatus(204);
  } catch (err) {
    if (isTransactionActive) {
      await new Promise((resolve, _) => {
        db.run("ROLLBACK",
          (rollbackErr) => rollbackErr ? console.error(rollbackErr) : resolve(err)
        );
      });
    }
    
    res.sendStatus(err.status || 500);
  }
});

router.patch("/:file", isAuthenticated, async (req, res) => {
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
      const err = new Error("File not found or you don't have permission to edit it");
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
    res.sendStatus(err.status || 500);
  }
});

module.exports = router;