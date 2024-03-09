const shared = require("../../shared");
const express = require("express");
const router = express.Router();
const { isAuthenticated, isAdminOrHigher } = require(shared.files.middlewares);
const { getUserPermissions, getPermissionNames, hasHigherPermission } = require(shared.files.permissions);
const { formatFileSize } = require(shared.files.files);

router.path = "/admin";

router.get("/", isAuthenticated, isAdminOrHigher, async (req, res, next) => {
  try {
    const { db } = require(shared.files.database);

    const userId = req.session.userId;

    const modifierUser = await new Promise((resolve, reject) => {
      db.get("SELECT permissions FROM users WHERE id = ?",
          [userId],
          (err, row) => err ? reject(err) : resolve(row)
      );
    });

    const users = await new Promise((resolve, reject) => {
      db.all("SELECT id, userName, permissions FROM users LIMIT 35",
        (err, rows) => err ? reject(err) : resolve(rows)
      );
    });

    users.forEach(user => {
      user.permissionList = getUserPermissions(user.permissions);
      user.isHigher = !hasHigherPermission(modifierUser.permissions, user.permissions);
    });

    const files = await new Promise((resolve, reject) => {
      db.all(`
        SELECT u.userName, f.owner AS userId, f.fileName, f.displayName, f.fileSize, f.md5, f.mimeType 
        FROM files f
        JOIN users u ON f.owner = u.id
        JOIN (
          SELECT owner, COUNT(*) as file_count
          FROM files
          GROUP BY owner
          LIMIT 7
        ) AS subquery ON f.owner = subquery.owner
        WHERE subquery.file_count > 0
        ORDER BY f.owner, f.id DESC
        LIMIT 7 * 5
      `,
        (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const files = {};
          rows.forEach(fileRow => {
            const { userId, userName, fileName, displayName, fileSize, md5, mimeType } = fileRow;
            if (!files[userId]) {
              files[userId] = {
                userName: userName,
                  files: {}
              };
            }
            files[userId].files[fileName] = {
              displayName: displayName,
              fileSize: formatFileSize(fileSize),
              md5: md5,
              mimeType: mimeType
            };
          });
          resolve(files);
        }
      });
    });

    const urls = await new Promise((resolve, reject) => {
      db.all(`
        SELECT us.userName, u.id, u.key, u.url, s.visitCount, s.maxVisitCount, s.owner AS userId
        FROM urls AS u
        JOIN urlStats s ON u.id = s.id
        JOIN users us ON s.owner = us.id
        JOIN (
          SELECT owner, COUNT(*) as url_count
          FROM urlStats
          GROUP BY owner
          LIMIT 7
        ) AS subquery ON s.owner = subquery.owner
        WHERE subquery.url_count > 0
        LIMIT 7 * 5
      `,
        (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const urls = {};
          rows.forEach(urlRow => {
            const { userName, userId, id, key, url, visitCount, maxVisitCount } = urlRow;
            if (!urls[userId]) {
              urls[userId] = {
                userName: userName,
                urls: {}
              };
            }
            urls[userId].urls[id] = {
              key: key,
              url: url,
              visitCount: visitCount,
              maxVisitCount: maxVisitCount
            };
          });
          resolve(urls);
        }
      });
    });

    const permissionList = getPermissionNames();

    res.render("admin/index", { userName: req.session.username, permissionList, users, userId, files, urls, shortenerBaseUrl: shared.config.shortener.baseUrl });
  } catch (err) {
    next(err);
  }
});

router.get("/users/:id", isAuthenticated, isAdminOrHigher, async (req, res, next) => {
  try {
    const {db} = require(shared.files.database);

    const userId = req.session.userId;

    const modifierUser = await new Promise((resolve, reject) => {
      db.get("SELECT permissions FROM users WHERE id = ?",
        [userId],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });

    const targetUser = await new Promise((resolve, reject) => {
      db.get("SELECT id, userName, permissions FROM users WHERE id = ?",
        [req.params.id],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });
    
    if (Number(req.params.id) === userId || !hasHigherPermission(modifierUser.permissions, targetUser.permissions)) {
      const err = new Error("You can't edit this");
      err.status = 403;
      throw err;
    }

    if (!targetUser) {
      const err = new Error("User not found");
      err.status = 404;
      throw err;
    }

    targetUser.permissionList = getUserPermissions(targetUser.permissions);

    res.render("admin/user/index", {userName: req.session.username, targetUser, userId});
  } catch (err) {
    next(err);
  }
});

module.exports = router;
