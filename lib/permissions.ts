const Permission = {
  Upload: 1n << 0n,
  IncludeIndex: 1n << 1n,
  ConvertGIFImage: 1n << 2n,
  ConvertGIFVideo: 1n << 3n,
  NoCompression: 1n << 4n,
  Reserved: 1n << 5n,
  CreateInvite: 1n << 6n,
  Admin: 1n << 7n,
  Owner: 1n << 8n,
}

export async function isAdmin(permissions: bigint) {
  return permissions >= Permission.Admin;
}
