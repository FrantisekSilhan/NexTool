/*
 * Copyright (C) 2024  František Šilhán <frantisek@slhn.cz>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

const shared = require("../shared");
require(shared.files.setup);
const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const expressFileUpload = require("express-fileupload");
const app = express();

const cookieParser = require("cookie-parser");
const { sessionMiddleware } = require(shared.files.middlewares);
const csrf = require("csurf");
const { hasPermission, Permission } = require(shared.files.permissions);
const csrfProtection = csrf({ cookie: true });

app.set("view engine", "ejs");
app.set("views", shared.paths.views);
app.set("layout", shared.layouts.mainLayout);

app.use(express.static(shared.paths.public));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(expressLayouts);
app.use(expressFileUpload({
  limits: { fileSize: shared.config.upload.maximumFileSize },
  abortOnLimit: true
}));

app.use(cookieParser());
app.use(sessionMiddleware);
app.use(csrfProtection);

app.use((req, res, next) => {
  res.locals.user = req.session.userId;
  res.locals.site = shared.config.site;
  res.locals.siteUrl = shared.config.siteUrl;
  res.locals.csrfToken = req.csrfToken();
  res.locals.renderNavbar = true;
  res.locals.renderMetaTags = true;
  next();
});

app.use((req, res, next) => {
  if (req.session.userId) {
    const { db } = require(shared.files.database);
    db.get("SELECT permissions FROM users WHERE id = ?",
      [req.session.userId],
      (err, row) => {
        if (err) {
          next(err);
        } else {
          res.locals.isAdmin = hasPermission(row.permissions, Permission.Admin);
          next();
        }
      }
    );
  } else {
    next();
  }
});

shared.fs.readdirSync(shared.paths.routes).forEach(file => {
  if (file.endsWith(".js") && file !== "index.js") {
    const router = require(shared.path.join(shared.paths.routes, file));
    app.use(router.path, router);
  }
});
const router = require(shared.path.join(shared.paths.routes, "index.js"));
app.use(router.path, router);

shared.fs.readdirSync(shared.paths.api).forEach(file => {
  if (file.endsWith(".js")) {
    const router = require(shared.path.join(shared.paths.api, file));
    app.use(`/api${router.path}`, router);
  }
});

app.use((_, __, next ) => {
  const err = new Error("Not Found");
  err.status = 404;
  next(err);
});

app.use((err, req, res, _) => {
  console.error(err);
  const errorCode = (err.status !== undefined && err.status >= 500 && err.status < 600) ? 500 : err.status || 500;
  const errorMessage = (errorCode >= 500 && errorCode < 600) ? "Internal Server Error" : err.message || "Internal Server Error";
  if (req.headers.host === shared.config.shortener.host) {
    res.status(errorCode).render("error", { errorCode, errorMessage, renderNavbar: false, renderMetaTags: false });
  } else {
    res.status(errorCode).render("error", { errorCode, errorMessage });
  }
});

app.listen(shared.config.port);
