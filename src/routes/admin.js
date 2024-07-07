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
        SELECT u.id AS userId, u.userName, f.fileName, f.displayName, f.fileSize, f.md5, f.mimeType
        FROM users u
        INNER JOIN (
          SELECT *, ROW_NUMBER() OVER(PARTITION BY owner ORDER BY id DESC) AS file_rank
          FROM files
        ) f ON u.id = f.owner
        WHERE u.id IN (
          SELECT DISTINCT owner
          FROM files
        )
        AND f.file_rank <= 7
        ORDER BY u.id ASC, f.id DESC
        LIMIT 35
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
        SELECT urls.id, u.userName, urls.key, urls.url, us.visitCount, us.maxVisitCount, us.owner AS userId
        FROM users u
        INNER JOIN (
          SELECT us1.*, ROW_NUMBER() OVER(PARTITION BY owner ORDER BY us1.id DESC) AS url_rank
          FROM urlStats us1
          INNER JOIN urls ON us1.id = urls.id
        ) us ON u.id = us.owner
        INNER JOIN urls ON us.id = urls.id
        WHERE u.id IN (
          SELECT DISTINCT owner
          FROM urlStats
        )
        AND us.url_rank <= 7
        ORDER BY u.id ASC, us.id DESC
        LIMIT 35
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
        SELECT i.id, i.createdBy, i.invite, i.usedBy, u1.userName, u2.userName AS usedByUserName
        FROM (
          SELECT *, ROW_NUMBER() OVER(PARTITION BY createdBy ORDER BY id DESC) AS invite_rank
            FROM invites
        ) i
        INNER JOIN users u1 ON i.createdBy = u1.id
        LEFT JOIN users u2 ON i.usedBy = u2.id
        WHERE i.invite_rank <= 7
        ORDER BY i.createdBy ASC, i.id DESC
        LIMIT 35
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
      const err = new Error("User Not Found");
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
