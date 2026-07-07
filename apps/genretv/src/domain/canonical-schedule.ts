import seedJson from "../../seeds/blogspot-canonical.seed.json";

import { buildScheduleFromSeed, type BlogspotCanonicalSeed } from "./schedule";

export const canonicalSchedule = buildScheduleFromSeed(seedJson as unknown as BlogspotCanonicalSeed);
