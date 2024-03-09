const shared = require("../../shared");
const express = require("express");
const router = express.Router();
const { isNotFromShortener, isAuthenticated, isAdminOrHigher } = require(shared.files.middlewares);
const { getUserPermissions, getPermissionNames, hasHigherPermission } = require(shared.files.permissions);
const { formatFileSize } = require(shared.files.files);

router.path = "/admin";

router.get("/", isNotFromShortener, isAuthenticated, isAdminOrHigher, async (req, res, next) => {
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
      user.isHigher = user.id === userId ? false : !hasHigherPermission(modifierUser.permissions, user.permissions);
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
        ORDER by s.owner, u.id DESC
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

    const invites = await new Promise((resolve, reject) => {
      db.all(`
        SELECT i.id, i.createdBy, i.invite, i.usedBy, u.userName, u2.userName AS usedByUserName
        FROM invites AS i
        JOIN users u ON i.createdBy = u.id
        LEFT JOIN users u2 ON i.usedBy = u2.id
        JOIN (
          SELECT createdBy, COUNT(*) as invite_count
          FROM invites
          GROUP BY createdBy
        ) AS subquery ON i.createdBy = subquery.createdBy
        WHERE subquery.invite_count > 0
        ORDER by i.createdBy, i.id DESC
      `,
       (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const invites = {};
          rows.forEach(inviteRow => {
            const { id, createdBy, invite, usedBy, userName, usedByUserName } = inviteRow;
            if (!invites[createdBy]) {
              invites[createdBy] = {
                userName: userName,
                invites: {}
              };
            }
            invites[createdBy].invites[id] = {
              invite: invite,
              usedBy: usedBy,
              usedByUserName: usedByUserName
            };
          });
          resolve(invites);
        }
       });
    });

    const permissionList = getPermissionNames();

    res.render("admin/index", { userName: req.session.username, permissionList, users, userId, files, urls, shortenerBaseUrl: shared.config.shortener.baseUrl, invites });
  } catch (err) {
    next(err);
  }
});

router.get("/users/:id", isNotFromShortener, isAuthenticated, isAdminOrHigher, async (req, res, next) => {
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

    if (!targetUser) {
      const err = new Error("User not found");
      err.status = 404;
      throw err;
    }
    
    if (Number(req.params.id) !== userId && !hasHigherPermission(modifierUser.permissions, targetUser.permissions)) {
      const err = new Error("You can't edit this");
      err.status = 403;
      throw err;
    }

    targetUser.permissionList = getUserPermissions(targetUser.permissions);

    res.render("admin/user/index", {userName: req.session.username, targetUser, userId});
  } catch (err) {
    next(err);
  }
});

module.exports = router;
