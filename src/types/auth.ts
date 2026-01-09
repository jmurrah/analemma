export type Allowlist = string[];

export const parseAllowlist = (raw: string): Allowlist =>
  raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
