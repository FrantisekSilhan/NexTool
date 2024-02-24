const shared = require("../shared");
require(shared.files.setup);
const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const expressFileUpload = require("express-fileupload");
const app = express();

const cookieParser = require("cookie-parser");
const { sessionMiddleware } = require(shared.files.sessionMiddleware);
const csrf = require("csurf");
const csrfProtection = csrf({ cookie: true });

const filesModule = require(shared.files.files);
const crypto = require("crypto");

app.set("view engine", "ejs");
app.set("views", shared.paths.views);
app.set("layout", shared.files.mainLayout);

app.use(express.static(shared.paths.public));
app.use(express.urlencoded({ extended: true }));
app.use(expressLayouts);
app.use(expressFileUpload({
  limits: { fileSize: shared.config.upload.maximumFileSize },
  abortOnLimit: true
}));

app.use(cookieParser());
app.use(sessionMiddleware);
app.use(csrfProtection);

app.get("/", async (_, res, next) => {
  try {
    const { db } = require(shared.files.database);
    
    const files = await new Promise((resolve, reject) => {
      db.all("SELECT fileName, displayName, fileSize, md5, mimeType FROM files WHERE indexFile = 1",
        (err, rows) => err ? reject(err) : resolve(rows)
      );
    });

    const formattedFiles = files.map(file => ({
      ...file,
      fileSize: filesModule.formatFileSize(file.fileSize)
    }));

    res.render("index", { files: formattedFiles });
  } catch (err) {
    next(err);
  }
});

app.get("/upload", (_, res) => {
  res.render("upload", {
    csrfToken: req.csrfToken(),
    DownloadLen: shared.config.upload.downloadLen,
    DisplayLen: shared.config.upload.displayLen,
  });
});

app.post("/upload", async (req, res, next) => {
  const { db } = require(shared.files.database);

  try {
    if (!req.files || !req.files.file) {
      const err = new Error("No file uploaded");
      err.status = 400;
      throw err;
    }
  
    const file = req.files.file;

    if (file.size > shared.config.upload.maximumFileSize) {
      const err = new Error("File too large");
      err.status = 400;
      throw err;
    }

    const fileName = await filesModule.generateRandomFileName(require(shared.files.database));
    const downloadName = req.body.downloadName.replace(/\s/g, "").length > 0 ? req.body.downloadName : fileName;
    const displayName = req.body.displayName.replace(/\s/g, "").length > 0 ? req.body.displayName : downloadName;
    const index = req.body.index !== undefined && req.body.index === "on";
  
    if (downloadName.length > shared.config.upload.downloadLen) {
      const err = new Error("Download name too long");
      err.status = 400;
      throw err;
    }
    if (displayName.length > shared.config.upload.displayLen) {
      const err = new Error("Display name too long");
      err.status = 400;
      throw err;
    }
  
    await new Promise((resolve, reject) => {
      db.run("BEGIN TRANSACTION",
        (err) => err ? reject(err) : resolve()
      );
    });

    await new Promise((resolve, reject) => {
      db.run("INSERT INTO files (fileName, displayName, downloadName, indexFile, fileSize, md5, mimeType) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [fileName, displayName, downloadName, index, file.size, crypto.createHash("md5").update(file.data).digest("hex"), file.mimetype],
        (err) => err ? reject(err) : resolve()
      );
    });

    await new Promise((resolve, reject) => {
      file.mv(shared.path.join(shared.paths.files, fileName),
        (err) => err ? reject(err) : resolve()
      );
    });
    
    await new Promise((resolve, reject) => {
      db.run("COMMIT",
        (err) => err ? reject(err) : resolve()
      );
    });

    res.redirect("/");

  } catch (err) {
    if (err.status != 400) {
      await new Promise((_, reject) => {
        db.run("ROLLBACK",
          (rollbackErr) => rollbackErr ? console.error(rollbackErr) : reject(err)
        );
      });
    }

    next(err);
  }
});

