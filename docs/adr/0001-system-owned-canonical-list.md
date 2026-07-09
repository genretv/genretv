# System-Owned Canonical List

genretv will model the default public schedule as a system-owned Canonical List rather than as a special Supabase auth user. This keeps authentication and RLS focused on real people while still allowing trusted maintainers to edit the baseline schedule and allowing new users to start from it through Personal List overlays.
