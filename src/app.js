const express = require("express");
const app = express();
const appSettings = require("../appsettings");

app.use(express.static(appSettings.paths.public));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  const userAgent = req.headers["user-agent"];
  const isDiscordBot = userAgent.includes("Discordbot");

  if (isDiscordBot) {
    res.sendFile(appSettings.path.join(appSettings.paths.public, "tonee.gif"));
  } else {
    res.sendFile(appSettings.path.join(appSettings.paths.public, "tonee.mp4"));
  }
});

app.use((req, res, next ) => {
  const error = new Error("Not Found");
  error.status = 404;
  next(error);
});

app.use((err, req, res, next) => {
  const errorCode = err.status || 500;
  const errorMessage = err.message || "Internal Server Error";
  res.status(errorCode).send(errorMessage);
});

app.listen(appSettings.config.port);