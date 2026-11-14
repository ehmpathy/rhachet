# F8 — the husky practice's hooks are fixed upstream, never patched in this tree

- **fork** — (a) patch `.husky/check.timestamps.lock.sh`, `check.secrets.sh` and `check.timestamps.sh`
  here (named args, `set -eu`, tests); (b) leave them as `declapract apply --practice husky` lays
  them, and reseed each defect to the practice
- **taken** — (b). the files are the practice's output; the next apply overwrites a local patch, and
  `check.timestamps.lock.sh` exists to halt every commit whose `check.timestamps.sh` differs from the
  practice's copy. the one hook defect that blocks this pr's own commit — a staged fixture key that
  `check.secrets.sh` refuses — is closed in this tree by a fixture rename, which the practice cannot
  overwrite. the rest reseed via `.dream/v2026_11_08.reseed.husky-practice-hooks-want-named-args-failfast-and-a-clamp.md`
- **rework** — clean. the same edits, applied upstream, land here on the next apply
- **confidence 90%, low because** — the hooks ride in this pr's diff, so a reader may expect this pr
  to own them
- **where** — `.husky/check.secrets.sh`, `.husky/check.timestamps.lock.sh`, `.husky/check.timestamps.sh`
- **verdict** — unresolved, for the wisher
