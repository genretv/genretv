-- Custom SQL migration file, put your code below! --
-- GRANT/REVOKE is not represented as a Drizzle schema object in drizzle-orm 1.0.0-rc.4.
-- The canonical tables are readonly public data, guarded by Drizzle-authored SELECT RLS policies.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON TABLE public.canonical_show TO anon, authenticated, service_role;
GRANT SELECT ON TABLE public.canonical_season TO anon, authenticated, service_role;
GRANT SELECT ON TABLE public.canonical_episode TO anon, authenticated, service_role;
