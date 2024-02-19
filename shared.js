const path = require("path");
const fs = require("fs");
const paths = {
  data: path.join(__dirname, "data"),
  public: path.join(__dirname, "public"),
  src: path.join(__dirname, "src"),
};

module.exports = {
  path: path,
  fs: fs,
  paths: paths,
  files: {
    setup: path.join(paths.src, "setup"),
    database: path.join(paths.src, "db"),
  },
  config: require(path.join(paths.src, "config")),
};