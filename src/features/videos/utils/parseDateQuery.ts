const MONTH_MAP: Record<string, string> = {
  january: "01",
  jan: "01",
  february: "02",
  feb: "02",
  march: "03",
  mar: "03",
  april: "04",
  apr: "04",
  may: "05",
  june: "06",
  jun: "06",
  july: "07",
  jul: "07",
  august: "08",
  aug: "08",
  september: "09",
  sep: "09",
  sept: "09",
  october: "10",
  oct: "10",
  november: "11",
  nov: "11",
  december: "12",
  dec: "12",
};

function padTwo(n: number | string): string {
  return String(n).padStart(2, "0");
}

function inferYearFromFilenames(
  month: string,
  day: string,
  filenames: string[],
): string | null {
  const mmdd = `${month}${day}`;
  const matchingYears: string[] = [];

  for (const filename of filenames) {
    const prefix = filename.slice(0, 8);
    if (prefix.length === 8 && prefix.slice(4, 8) === mmdd) {
      const year = prefix.slice(0, 4);
      if (!matchingYears.includes(year)) {
        matchingYears.push(year);
      }
    }
  }

  if (matchingYears.length === 0) {
    return null;
  }

  if (matchingYears.length === 1) {
    return matchingYears[0];
  }

  // Multiple years exist, pick the largest (most recent)
  return matchingYears.sort().reverse()[0];
}

/**
 * Parses a user query into a YYYYMMDD date prefix for filtering video filenames.
 *
 * Supported formats:
 * - Exact YYYYMMDD (8 digits)
 * - ISO-ish: YYYY-MM-DD or YYYY/MM/DD
 * - US numeric: M/D/YYYY or MM/DD/YYYY (with - or / separator)
 * - Month name + day: January 15, Jan 15th, 15 Jan, optionally with year
 *
 * @param query - The user's search query
 * @param filenames - Array of filenames to infer year from when not provided
 * @returns YYYYMMDD string if parseable, null otherwise
 */
export function parseQueryToYYYYMMDD(
  query: string,
  filenames: string[],
): string | null {
  const trimmed = query.trim();
  if (!trimmed) {
    return null;
  }

  // 1. Exact YYYYMMDD (8 digits)
  if (/^\d{8}$/.test(trimmed)) {
    return trimmed;
  }

  // 2. ISO-ish: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}${padTwo(month)}${padTwo(day)}`;
  }

  // 3. US numeric: M/D/YYYY or MM/DD/YYYY (with - or / separator)
  const usMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    return `${year}${padTwo(month)}${padTwo(day)}`;
  }

  // 4. Month name + day (with optional year)
  // Normalize: lowercase, remove commas, remove ordinal suffixes
  const normalized = trimmed
    .toLowerCase()
    .replace(/,/g, "")
    .replace(/(\d+)(st|nd|rd|th)/g, "$1");

  // Pattern: "January 15 2025" or "January 15" or "Jan 15th 2025"
  const monthFirstMatch = normalized.match(
    /^([a-z]+)\s+(\d{1,2})(?:\s+(\d{4}))?$/,
  );
  if (monthFirstMatch) {
    const [, monthName, dayStr, yearStr] = monthFirstMatch;
    const month = MONTH_MAP[monthName];
    if (month) {
      const day = padTwo(dayStr);
      const year = yearStr ?? inferYearFromFilenames(month, day, filenames);
      if (year) {
        return `${year}${month}${day}`;
      }
    }
    return null;
  }

  // Pattern: "15 January 2025" or "15 Jan" or "15th Jan 2025"
  const dayFirstMatch = normalized.match(
    /^(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?$/,
  );
  if (dayFirstMatch) {
    const [, dayStr, monthName, yearStr] = dayFirstMatch;
    const month = MONTH_MAP[monthName];
    if (month) {
      const day = padTwo(dayStr);
      const year = yearStr ?? inferYearFromFilenames(month, day, filenames);
      if (year) {
        return `${year}${month}${day}`;
      }
    }
    return null;
  }

  return null;
}
