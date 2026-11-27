# inventory.of=fulcrums

| case | title | rework | status | confidence |
|---|---|---|---|---|
| F1 | clone and tree scope inject a pinned account at spawn via `CLAUDE_CODE_OAUTH_TOKEN` | clean | open — for the commander at blueprint (S1); built last | 55% |
| F2 | `set` stores the oauth refresh token at keyrack reach = email | clean | best-guessed | 85% |
| F3 | per-brain auth knowledge lives in a brain auth adapter off the brain command table; built as one deps context, the table lands with a second brain | clean | disputed — for the council; asks wisher (q6) | 70% |
| F4 | "saved resets" = the plan's banked reset grants | clean | best-guessed, asks wisher (q2) | 75% |
| F5 | `use` with no `--scope` refuses, no default | clean | answered by `rule.require.safe-by-default` (q3); reversible | 80% |
| F6 | verification uses two seats set aside for tests, in a test keyrack env | clean | open — for the commander at blueprint (S1) | 60% |
| F7 | the keyrack host manifest write lock is a host-scope mutex inside keyrack, over a fresh read | clean | best-guessed | 85% |
| F8 | a second `set` of a held account files the new login and reports `renewed`, not `unchanged` | clean | best-guessed | 75% |
| F9 | `use` writes no plan label for the target; the prior account's block keys never carry over | clean | best-guessed | 70% |
| F10 | a void guard op keeps the `assert*` prefix (33 in the repo) | clean | disputed — for the council | 85% |
| F11 | `account/slot/` is brain auth's one boundary to keyrack; no domain op imports the contract layer | clean | disputed — for the council | 75% |
| F12 | the husky timestamp hooks are practice-stamped; their fix is reseeded upstream | clean | disputed — for the council | 90% |
| F13 | `withRepoMutex.locksDir?` follows its peer knobs `waitMs?` / `leaseMs?` | clean | settled — the knob now sits on the root-neutral `withFileMutex`, which both mutexes wrap | 90% |
| F14 | an external json guard throws a named drift with the reply's keys, not an `.assure` | clean | disputed — for the council | 80% |
| F15 | the live usage-refusal test accepts a throttle as a refusal: not `ok`, not `unreadable` | clean | best-guessed | 80% |
| F16 | the `brains auth` verb registrars load eager; each verb's action loads its graph lazy | clean | disputed — for the council | 80% |
| F17 | `use` keeps the one-holder order; a kill mid-window costs one named re-login, never a write-ahead slot mutex | dirty | disputed — for the council | 75% |
| F18 | the toolchain bump in the worktree lands as its own `chore(deps)` commit, before the feature | clean | best-guessed | 85% |
| F19 | a lapsed signed-in token is never refreshed by `get` or `use`; an idle box waits for any claude session | clean | disputed — for the council | 70% |
| F20 | a `brains auth` json error rides the repo-wide `CliErrorJson` envelope, null keys and all | clean | disputed — for the council | 80% |
| F21 | a `set` write fault retries the keyrack write; the new login never stays on disk | clean | best-guessed | 85% |
| F22 | the shipped binary has no test route to the oauth endpoints; the live set, get, use journeys wait on real seats | clean | ruled by director, 2026-11-15 — A stands (S4) | 85% |
| F23 | a contended on-disk key-lock timeout is fixed upstream, never caught by its message in `withFileMutex` | clean | best-guessed — for the council | 75% |

vision approved 2026-11-14 with F1–F5 ruled clean (S1).
