/** £80 or -£80.50: whole pounds drop the pence. */
export function formatMoney(value: number): string {
  const abs = Math.abs(value);
  const amount = Number.isInteger(abs) ? String(abs) : abs.toFixed(2);
  return `${value < 0 ? "-" : ""}£${amount}`;
}

/** "2026-11-27" becomes "27 Nov". Read as UTC so the day can't shift with the viewer's time zone. */
export function formatDay(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
