module.exports = {
  port: 6975,
  dbPath: "app.db",
  sessionDbPath: "sessions.db",
  upload: {
    maximumFileSize: 67108864,
    downloadLen: 128,
    displayLen: 128,
  },
  user: {
    userNameLen: 32,
    passwordLen: 128,
    inviteCodeLen: 32,
  }
};
