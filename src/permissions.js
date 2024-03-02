const Permission = {
    Upload: 1n << 0n,
    IncludeIndex: 1n << 1n,
    ConvertGIFImage: 1n << 2n,
    ConvertGIFVideo: 1n << 3n,
    NoCompression: 1n << 4n,
    DeleteFileInIndex: 1n << 5n,
    CreateInvite: 1n << 6n,
}

function hasPermission(permissions, permission) {
    return (BigInt(permissions) & BigInt(permission)) === BigInt(permission);
}

module.exports = {
    Permission,
    hasPermission,
}
