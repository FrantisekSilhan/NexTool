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
  src,
  views,
  routes,
  layouts: path.join(views, "layouts"),
  utils,
  api: path.join(src, "api"),
};


// Define files
const files = {
  setup: path.join(paths.src, "setup"),
  database: path.join(paths.src, "db"),
  files: path.join(paths.utils, "files"),
  invites: path.join(paths.utils, "invites"),
  shortener: path.join(paths.utils, "shortener"),
  permissions: path.join(paths.utils, "permissions"),
  sharedUtils: path.join(paths.utils, "sharedUtils"),
  middlewares: path.join(paths.src, "middlewares"),
};

// Define layouts
const layouts = {
  mainLayout: path.join(paths.layouts, "main-layout"),
  file: path.join(paths.layouts, "file"),
};


// Export shared module
module.exports = {
  path,
  fs,
  paths,
  files,
  layouts,
  config: require(path.join(paths.src, "config")),
};