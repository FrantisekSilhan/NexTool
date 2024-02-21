const shared = require("../shared");

Object.keys(shared.paths).forEach(key => {
  if (!shared.fs.existsSync(shared.paths[key])) {
    shared.fs.mkdirSync(shared.paths[key], { recursive: true });
  }
});

const db = require(shared.files.database);

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
      mimeType TEXT NOT NULL
    )
  `);
});