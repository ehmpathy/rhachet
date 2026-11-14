# F15 — `rhx keyrack relock` drops the export cache, and stays unwired to the vault relock

- **fork** — the cli relock passes a keyrack context to `relockKeyrack`, so each vault's `relock` runs;
  or the cli relock drops only keyrack's own export cache, and the vault relock stays unwired, as on
  main
- **taken** — the second. `relockKeyrack` reads each held aws.config grant's profile (its secret)
  before the purge, then drops that profile's cached exports. no context is built, so no passphrase
  prompt and no sso logout reach a cli relock. to wire the full vault relock would add both, for
  every vault and every keyrack human (`lesson.aws-sso-logout-clears-browser-session`)
- **residue** — after `rhx keyrack relock`, the aws cli's own `~/.aws/cli/cache` and the sso token in
  `~/.aws/sso/cache` rest, as on main; an export whose grant the daemon no longer holds rests until a
  relock of its profile, and is never served past its expiry
- **found by** — acceptance [case20], whose relock went red on the cli path; now clamped there at
  [t1] (red with the drop disabled, green restored), and in `relockKeyrack.test.ts` [case7]
- **rework** — clean. the full wire is one context build in the cli relock action; the dream
  `dreams/v2026_11_08.fix.keyrack-cli-relock-runs-no-vault-relock.md` holds its shape
- **confidence 80%, low because** — a human may want the sso session ended on relock too
- **verdict** — the export half closed in this pr; the vault-relock wire is for the wisher
