export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const DAY_MS = 86_400_000;

export type LocalDate = { year: number; month: number; day: number };
export type LocalNow = LocalDate & { hour: number; minute: number };

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Wall-clock date and time in the given IANA timezone. */
export function zonedNow(timeZone: string, now: Date = new Date()): LocalNow {
  const tz = isValidTimeZone(timeZone) ? timeZone : "UTC";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour") % 24, minute: get("minute") };
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(month: number, year = 2024): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** The day a birthday is celebrated in a given year (Feb 29 → Feb 28 in non-leap years). */
export function observedBirthday(month: number, day: number, year: number): LocalDate {
  if (month === 2 && day === 29 && !isLeapYear(year)) return { year, month: 2, day: 28 };
  return { year, month, day };
}

export function isBirthdayOn(birthMonth: number, birthDay: number, date: LocalDate): boolean {
  const observed = observedBirthday(birthMonth, birthDay, date.year);
  return observed.month === date.month && observed.day === date.day;
}

function utcDays(d: LocalDate): number {
  return Date.UTC(d.year, d.month - 1, d.day) / DAY_MS;
}

export type UpcomingBirthday = {
  date: LocalDate;
  daysUntil: number;
  turning: number | null;
};

export function nextBirthday(
  contact: { birth_month: number; birth_day: number; birth_year: number | null },
  today: LocalDate,
): UpcomingBirthday {
  let date = observedBirthday(contact.birth_month, contact.birth_day, today.year);
  if (utcDays(date) < utcDays(today)) {
    date = observedBirthday(contact.birth_month, contact.birth_day, today.year + 1);
  }
  const turning = contact.birth_year ? date.year - contact.birth_year : null;
  return { date, daysUntil: utcDays(date) - utcDays(today), turning: turning && turning > 0 ? turning : null };
}

export function formatBirthday(month: number, day: number, year?: number | null): string {
  const base = `${MONTHS[month - 1]} ${day}`;
  return year ? `${base}, ${year}` : base;
}

export function formatShortDate(d: LocalDate): string {
  const weekday = new Date(Date.UTC(d.year, d.month - 1, d.day)).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
  return `${weekday}, ${MONTHS[d.month - 1].slice(0, 3)} ${d.day}`;
}

export function formatHour(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}:00 ${hour < 12 ? "AM" : "PM"}`;
}

export function relativeDays(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return `In ${days} days`;
  if (days < 14) return "Next week";
  if (days < 60) return `In ${Math.round(days / 7)} weeks`;
  return `In ${Math.round(days / 30)} months`;
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
