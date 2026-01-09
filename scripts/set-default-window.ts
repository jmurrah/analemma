import fs from "node:fs";
import { defaultWindowET } from "@/utils/time";

const { start, end } = defaultWindowET();

console.log("Default window (last 30 minutes ET)", {
  start: start.toISOString(),
  end: end.toISOString(),
});

const startIso = start.toISOString();
const endIso = end.toISOString();
console.log(`START_ISO=${startIso}`);
console.log(`END_ISO=${endIso}`);

if (!process.env.GITHUB_ENV) {
  throw new Error("GITHUB_ENV is not set");
}

fs.appendFileSync(
  process.env.GITHUB_ENV,
  `\nSTART_ISO=${startIso}\nEND_ISO=${endIso}\n`,
);
