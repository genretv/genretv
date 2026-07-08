import seedJson from "../../seeds/canonical-registry.seed.json";
import { buildScheduleFromRegistrySeed, type CanonicalRegistrySeed } from "./schedule";

export const canonicalSchedule = buildScheduleFromRegistrySeed(seedJson as unknown as CanonicalRegistrySeed);
