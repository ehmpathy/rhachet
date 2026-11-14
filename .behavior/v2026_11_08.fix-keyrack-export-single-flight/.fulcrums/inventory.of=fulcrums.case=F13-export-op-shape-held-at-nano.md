# F13 — the export op's shape is held at nano: one file, its mech's home, its own notice, a per-call dir ensure

- **fork** — split `genAwsProfileExport.ts` into identity / cache / cli / transformer files, move it
  to a neutral `keyrack/aws/` home, merge its wait notice with the repo lock's, sweep stale entries
  under the lock, and skip the dir ensure on a warm read; or hold each as is
- **taken** — hold each:
  - one file: one op and its private transformers, each with a `.what`/`.why`. a piece moved out
    exactly where a second caller needed it (`delAwsProfileExport.ts`,
    `getOneAwsProfileExportCacheDir.ts`, `asAwsProfileExportCliErrorText.ts`)
  - home: the export is the aws sso mech's own act; the vault already consumes that mech dir
    (`logoutAwsSsoSession`)
  - notice: two notices, two subjects, two domains; a shared emitter couples two contracts for one
    line of text each
  - stale entries: the next export of an identity overwrites its file, and a relock drops every entry
    of the profile
  - dir ensure per call: it re-asserts 0700 on an extant dir ([case5][t0.5]); a refused dir fails
    loud with the path (collapse 11)
- **rework** — clean. each is a move or an extra call; no caller's contract changes
- **confidence 80%, low because** — the split and the stale sweep are taste a reviewer may weigh
  higher than nano
- **verdict** — unresolved, for the wisher
