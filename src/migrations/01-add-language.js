// db.run(`
// CREATE TABLE IF NOT EXISTS files (
//   id INTEGER PRIMARY KEY,
//   fileName TEXT NOT NULL UNIQUE,
//   displayName TEXT NOT NULL,
//   downloadName TEXT NOT NULL,
//   indexFile BOOLEAN NOT NULL,

//   added DATETIME DEFAULT CURRENT_TIMESTAMP,
//   fileSize INTEGER NOT NULL,
//   md5 TEXT NOT NULL,
//   mimeType TEXT NOT NULL,
// + language TEXT NULL,

//   owner INTEGER NOT NULL
// )
// `);

const migration = `
ALTER TABLE files
ADD COLUMN language TEXT NULL DEFAULT NULL;
`;

const rollback = `
PRAGMA foreign_keys=off;
BEGIN TRANSACTION;
CREATE TEMPORARY TABLE files_backup(id, fileName, displayName, downloadName, indexFile, added, fileSize, md5, mimeType, owner);
INSERT INTO files_backup SELECT id, fileName, displayName, downloadName, indexFile, added, fileSize, md5, mimeType, owner FROM files;
DROP TABLE files;
CREATE TABLE files (
  id INTEGER PRIMARY KEY,
  fileName TEXT NOT NULL UNIQUE,
  displayName TEXT NOT NULL,
  downloadName TEXT NOT NULL,
  indexFile BOOLEAN NOT NULL,
  added DATETIME DEFAULT CURRENT_TIMESTAMP,
  fileSize INTEGER NOT NULL,
  md5 TEXT NOT NULL,
  mimeType TEXT NOT NULL,
  language TEXT NULL DEFAULT NULL,
  owner INTEGER NOT NULL
);
INSERT INTO files SELECT id, fileName, displayName, downloadName, indexFile, added, fileSize, md5, mimeType, NULL, owner FROM files_backup;
DROP TABLE files_backup;
COMMIT;
PRAGMA foreign_keys=on;
`;

module.exports = {
  up: migration,
  down: rollback
};