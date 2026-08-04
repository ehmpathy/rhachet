/**
 * .what = mask the volatile fields a keyrack grant renders into CLI stdout — a minted github-app
 *         installation token → <token>, and any expiry render (relative "expires in: Nm" or a raw
 *         iso timestamp) → __TIMESTAMP__ — so a journey/acceptance snapshot is stable across runs
 * .why = several journey checkpoints emit values that drift run-to-run: the github-app minted
 *        installation token (fresh each mint) and every expiresAt (a live clock). a raw snapshot of
 *        those would flake or, worse, falsely pass on a stale value. this is the SINGLE determinism
 *        point for every journey/acceptance snapshot — a regex miss here silently flakes or falsely
 *        passes downstream, so it earns its own unit (c38). the reference-mech value (the seeded
 *        emulator SecureString) is NOT volatile and is deliberately left verbatim — that determinism
 *        is the whole point of a seeded emulator (only the minted/clock fields are masked)
 * .note = the clock masks use __TIMESTAMP__, the SAME token asSnapshotSafe stamps on createdAt/
 *         updatedAt, so every keyrack snapshot file (grant renders AND json metadata) reads one
 *         uniform placeholder for a masked-time field. the token mask stays <token> — a minted
 *         credential is not a timestamp, so it keeps its own distinct placeholder
 */
export const maskKeyrackGrantVolatiles = (input: { stdout: string }): string =>
  input.stdout
    // a minted github-app installation token: `ghs_` + base62. the fresh token each mint is the
    // volatile the c8/[case2] get-after-unlock checkpoint serves — never the app master key
    .replace(/ghs_[A-Za-z0-9]+/g, '<token>')
    // the relative expiry render `expires in: 55m` — the minute count counts down run-to-run, so
    // mask the whole `Nm` (an absent expiry renders `never`, which is stable and left untouched)
    .replace(/expires in: \d+m/g, 'expires in: __TIMESTAMP__')
    // a raw iso-8601 timestamp (e.g. an expiresAt in `--json` robot output) — masked so a
    // structured-output checkpoint is stable too
    .replace(
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?/g,
      '__TIMESTAMP__',
    );
