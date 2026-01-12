export const MONTH_NAMES = [
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

export const MONTH_NAMES_LOWERCASE = MONTH_NAMES.map((name) =>
  name.toLowerCase(),
);

export type MonthName = (typeof MONTH_NAMES)[number];
