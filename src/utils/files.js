const shared = require("../../shared");

const { randomString } = require(shared.files.sharedUtils);

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

      if (numLines !== 0 && lineCount >= numLines) {
        readStream.close();
      }
    });

    readStream.on("end", () => {
      resolve(lines.join("\n"));
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

async function generateRandomFileName(extension = "") {
  const { db } = require(shared.files.database);
  const maxTries = 5;
  let count = 0;
  let fileNameLength = 16;

  let fileName = randomString(fileNameLength) + extension;
  while (!await isFileNameUnique(db, fileName)) {
    if (count > maxTries) {
      fileNameLength++;
      count = 0;
    }
    fileName = randomString(fileNameLength) + extension;
    count++;
  }
  return fileName;
}

module.exports = {
  generateRandomFileName,
  getFileNameExtension,
  formatFileSize,
  readFileLines,
};