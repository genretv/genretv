# Full Season History And Schedule Projection

genretv will persist a Season row for every known numbered Season and a separate row for each Extra Release, while the public Schedule View projects only schedule-relevant rows. Renewal and multi-season orders create future Season rows rather than adding renewal state to the preceding Season; Show termination belongs to Show Lifecycle Status. This increases the small local dataset but removes inferred season counts, combined labels such as `S2 + special`, and stale placement logic that tried to make one Season row represent both a completed release and its successor.

Historical Seasons remain available to management, publishing, and imports without appearing in the public schedule. Every persisted Show has at least one Season, but creating the Show and initial Season requires only ordinary local pgxsinkit mutations; no server-side transactional protocol is required.
