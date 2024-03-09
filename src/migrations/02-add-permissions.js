const migration = `
ALTER TABLE users
ADD COLUMN permissions INT DEFAULT 5 NOT NULL;
`;

const rollback = `
PRAGMA foreign_keys=off;
BEGIN TRANSACTION;
CREATE TEMPORARY TABLE users_backup AS SELECT * FROM users;
ALTER TABLE users
DROP COLUMN permissions;
INSERT INTO users SELECT * FROM users_backup;
DROP TABLE users_backup;
COMMIT;
PRAGMA foreign_keys=on;
`;

module.exports = {
    up: migration,
    down: rollback
};
