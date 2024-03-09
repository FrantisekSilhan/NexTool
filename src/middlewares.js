const shared = require("../shared");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
require("dotenv").config();

const { Permission, hasPermission } = require(shared.files.permissions);

const sessionMiddleware = session({
  store: new SQLiteStore({
    db: `data/${shared.config.sessionDbPath}`,
    concurrentDB: true,
  }),
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // D * H * M * S * MS
  },
});

const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.redirect("/login");
  }
};

const isAuthenticatedShortener = (req, res, next) => {
  if (req.headers.host === shared.config.shortener.host) {
    next();
  } else {
    if (req.session.userId) {
      next();
    } else {
      res.redirect("/login");
    }
  }
};

const isNotAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    res.redirect("/");
  } else {
    next();
  }
};

const isNotFromShortener = (req, res, next) => {
  if (req.headers.host === shared.config.shortener.host) {
    res.status(404).render("error", { errorCode: 404, errorMessage: "Not Found", renderNavbar: false, renderMetaTags: false });
  } else {
    next();
  }
}

const isFromShortener = (req, _, next) => {
  if (req.headers.host === shared.config.shortener.host) {
    next();
  } else {
    const err = new Error("Forbidden");
    err.status = 403;
    next(err);
  }
}

const isAdminOrHigher = async (req, _, next) => {
  const { db } = require(shared.files.database);
  const isHigher = await new Promise((resolve, reject) => {
    db.get("SELECT permissions FROM users WHERE id = ?",
      [req.session.userId],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(hasPermission(row.permissions, Permission.Admin) || hasPermission(row.permissions, Permission.Owner));
        }
      }
    );
  });

  if (isHigher) {
    next();
  } else {
    const err = new Error("You have to be an admin or higher to access this page");
    err.status = 403;
    next(err);
  }
};

module.exports = {
  sessionMiddleware,
  isAuthenticated,
  isAuthenticatedShortener,
  isNotAuthenticated,
  isNotFromShortener,
  isFromShortener,
  isAdminOrHigher,
};