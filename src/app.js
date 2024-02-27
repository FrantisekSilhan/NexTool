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
  res.status(errorCode).send(errorMessage);
});

app.listen(shared.config.port);