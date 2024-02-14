const path = require("path");

module.exports = {
  config: require("./src/config"),
  path: require("path"),
  paths: {
    data: path.join(__dirname, "data"),
    public: path.join(__dirname, "public"),
  }
};