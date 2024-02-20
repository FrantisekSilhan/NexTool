const shared = require("../shared");
require(shared.files.setup);
const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const app = express();

app.set("view engine", "ejs");
app.set("views", shared.paths.views);
app.set("layout", "layouts/layout");
app.use(express.static(shared.paths.public));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  shared.fs.readdir(shared.paths.files, (err, files) => {
    if (err) {
      next(err);
    }
    const fileList = files.map(file => {
      const parts = file.split("_");
      if (parts.length != 3) return;
      if (parts[0] != "autoindex") return;
      return `<li><a href="f/${parts[2]}">${parts[1].replace("-", " ")}</a></li>`
    }).join("");
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Index of ${req.originalUrl}</title>
      </head>
      <body>
        <h1>Index of ${req.originalUrl}</h1>
        <ul>
          ${fileList}
        </ul>
      </body>
      </html>
    `;
    res.send(html);
  });
});

app.get("/f/:file", (req, res) => {
  const file = req.params.file;
  res.sendFile(file);
});

app.use((req, res, next ) => {
  const error = new Error("Not Found");
  error.status = 404; 
  next(error);
});

app.use((err, req, res, next) => {
  const errorCode = err.status ?? 500;
  const errorMessage = err.message ?? "Internal Server Error";
  res.status(errorCode).send(errorMessage);
});

app.listen(shared.config.port);
