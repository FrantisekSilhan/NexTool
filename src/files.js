function generateRandomString(length) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getFileNameExtension(name, returnDot = false) {
  const index = name.lastIndexOf(".");
  if (index === -1) {
    return "";
  }
  return name.substring(index + (returnDot ? 0 : 1));
}

async function isFileNameUnique(db, name) {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM files WHERE fileName = ?", [name], (err, row) => {
      if (err) {
        reject(err);
      }
      resolve(row === undefined);
    });
  });
}

async function generateRandomFileName(db) {
  const fileNameLength = 16;
  let fileName = generateRandomString(fileNameLength);
  let unique = await isFileNameUnique(db, fileName);
  while (!unique) {
    fileName = generateRandomString(fileNameLength);
    unique = await isFileNameUnique(db, fileName);
  }
  return fileName;
}

async function generateRandomFileName(db, extension) {
  const fileNameLength = 16;
  let fileName = generateRandomString(fileNameLength) + extension;
  let unique = await isFileNameUnique(db, fileName);
  while (!unique) {
    fileName = generateRandomString(fileNameLength) + extension;
    unique = await isFileNameUnique(db, fileName);
  }
  return fileName;
}

module.exports = {
  generateRandomFileName,
  getFileNameExtension,
};