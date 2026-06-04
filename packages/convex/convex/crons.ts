import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "purge expired habit deletions",
  { hourUTC: 3, minuteUTC: 0 },
  internal.habits.purgeExpired,
);

export default crons;