app.get("/f/:file", async (req, res, next) => {
  const { db } = require(shared.files.database);

  try {
    const fileName = req.params.file;

    const fileInfo = await new Promise((resolve, reject) => {
      db.get("SELECT downloadName, mimeType FROM files WHERE fileName = ?",
        [fileName],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (!fileInfo) {
      const err = new Error("File not found");
      err.status = 404;
      throw err;
    }

    if (fileInfo.mimeType.startsWith("text")) {
      const fileContent = await filesModule.readFileLines(shared.path.join(shared.paths.files, fileName), 10, "... (More content available)");
      res.render("file", { fileName, downloadName: fileInfo.downloadName, mimeType: fileInfo.mimeType, fileContent });
      return;
    }

    res.render("file", { fileName, downloadName: fileInfo.downloadName, mimeType: fileInfo.mimeType })
  } catch (err) {
    next(err);
  }
});

app.get("/f/:file/:downloadName", async (req, res, next) => {
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

app.get("/register", async (req, res) => {
  res.render("register", { csrfToken: req.csrfToken(), UserNameLen: shared.config.user.userNameLen, PasswordLen: shared.config.user.passwordLen, InviteCodeLen: shared.config.user.inviteCodeLen });
});

app.post("/register", async (req, res, next) => {
  const { db } = require(shared.files.database);

  try {
    const userName = req.body.userName;
    const password = req.body.password;
    const inviteCode = req.body.inviteCode;

    if (userName.length > shared.config.user.userNameLen) {
      const err = new Error("Username too long");
      err.status = 400;
      throw err;
    }
    if (password.length > shared.config.user.passwordLen) {
      const err = new Error("Password too long");
      err.status = 400;
      throw err;
    }
    if (inviteCode.length > shared.config.user.inviteCodeLen) {
      const err = new Error("Invite code too long");
      err.status = 400;
      throw err;
    }

    if (userName.length === 0 || password.length === 0 || inviteCode.length === 0) {
      const err = new Error("Invalid input, username, password, or invite code is empty");
      err.status = 400;
      throw err;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(userName)) {
      const err = new Error("Invalid username, must be alphanumeric or underscore only");
      err.status = 400;
      throw err;
    }
    
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()-_+=]).{8,}$/g.test(password)) {
      const err = new Error("Invalid password, must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character");
      err.status = 400;
      throw err;
    }

    await new Promise((resolve, reject) => {
      db.run("BEGIN TRANSACTION",
        (err) => err ? reject(err) : resolve()
      );
    });

    //TODO: implement invite code creation and usage

    /*const invite = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM invites WHERE code = ?",
        [inviteCode],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (!invite) {
      const err = new Error("Invalid invite code");
      err.status = 400;
      throw err;
    }*/

    const passwordHash = crypto.createHash("sha256").update(password).digest("hex");

    await new Promise((resolve, reject) => {
      db.run("INSERT INTO users (userName, password) VALUES (?, ?)",
        [userName, passwordHash],
        (err) => err ? reject(err) : resolve()
      );
    });

    /*await new Promise((resolve, reject) => {
      db.run("DELETE FROM invites WHERE code = ?",
        [inviteCode],
        (err) => err ? reject(err) : resolve()
      );
    });*/
    
    await new Promise((resolve, reject) => {
      db.run("COMMIT",
        (err) => err ? reject(err) : resolve()
      );
    });

    res.redirect("/login");

  } catch (err) {
    if (err.status != 400) {
      await new Promise((_, reject) => {
        db.run("ROLLBACK",
          (rollbackErr) => rollbackErr ? console.error(rollbackErr) : reject(err)
        );
      });
    }

    next(err);
  }
});

app.use((_, __, next ) => {
  const err = new Error("Not Found");
  err.status = 404; 
  next(err);
});

app.use((err, _, res, __) => {
  console.error(err);
  const errorCode = (err.status !== undefined && err.status >= 500 && err.status < 600) ? 500 : err.status ?? 500;
  const errorMessage = (errorCode >= 500 && errorCode < 600) ? "Internal Server Error" : err.message ?? "Internal Server Error";
  res.status(errorCode).send(errorMessage);
});

app.listen(shared.config.port);
