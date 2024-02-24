const shared = require("../shared");
const sqlite3 = require("sqlite3").verbose();

const dbPath = shared.path.join(shared.paths.data, shared.config.dbPath);

const db = new sqlite3.Database(dbPath, err => {
  if (err) {
    console.error("Error opening database: ", err.message);
  }
  console.log("Connected to the database.");
});

const initialize = () => {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY,
        fileName TEXT NOT NULL UNIQUE,
        displayName TEXT NOT NULL,
        downloadName TEXT NOT NULL,
        indexFile BOOLEAN NOT NULL,
  
        added DATETIME DEFAULT CURRENT_TIMESTAMP,
        fileSize INTEGER NOT NULL,
        md5 TEXT NOT NULL,
        mimeType TEXT NOT NULL,

        owner INTEGER NOT NULL
      )
    `);
    db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      userName TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    )
  `);
  });  
};

module.exports = {
  db,
  initialize,
};