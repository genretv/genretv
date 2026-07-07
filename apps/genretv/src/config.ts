// GenreTV client configuration. Supabase is used for identity; domain reads and writes must go through
// pgxsinkit registry entries backed by Electric shapes / mutation handlers.

const supabaseUrl = import.meta.env["VITE_GENRETV_SUPABASE_URL"] ?? "https://localhost:54343";

const publishableKey =
  import.meta.env["VITE_GENRETV_PUBLISHABLE_KEY"] ?? "sb_publishable_genretvLOCALxxxxxxxxxxx_demo0000";

const functionsRegion = import.meta.env["VITE_GENRETV_FUNCTIONS_REGION"] ?? "";

export const genretvConfig = {
  supabaseUrl,
  publishableKey,
  functionsRegion,
  electricUrl: `${supabaseUrl}/functions/v1/genretv-sync`,
  writeUrl: `${supabaseUrl}/functions/v1/genretv-write`,
} as const;
