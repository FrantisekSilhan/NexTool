export function FormatFileSize(size: number) {
  const units = ["B", "K", "M", "G", "T"];
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(0)}${units[i]}`;
}
