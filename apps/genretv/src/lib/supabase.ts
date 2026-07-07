import { createClient } from "@supabase/supabase-js";

import { genretvConfig } from "../config";

// GenreTV uses Supabase for **auth only**: GoTrue sign-in plus persisted, auto-refreshed sessions.
// Reads go through Electric (`genretv-sync`) and writes through `genretv-write`; the auto-CRUD data API
// (PostgREST) is intentionally not part of this stack, so nothing here calls `.from()`.
export const supabase = createClient(genretvConfig.supabaseUrl, genretvConfig.publishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "genretv-auth",
  },
});
