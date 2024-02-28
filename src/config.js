module.exports = {
  port: 6975,
  site: "NexTool",
  dbPath: "app.db",
  sessionDbPath: "sessions.db",
  upload: {
    maximumFileSize: 67108864,
    downloadLen: 128,
    displayLen: 128,
  },
  user: {
    userNameLen: 32,
    passwordLen: 64,
    inviteCodeLen: 32,
  }
};
