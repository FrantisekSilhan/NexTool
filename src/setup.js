Object.keys(shared.paths).forEach(key => {
  if (!shared.fs.existsSync(shared.paths[key])) {
    shared.fs.mkdirSync(shared.paths[key], { recursive: true });
  }
});

const db = require(shared.files.database);

db.initialize();