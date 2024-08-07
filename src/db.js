const sqlite3 = require("sqlite3").verbose();
// const migrationScripts = require("./migrations/02-add-permissions.js");

const dbPath = shared.path.join(shared.paths.data, shared.config.dbPath);

const db = new sqlite3.Database(dbPath, err => {
  if (err) {
    console.error("Error opening database: ", err.message);
  }
  console.log("Connected to the database.");

  // db.exec(migrationScripts.up, err => {
  //   if (err) {
  //     console.error("Error applying migration: ", err.message);
  //   } else {
  //     console.log("Migration applied successful.");
  //   }
  // });
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
        language TEXT NULL,

        owner INTEGER NOT NULL
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        userName TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        salt TEXT NOT NULL,
        permissions INT DEFAULT 5 NOT NULL
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS invites (
        id INTEGER PRIMARY KEY,
        createdBy INTEGER NOT NULL,
        invite TEXT NOT NULL UNIQUE,
        usedBy INTEGER NULL
      )
    `);
    db.run(`
      INSERT INTO invites (createdBy, invite) SELECT 0, "00000000000-0000000000--00000000" WHERE NOT EXISTS (SELECT 1 FROM invites)
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS urls (
        id INTEGER PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        url TEXT NOT NULL
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS urlStats (
        id INTEGER PRIMARY KEY,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        visitCount INTEGER DEFAULT 0,
        maxVisitCount INTEGER DEFAULT 0,
        owner INTEGER NOT NULL
      )
    `);
  });
};

module.exports = {
  db,
  initialize,
};
