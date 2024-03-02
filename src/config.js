module.exports = {
  port: 6975,
  site: "NexTool",
  siteUrl: "https://tools.slhn.cz",
  dbPath: "app.db",
  sessionDbPath: "sessions.db",
  upload: {
    maximumFileSize: 67108864,
    maximumVideoConvertSize: 25165824,
    maximumVideoConvertTime: 15,
    downloadLen: 128,
    displayLen: 128,
  },
  shortener: {
    maximumUrlLen: 1024,
    maximumCustomUrlLen: 32,
    baseUrl: "https://xdd.moe/",
    host: "xdd.moe",
  },
  user: {
    userNameLen: 32,
    passwordLen: 64,
    inviteCodeLen: 32,
  }
};
