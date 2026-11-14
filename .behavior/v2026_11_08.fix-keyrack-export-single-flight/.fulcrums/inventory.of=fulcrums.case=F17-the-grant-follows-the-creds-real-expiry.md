# F17 — an aws.config grant follows the creds' real expiry, in either form the cli prints

- **fork** — keep the creds' expiry as the cli names it, in the `…+HH:MM` form the real cli prints;
  or keep the flat 55 min that form fell to on main, where only the strict `…Z` form passed
  `isIsoTimeStamp`
- **taken** — the real expiry. on main the mock cli prints `…Z`, and its unlocks already grant to the
  creds' own life (`[case19]` snap: `expires in: 540m`, unchanged by this branch). the 55 min came only
  from the fallback the real cli's form tripped, so the cast makes the two forms agree. a warm read
  now serves an entry with 15 min to the creds' full life left, and `computeExpiresAt` clamps the grant
  to that
- **the change a human sees** — with the real cli, a grant is no longer always 55 min: it is the
  creds' time left (≥ 15 min on a warm read, up to the session's length). a grant shorter than 55 min
  happens only when the creds themselves expire sooner; a `keyrack get` after the creds expire would
  have handed out a profile whose creds the sdk must refresh anyway
- **clamp** — acceptance `[case21][t3]`: a 20 min `+HH:MM` expiry yields `expires in: (19|20)m`; with
  the `+HH:MM` form sent to the fallback it reads `expires in: 55m` (red), restored green
- **rework** — clean. one line in `asAwsProfileExportExpiresAt` (or a floor in the vault's `get`)
- **confidence 75%, low because** — `get` hands out the profile name, not the creds, so a grant past
  the creds' life costs naught, and the wisher may prefer the longer flat grant
- **verdict** — unresolved, for the wisher
