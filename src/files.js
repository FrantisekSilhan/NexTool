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

function formatFileSize(bytes) {
  bytes = parseInt(bytes);
  if (bytes === 0) return "0b";
  const k = 1024;
  const sizes = ["B", "K", "M", "G", "T", "P", "E", "Z", "Y"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseInt(bytes / Math.pow(k, i)) + sizes[i];
}

async function readFileLines(filePath, numLines, message = "") {
  return new Promise((resolve, reject) => {
    let lines = [];
    let lineCount = 0;

    const readStream = require("fs").createReadStream(filePath, { encoding: "utf-8" });

    readStream.on("data", (chunk) => {
      lines = lines.concat(chunk.split("\n"));
      lineCount += chunk.split("\n").length;

      if (lineCount >= numLines) {
        readStream.close();
      }
    });

    readStream.on("close", () => {
      const truncatedLines = lines.slice(0, numLines);
      if (lineCount > numLines) {
        truncatedLines.push(message);
      }
      resolve(truncatedLines.join("\n"));
    });

    readStream.on("error", (err) => {
      reject(err);
    });
  });
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

async function generateRandomFileName(db, extension = "") {
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
  formatFileSize,
  readFileLines,
};