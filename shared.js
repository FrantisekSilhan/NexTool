// Node package imports
const path = require("path");
const fs = require("fs");


// Define paths
const src = path.join(__dirname, "src");
const views = path.join(src, "views");
const paths = {
  data: path.join(__dirname, "data"),
  public: path.join(__dirname, "public"),
  files: path.join(__dirname, "files"),
  src: src,
  views: views,
  layouts: path.join(views, "layouts"),
};


// Define files
files = {
  setup: path.join(paths.src, "setup"),
  database: path.join(paths.src, "db"),
  files: path.join(paths.src, "files"),
  invites: path.join(paths.src, "invites"),
  mainLayout: path.join(paths.layouts, "main-layout"),
  sessionMiddleware: path.join(paths.src, "sessionMiddleware"),
};


// Export shared module
module.exports = {
  path: path,
  fs: fs,
  paths: paths,
  files: files,
  config: require(path.join(paths.src, "config")),
};