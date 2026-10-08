/**
 * Helper tanggal sesuai timezone Asia/Jakarta (WIB - UTC+7)
 */
export function getJakartaDate(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date()); // Format: "YYYY-MM-DD"
}
