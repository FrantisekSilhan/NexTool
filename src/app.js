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
const invitesModule = require(shared.files.invites);
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

const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.redirect("/login");
  }
};

const isNotAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    res.redirect("/");
  } else {
    next();
  }
};

app.get("/", isAuthenticated, async (_, res, next) => {
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

app.get("/upload", isAuthenticated, (req, res) => {
  const formData = req.session.formData ?? {};
  const errorMessage = req.session.errorMessage;
  delete req.session.formData;
  delete req.session.errorMessage;

  res.render("upload", {
    csrfToken: req.csrfToken(),
    DownloadLen: shared.config.upload.downloadLen,
    DisplayLen: shared.config.upload.displayLen,
    formData,
    errorMessage
  });
});

app.post("/upload", isAuthenticated, async (req, res, next) => {
  const { db } = require(shared.files.database);

  let isTransactionActive = false;
  let redirectBack = false;

  try {
    req.session.formData = { downloadName: req.body.downloadName, displayName: req.body.displayName };

    if (!req.files || !req.files.file) {
      const err = new Error("No file uploaded");
      err.status = 400;
      redirectBack = true;
      throw err;
    }
  
    const file = req.files.file;

    if (file.size > shared.config.upload.maximumFileSize) {
      const err = new Error("File too large");
      err.status = 400;
      redirectBack = true;
      throw err;
    }

    const fileName = await filesModule.generateRandomFileName(require(shared.files.database).db);
    const downloadName = req.body.downloadName.replace(/\s/g, "").length > 0 ? req.body.downloadName : fileName;
    const displayName = req.body.displayName.replace(/\s/g, "").length > 0 ? req.body.displayName : downloadName;
    const index = req.body.index !== undefined && req.body.index === "on";
  
    if (downloadName.length > shared.config.upload.downloadLen) {
      const err = new Error("Download name too long");
      err.status = 400;
      redirectBack = true;
      throw err;
    }
    if (displayName.length > shared.config.upload.displayLen) {
      const err = new Error("Display name too long");
      err.status = 400;
      redirectBack = true;
      throw err;
    }
  
    await new Promise((resolve, reject) => {
      db.run("BEGIN TRANSACTION",
        (err) => err ? reject(err) : resolve(isTransactionActive = true)
      );
    });

    await new Promise((resolve, reject) => {
      db.run("INSERT INTO files (fileName, displayName, downloadName, indexFile, fileSize, md5, mimeType, owner) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [fileName, displayName, downloadName, index, file.size, crypto.createHash("md5").update(file.data).digest("hex"), file.mimetype, req.session.userId],
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
        (err) => err ? reject(err) : resolve(isTransactionActive = false)
      );
    });

    delete req.session.formData;
    res.redirect("/");

  } catch (err) {
    if (redirectBack) {
      req.session.errorMessage = err.message;
      return res.redirect("/upload");
    }

    delete req.session.formData;

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

app.get("/invite", isAuthenticated, async (req, res) => {
  res.render("invite", { csrfToken: req.csrfToken() });
});

app.post("/invite", isAuthenticated, async (_, res, next) => {
  const { db } = require(shared.files.database);

  let isTransactionActive = false;

  try {
    const userId = req.session.userId;

    await new Promise((resolve, reject) => {
      db.run("BEGIN TRANSACTION",
        (err) => err ? reject(err) : resolve(isTransactionActive = true)
      );
    });

    await new Promise((resolve, reject) => {
      db.run("INSERT INTO invites (createdBy, invite) VALUES (?, ?)",
        [userId, invitesModule.generateInviteCode(userId)],
        (err) => err ? reject(err) : resolve()
      );
    });

    await new Promise((resolve, reject) => {
      db.run("COMMIT",
        (err) => err ? reject(err) : resolve(isTransactionActive = false)
      );
    });

    res.redirect("/invite");

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

app.get("/register", isNotAuthenticated, async (req, res) => {
  const formData = req.session.formData ?? {};
  const errorMessage = req.session.errorMessage;
  delete req.session.formData;
  delete req.session.errorMessage;

  res.render("register", { csrfToken: req.csrfToken(), UserNameLen: shared.config.user.userNameLen, PasswordLen: shared.config.user.passwordLen, InviteCodeLen: shared.config.user.inviteCodeLen, formData, errorMessage });
});

app.post("/register", isNotAuthenticated, async (req, res, next) => {
  const { db } = require(shared.files.database);

  let isTransactionActive = false;
  let redirectBack = false;

  try {
    const { userName, password, inviteCode } = req.body;
    req.session.formData = { userName, inviteCode };

    if (userName.length > shared.config.user.userNameLen) {
      const err = new Error("Username too long");
      err.status = 400;
      redirectBack = true;
      throw err;
    }
    if (password.length > shared.config.user.passwordLen) {
      const err = new Error("Password too long");
      err.status = 400;
      redirectBack = true;
      throw err;
    }
    if (inviteCode.length != shared.config.user.inviteCodeLen) {
      const err = new Error("Invite code must be 32 characters long");
      err.status = 400;
      redirectBack = true;
      throw err;
    }

    if (userName.length === 0 || password.length === 0 || inviteCode.length === 0) {
      const err = new Error("Username, password, or invite code is empty");
      err.status = 400;
      redirectBack = true;
      throw err;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(userName)) {
      const err = new Error("Username must be alphanumeric or underscore only");
      err.status = 400;
      redirectBack = true;
      throw err;
    }
    
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()-_+=]).{8,}$/g.test(password)) {
      const err = new Error("Password must pass this regex: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()-_+=]).{8,}$/g");
      err.status = 400;
      redirectBack = true;
      throw err;
    }

    const user = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM users WHERE userName = ?",
        [userName],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (user) {
      const err = new Error("Username already taken");
      err.status = 400;
      redirectBack = true;
      throw err;
    }

    const invite = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM invites WHERE invite = ? AND usedBy IS NULL",
        [inviteCode],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (!invite) {
      const err = new Error("Invite code is invalid or already used");
      err.status = 400;
      redirectBack = true;
      throw err;
    }

    await new Promise((resolve, reject) => {
      db.run("BEGIN TRANSACTION",
        (err) => err ? reject(err) : resolve(isTransactionActive = true)
      );
    });

    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
    
    const userId = await new Promise((resolve, reject) => {
      db.run("INSERT INTO users (userName, password, salt) VALUES (?, ?, ?)",
        [userName, passwordHash, salt],
        function(err) {
          err ? reject(err) : resolve(this.lastID);
        }
      );
    });

    await new Promise((resolve, reject) => {
      db.run("UPDATE invites SET usedBy = ? WHERE invite = ?",
        [userId, inviteCode],
        (err) => err ? reject(err) : resolve()
      );
    });
    
    await new Promise((resolve, reject) => {
      db.run("COMMIT",
        (err) => err ? reject(err) : resolve(isTransactionActive = false)
      );
    });

    delete req.session.formData;
    res.redirect("/login");

  } catch (err) {
    if (redirectBack) {
      req.session.errorMessage = err.message;
      return res.redirect("/register");
    }

    delete req.session.formData;

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

app.get("/login", isNotAuthenticated, async (req, res) => {
  const formData = req.session.formData ?? {};
  const errorMessage = req.session.errorMessage;
  delete req.session.formData;
  delete req.session.errorMessage;

  res.render("login", { csrfToken: req.csrfToken(), UserNameLen: shared.config.user.userNameLen, PasswordLen: shared.config.user.passwordLen, formData, errorMessage });
});

app.post("/login", isNotAuthenticated, async (req, res, next) => {
  const { db } = require(shared.files.database);

  let isTransactionActive = false;
  let redirectBack = false;

  try {
    const { userName, password } = req.body;
    req.session.formData = { userName };

    if (userName.length > shared.config.user.userNameLen) {
      const err = new Error("Username too long");
      err.status = 400;
      redirectBack = true;
      throw err;
    }

    if (password.length > shared.config.user.passwordLen) {
      const err = new Error("Password too long");
      err.status = 400;
      redirectBack = true;
      throw err;
    }

    if (userName.length === 0 || password.length === 0) {
      const err = new Error("Username or password is empty");
      err.status = 400;
      redirectBack = true;
      throw err;
    }

    const user = await new Promise((resolve, reject) => {
      db.get("SELECT * FROM users WHERE userName = ?",
        [userName],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    if (!user) {
      const err = new Error("Username not found");
      err.status = 400;
      redirectBack = true;
      throw err;
    }

    const passwordHash = crypto.pbkdf2Sync(password, user.salt, 1000, 64, "sha512").toString("hex");

    if (passwordHash !== user.password) {
      const err = new Error("Password incorrect");
      err.status = 400;
      redirectBack = true;
      throw err;
    } else {
      req.session.userId = user.id;
    }

    delete req.session.formData;
    res.redirect("/");

  } catch (err) {
    if (redirectBack) {
      req.session.errorMessage = err.message;
      return res.redirect("/login");
    }

    delete req.session.formData;

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