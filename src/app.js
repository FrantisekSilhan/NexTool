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
const csrfProtection = csrf({ cookie: true });

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

app.use((req, res, next) => {
  res.locals.user = req.session.userId;
  res.locals.site = shared.config.site;
  res.locals.csrfToken = req.csrfToken();
  next();
});

shared.fs.readdirSync(shared.paths.routes).forEach(file => {
  if (file.endsWith(".js")) {
    const router = require(shared.path.join(shared.paths.routes, file));
    app.use(router.path, router);
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
  res.status(errorCode).render("error", { errorCode, errorMessage });
});

app.listen(shared.config.port);