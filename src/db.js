const shared = require("../shared");
const sqlite3 = require("sqlite3").verbose();

const dbPath = shared.path.join(shared.paths.data, shared.config.dbPath);

const db = new sqlite3.Database(dbPath, err => {
  if (err) {
    console.error("Error opening database: ", err.message);
  }
  console.log("Connected to the database.");
});

module.exports = db;