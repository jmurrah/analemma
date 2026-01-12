export const extractDateFromFilename = (key: string): string => {
  const filename = key.split("/").pop() ?? key;
  const dateMatch = filename.match(/^(\d{4})(\d{2})(\d{2})/);

  if (!dateMatch) {
    return "Unknown date";
  }

  const [, year, month, day] = dateMatch;
  const date = new Date(
    Number.parseInt(year, 10),
    Number.parseInt(month, 10) - 1,
    Number.parseInt(day, 10),
  );

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};
