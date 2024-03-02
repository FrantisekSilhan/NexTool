const shared = require("../shared");
const Permission = {
    Upload: 1n << 0n,
    IncludeIndex: 1n << 1n,
    ConvertGIFImage: 1n << 2n,
    ConvertGIFVideo: 1n << 3n,
    NoCompression: 1n << 4n,
    Reserved: 1n << 5n,
    CreateInvite: 1n << 6n,
    Admin: 1n << 7n,
}

function hasPermission(permissions, permission) {
    return (BigInt(permissions) & BigInt(permission)) === BigInt(permission);
}

function getPermissionNames() {
  return Object.keys(Permission);
}

function getUserPermissions(permissions) {
  const userPermissions = [];
  for (const permission in Permission) {
    userPermissions.push({
      name: permission,
      hasPermission: hasPermission(permissions, Permission[permission]),
    })
  }
  return userPermissions;
}

module.exports = {
  Permission,
  hasPermission,
  getUserPermissions,
  getPermissionNames,
}
