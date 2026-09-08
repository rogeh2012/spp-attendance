export const TZ = "Africa/Cairo";

/** Today's date in Cairo as YYYY-MM-DD, regardless of the phone's timezone. */
export function cairoToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function cairoTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(new Date(iso));
}

export function cairoDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(new Date(iso));
}

export function prettyDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short", day: "numeric", month: "short", timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** 0 = Sunday … 5 = Friday, 6 = Saturday, in Cairo. */
export function cairoWeekday(): number {
  const w = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(new Date());
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(w);
}

/** Friday has one session, Saturday has two. Other days show both (for testing). */
export function sessionsForToday(): (1 | 2)[] {
  return cairoWeekday() === 5 ? [1] : [1, 2];
}
