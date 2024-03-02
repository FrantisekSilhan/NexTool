// Node package imports
const path = require("path");
const fs = require("fs");


// Define paths
const src = path.join(__dirname, "src");
const views = path.join(src, "views");
const routes = path.join(src, "routes");
const utils = path.join(src, "utils");

const paths = {
  data: path.join(__dirname, "data"),
  public: path.join(__dirname, "public"),
  files: path.join(__dirname, "files"),
  src: src,
  views: views,
  routes: routes,
  layouts: path.join(views, "layouts"),
  utils: utils,
};


// Define files
files = {
  setup: path.join(paths.src, "setup"),
  database: path.join(paths.src, "db"),
  files: path.join(paths.utils, "files"),
  invites: path.join(paths.utils, "invites"),
  shortener: path.join(paths.utils, "shortener"),
  mainLayout: path.join(paths.layouts, "main-layout"),
  middlewares: path.join(paths.src, "middlewares"),
};


// Export shared module
module.exports = {
  path: path,
  fs: fs,
  paths: paths,
  files: files,
  config: require(path.join(paths.src, "config")),
};