const express = require("express");
const app = express();
const appSettings = require("../appSettings");

app.use(express.static(appSettings.paths.public));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.sendFile(appSettings.path.join(appSettings.paths.public, "tonee.mp4"));
});

app.get("/tonee.gif", (req, res) => {
  res.sendFile(appSettings.path.join(appSettings.paths.public, "tonee.gif"));
});

app.use((req, res, next ) => {
  const error = new Error("Not Found");
  error.status = 404;
  next(error);
});

app.use((err, req, res, next) => {
  const errorCode = err.status || 500;
  const errorMessage = err.message || "Internal Server Error";
  res.status(errorCode).sendFile(appSettings.path.join(appSettings.paths.public, "tonee.gif"));
});

app.listen(appSettings.config.port);
