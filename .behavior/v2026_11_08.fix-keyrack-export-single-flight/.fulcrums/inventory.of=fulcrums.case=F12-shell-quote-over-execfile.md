# F12 — the export runs via `exec` with a single-quoted profile, not `execFile`

- **fork** — `execFile('aws', [...argv])` with no shell, or `exec` with the profile as one
  single-quoted shell word and `exec aws …` so the shell replaces itself with the cli
- **taken** — `exec` + single quote. inside single quotes the shell expands naught, so the injection
  class is closed (clamp: [case13], a `$(id)` and backtick profile reaches the cli literally).
  `exec aws …` keeps `.child` the cli itself, so the hang guard's SIGKILL reaches it. the unit suites
  across keyrack mock `exec` by its callback shape; a move to `execFile` re-wires every such mock in
  files this wish does not otherwise touch
- **rework** — clean. one call site; the quote helper and the `exec` prefix go; the unit mocks move
  to `execFile`
- **confidence 80%, low because** — `execFile` is the stronger construction, and the vault's own sts
  and sso-login calls still interpolate in double quotes (caught with the sts dream, F10)
- **verdict** — unresolved, for the wisher
