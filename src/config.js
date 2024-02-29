module.exports = {
  port: 6975,
  site: "NexTool",
  siteUrl: "https://tools.slhn.cz",
  dbPath: "app.db",
  sessionDbPath: "sessions.db",
  upload: {
    maximumFileSize: 67108864,
    maximumVideoConvertSize: 25165824,
    downloadLen: 128,
    displayLen: 128,
  },
  user: {
    userNameLen: 32,
    passwordLen: 64,
    inviteCodeLen: 32,
  }
};
