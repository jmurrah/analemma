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
 * Parses a user query into a date pattern for filtering video filenames.
 *
 * Supported formats:
 * - Just year: 2026 → "2026" (matches all of 2026)
 * - Just month: jan → "01" (matches all January videos across all years)
 * - Year + month: 2026 jan, jan 2026, 2026-01 → "202601"
 * - Exact YYYYMMDD (8 digits)
 * - ISO-ish: YYYY-MM-DD or YYYY/MM/DD
 * - US numeric: M/D/YYYY or MM/DD/YYYY (with - or / separator)
 * - Month name + day: January 15, Jan 15th, 15 Jan, optionally with year
 *
 * Returns a pattern that can be:
 * - 2 digits (MM): month only, matches across all years
 * - 4 digits (YYYY): year only
 * - 6 digits (YYYYMM): year + month
 * - 8 digits (YYYYMMDD): full date
 *
 * @param query - The user's search query
 * @param filenames - Array of filenames to infer year from when not provided
 * @returns Date pattern string if parseable, null otherwise
 */
export function parseQueryToYYYYMMDD(
  query: string,
  filenames: string[],
): string | null {
  const trimmed = query.trim();
  if (!trimmed) {
    return null;
  }

  // 1. Just a 4-digit year
  if (/^\d{4}$/.test(trimmed)) {
    return trimmed;
  }

  // 2. Just a 1 or 2-digit month
  if (/^\d{1,2}$/.test(trimmed)) {
    const monthNum = Number.parseInt(trimmed, 10);
    if (monthNum >= 1 && monthNum <= 12) {
      return padTwo(monthNum); // Return "01" to "12"
    }
  }

  // 3. Exact YYYYMMDD (8 digits)
  if (/^\d{8}$/.test(trimmed)) {
    return trimmed;
  }

  // 4. ISO-ish: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}${padTwo(month)}${padTwo(day)}`;
  }

  // 5. Partial ISO for year+month: YYYY-MM or YYYY/MM
  const isoMonthMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})$/);
  if (isoMonthMatch) {
    const [, year, month] = isoMonthMatch;
    return `${year}${padTwo(month)}`;
  }

  // 6. US numeric with full date: M/D/YYYY or MM/DD/YYYY (with - or / separator)
  const usMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (usMatch) {
    const [, month, day, year] = usMatch;
    return `${year}${padTwo(month)}${padTwo(day)}`;
  }

  // 7. US numeric month/day without year: M/D or MM/DD - return MMDD to match across years
  const usMonthDayMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})$/);
  if (usMonthDayMatch) {
    const [, month, day] = usMonthDayMatch;
    const monthNum = Number.parseInt(month, 10);
    const dayNum = Number.parseInt(day, 10);
    if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
      return `${padTwo(month)}${padTwo(day)}`; // Return MMDD to match across years
    }
  }

  // 8. Month name patterns
  // Normalize: lowercase, remove commas, remove ordinal suffixes
  const normalized = trimmed
    .toLowerCase()
    .replace(/,/g, "")
    .replace(/(\d+)(st|nd|rd|th)/g, "$1");

  // Pattern: Just a month name (e.g., "jan", "january") - return month only to match all years
  const justMonthMatch = normalized.match(/^([a-z]+)$/);
  if (justMonthMatch) {
    const [, monthName] = justMonthMatch;
    const month = MONTH_MAP[monthName];
    if (month) {
      return month; // Return just "01" to match all January videos
    }
  }

  // Pattern: Year + month (e.g., "2026 jan", "jan 2026")
  const yearMonthMatch = normalized.match(
    /^(?:(\d{4})\s+([a-z]+)|([a-z]+)\s+(\d{4}))$/,
  );
  if (yearMonthMatch) {
    const year = yearMonthMatch[1] || yearMonthMatch[4];
    const monthName = yearMonthMatch[2] || yearMonthMatch[3];
    const month = MONTH_MAP[monthName];
    if (month && year) {
      return `${year}${month}`;
    }
  }

  // Pattern: "January 15 2025" or "January 15" or "Jan 15th 2025"
  const monthFirstMatch = normalized.match(
    /^([a-z]+)\s+(\d{1,2})(?:\s+(\d{4}))?$/,
  );
  if (monthFirstMatch) {
    const [, monthName, dayStr, yearStr] = monthFirstMatch;
    const month = MONTH_MAP[monthName];
    if (month) {
      const day = padTwo(dayStr);
      if (yearStr) {
        return `${yearStr}${month}${day}`;
      }
      // No year provided, try to infer from existing videos
      const year = inferYearFromFilenames(month, day, filenames);
      if (year) {
        return `${year}${month}${day}`;
      }
      // Can't infer year, return MMDD to match across all years
      return `${month}${day}`;
    }
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
      if (yearStr) {
        return `${yearStr}${month}${day}`;
      }
      // No year provided, try to infer from existing videos
      const year = inferYearFromFilenames(month, day, filenames);
      if (year) {
        return `${year}${month}${day}`;
      }
      // Can't infer year, return MMDD to match across all years
      return `${month}${day}`;
    }
  }

  return null;
}
