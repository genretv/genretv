# Domain Data Through pgxsinkit Sync Registry

genretv domain reads and writes will go through pgxsinkit Sync Registry Entries rather than plain REST APIs. The project is intended to demonstrate pgxsinkit publicly, so even MVP workflows such as overlays, publishing, notifications, and proposal review should use the full sync/write path except for narrow non-domain exceptions such as future binary blob handling. MVP writes should use pgxsinkit's local mutation journal and convergence path where available, including offline staging rather than an artificial network-only write mode.

Supabase Auth is responsible for signup, login, password recovery, sessions, and identity. genretv-specific state after identity exists, including profiles, roles, lists, overlays, notifications, proposals, publishing, and schedule data, belongs behind pgxsinkit Sync Registry Entries.

Anonymous public reads also use pgxsinkit with Electric SQL Cloud fixed public shapes rather than static exports. Each Published Snapshot, including each published user's list, can have its own Public Fixed Shape corresponding to the underlying PostgreSQL query; Electric SQL Cloud's CDN handles caching for those anonymous reads.
