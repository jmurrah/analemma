const partsToDate = (parts: Intl.DateTimeFormatPart[]): Date => {
  const lookup = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const y = Number(lookup.year);
  const m = Number(lookup.month) - 1;
  const d = Number(lookup.day);
  const h = Number(lookup.hour);
  const min = Number(lookup.minute);
  const s = Number(lookup.second);
  return new Date(Date.UTC(y, m, d, h, min, s));
};

export const defaultWindowET = (): { start: Date; end: Date } => {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const now = new Date();
  const current = partsToDate(fmt.formatToParts(now));
  const end = new Date(
    Date.UTC(
      current.getUTCFullYear(),
      current.getUTCMonth(),
      current.getUTCDate(),
      current.getUTCHours(),
      current.getUTCMinutes(),
      current.getUTCSeconds(),
    ),
  );
  const start = new Date(end.getTime() - 30 * 60 * 1000);
  return { start, end };
};
