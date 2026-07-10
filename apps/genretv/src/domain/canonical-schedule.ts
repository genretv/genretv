import seedJson from "../../seeds/canonical-registry.seed.json";
import { buildScheduleFromRegistrySeed, type CanonicalRegistrySeed, type ScheduleBuildOptions } from "./schedule";

const seed = seedJson as unknown as CanonicalRegistrySeed;

export function buildCanonicalSchedule(options: ScheduleBuildOptions = {}) {
  return buildScheduleFromRegistrySeed(seed, options);
}

export const canonicalSchedule = buildCanonicalSchedule();
