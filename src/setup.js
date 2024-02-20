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
      name TEXT NOT NULL UNIQUE,
      display TEXT NOT NULL
    )
  `);
});