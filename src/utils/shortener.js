const shared = require("../../shared");

const { randomString } = require(shared.files.sharedUtils);

function isValidUrl(str) {
  const pattern = /^(http|https):\/\/[\w\-]+(\.[\w\-]+)+([\w\-\.,@?^=%&:/~\+#]*[\w\-\@?^=%&/~\+#])?$/;
  return pattern.test(str) && !str.includes(`://${shared.config.shortener.host}`);
}

function isValidShortCode(str) {
  const pattern = /^[a-zA-Z0-9_-]{1,}$/;
  return pattern.test(str);
}

async function isKeyUnique(db, key) {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM urls WHERE key = ?", [key], (err, row) => {
      if (err) {
        reject(err);
      }
      resolve(row === undefined);
    });
  });
}

async function generateRandomKey() {
  const { db } = require(shared.files.database);
  const maxTries = 5;
  let count = 0;
  let keyLength = 6;

  let key = randomString(keyLength);
  while (!(await isKeyUnique(db, key))) {
    if (count > maxTries) {
      keyLength++;
      count = 0;
    }
    key = randomString(keyLength);
    count++;
  }

  return key;
}

module.exports = {
  isValidUrl,
  isValidShortCode,
  generateRandomKey,
};