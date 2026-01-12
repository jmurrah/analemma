import { APP_TIME_ZONE, TIME_LOCALE } from "@/constants/time";

const isValidDate = (value: Date | null): value is Date =>
  value instanceof Date && !Number.isNaN(value.getTime());

export const formatSunset = (date: Date | null): string => {
  if (!isValidDate(date)) return "Unavailable";
  return new Intl.DateTimeFormat(TIME_LOCALE, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: APP_TIME_ZONE,
  }).format(date);
};

export const formatSunsetDate = (date: Date | null): string => {
  if (!isValidDate(date)) return "Unavailable";
  return new Intl.DateTimeFormat(TIME_LOCALE, {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    timeZone: APP_TIME_ZONE,
  }).format(date);
};

export const formatCountdownCompact = (
  target: Date | null,
  now: Date,
): string => {
  if (!isValidDate(target)) {
    return "--:--:--";
  }

  const diffMs = target.getTime() - now.getTime();
  const remainingMs = Math.max(diffMs, 0);
  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(" ");
};
