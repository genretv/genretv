CREATE OR REPLACE FUNCTION public.pgxsinkit_clock_us()
  RETURNS bigint
  LANGUAGE sql
  VOLATILE
AS $$
  SELECT CAST(FLOOR(EXTRACT(EPOCH FROM clock_timestamp()) * 1000000) AS BIGINT)
$$;

CREATE TABLE IF NOT EXISTS public.canonical_show (
  id uuid PRIMARY KEY,
  display_title varchar(300) NOT NULL,
  original_title varchar(300),
  languages jsonb NOT NULL DEFAULT '[]'::jsonb,
  countries jsonb NOT NULL DEFAULT '[]'::jsonb,
  genre_tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  external_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes varchar(8000),
  updated_at_us bigint NOT NULL DEFAULT public.pgxsinkit_clock_us()
);

CREATE TABLE IF NOT EXISTS public.canonical_season (
  id uuid PRIMARY KEY,
  show_id uuid NOT NULL REFERENCES public.canonical_show(id),
  section varchar(24) NOT NULL,
  season_label varchar(80) NOT NULL,
  timing varchar(400) NOT NULL DEFAULT '',
  ended_reason varchar(400) NOT NULL DEFAULT '',
  release_pattern varchar(40),
  release_precision varchar(40) NOT NULL DEFAULT 'unknown',
  date_confidence varchar(40) NOT NULL DEFAULT 'unknown',
  release_window jsonb,
  finale_window jsonb,
  sort_key varchar(40),
  episode_count integer,
  source_row integer NOT NULL,
  organizations jsonb NOT NULL DEFAULT '[]'::jsonb,
  external_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes varchar(8000),
  updated_at_us bigint NOT NULL DEFAULT public.pgxsinkit_clock_us()
);

CREATE TABLE IF NOT EXISTS public.canonical_episode (
  id uuid PRIMARY KEY,
  season_id uuid NOT NULL REFERENCES public.canonical_season(id),
  episode_label varchar(80),
  title varchar(300),
  release_window jsonb,
  sort_key varchar(40),
  external_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes varchar(8000),
  updated_at_us bigint NOT NULL DEFAULT public.pgxsinkit_clock_us()
);

ALTER TABLE public.canonical_season
  ALTER CONSTRAINT canonical_season_show_id_fkey DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE public.canonical_episode
  ALTER CONSTRAINT canonical_episode_season_id_fkey DEFERRABLE INITIALLY IMMEDIATE;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON public.canonical_show, public.canonical_season, public.canonical_episode TO anon, authenticated, service_role;

ALTER TABLE public.canonical_show ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_season ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canonical_episode ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS canonical_show_public_read ON public.canonical_show;
CREATE POLICY canonical_show_public_read ON public.canonical_show
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS canonical_season_public_read ON public.canonical_season;
CREATE POLICY canonical_season_public_read ON public.canonical_season
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS canonical_episode_public_read ON public.canonical_episode;
CREATE POLICY canonical_episode_public_read ON public.canonical_episode
  FOR SELECT TO anon, authenticated USING (true);
