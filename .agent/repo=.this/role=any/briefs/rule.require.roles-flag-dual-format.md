# rule.require.roles-flag-dual-format

## .what

every `--roles` option in this repo MUST accept both sigil forms, parsed by the ONE shared
parser:

- space form: `--roles +architect -reviewer` (or, for a single-string option, quoted:
  `--roles "+architect -reviewer"`)
- comma form: `--roles +architect,-reviewer`

both forms MUST collapse to the identical token list and flow through the same grammar. no
command may hand-roll its own `--roles` parse.

## .why

`--roles` diverged once already and it cost a production regression: `init` parsed the
`+role`/`-role` sigils (with a null-byte argv sentinel to survive commander's variadic
drop) while `enroll` parsed a different single-string grammar and never decoded the
sentinel. the result — `rhx enroll claude --roles -driver` threw
`role '\u0000driver' not found` instead of a drop of the driver role.

one flag, two grammars, is the hazard. a single shared parser makes the two forms
interchangeable and the null-byte impossible to leak, on every command present and future.

## .the shared parser

| piece | role |
|-------|------|
| `getCommandFromArgv` | finds the subcommand in the raw argv (past a global `-c/--config <path>`) so the encode can be command-aware |
| `getPreprocessedRoleArgv` (`invoke.ts` entry) | encodes a lead-`-` token to the sentinel so commander's variadic keeps it — ONLY for the `--roles` delta commands (see the `-r` trap below) |
| `getRoleDeltaTokens` | the one tokenizer: decodes the sentinel, splits on comma AND whitespace, trims, drops empties |
| `getRoleDeltas` | the one grammar: parses tokens into a `RoleDelta[]` — kind `absolute` (replace the whole set) or `addition`/`subtraction` (+add / -remove), with dedupe + contradiction + mixed-call checks |
| `RoleDelta` | the one dobj every consumer shares: `{ kind: addition \| subtraction \| absolute, role }`. derive mode via `getRoleDeltaMode`, per-kind slugs via `getRoleDeltasOfKind` |

## .the `-r` short-alias trap

`getPreprocessedRoleArgv` runs on the GLOBAL argv, before commander knows the command. so it
MUST be command-aware, because the `-r` short flag is overloaded:

| command | `-r` is | `--roles`? |
|---------|---------|-----------|
| `enroll` | `--roles` (the delta spec) | yes |
| `init`, `upgrade` | (no `-r`) | yes, long form only |
| `act`, `ask`, `run` | `--role` (a single-value role filter) | no |

if the encoder read `-r` as `--roles` on EVERY command, then `rhx act -r mechanic -s
say-hello` would open a bogus roles value-run at `-r` and rewrite the later `-s` into a
`\u0000s` null byte — a break of act/ask/run's own short flags. that is the exact
"global argv side-effect corrupts a peer command" hazard this whole brief exists to close,
just pointed at a different command.

the fix: `getPreprocessedRoleArgv` gates on `getCommandFromArgv` and encodes ONLY when the
command is one of the `--roles` delta commands (`init`, `enroll`, `upgrade`). every other
command's argv passes through untouched, so `-r` keeps its `--role` sense there.

**rule:** the encode is command-scoped. never widen the sentinel encode to fire on a bare
`-r` for all commands — scope it to the `--roles` delta commands, or the null byte leaks
into a peer command's short flags.

**tokenize is universal; classify is for the sigil grammar.** every `--roles` consumer MUST
tokenize via `getRoleDeltaTokens` — that is the step that decodes the sentinel and accepts
both forms, and to skip it re-opens the null-byte bug. a command that uses the `+role` /
`-role` add-remove grammar (init, enroll) then parses via `getRoleDeltas` into the shared
`RoleDelta[]` and consumes it directly (e.g. enroll pairs the deltas with their mode via
`getRoleDeltaMode` into a `BrainCliEnrollmentSpec`). a command that uses `--roles` as a
plain specifier list, NOT the
sigil grammar (upgrade: `--roles *` = all installed), tokenizes but does not classify. no
command may re-implement the tokenize or classify steps.

## .where

- any CLI command that declares a `--roles` option (today: `init`, `enroll`, `upgrade`)
- applies whether the option is variadic (`<roles...>`) or single-string (`<spec>`)

## .the rule

| you are... | required |
|------------|----------|
| you add a `--roles` option to a command | flatten via `getRoleDeltaTokens` (always); classify via `getRoleDeltas` if it uses the `+`/`-` sigil grammar |
| tempted to `.split(',')` or `.split(' ')` the roles yourself | STOP — use the shared tokenizer |
| tempted to read `--roles` without a sentinel decode | STOP — `getRoleDeltaTokens` decodes; to skip it re-opens the null-byte bug |

## .enforcement

- a `--roles` consumer that does not tokenize via `getRoleDeltaTokens` = blocker
- a `--roles` consumer that supports only one of the two forms = blocker
- a `--roles` consumer that reads the raw option value without a sentinel decode = blocker
- a sentinel encode that fires on `-r` for a non-delta command (act/ask/run) = blocker

## .tests

the contract is clamped by:

- `getRoleDeltaTokens.test.ts` — both forms collapse to the same token list; sentinel always decodes
- `getCommandFromArgv.test.ts` — the command lookup, incl. past a global `-c/--config <path>`
- `getPreprocessedRoleArgv.test.ts` — the encode is command-scoped: enroll `-r -driver` encodes, but act/ask/run `-r … -s` stay intact (no null byte)
- `blackbox/cli/enroll.acceptance.test.ts` — enroll decodes end-to-end, both forms, no null byte
- `blackbox/cli/init.incremental.acceptance.test.ts` — init proven in both space and comma forms
- `blackbox/cli/upgrade.acceptance.test.ts` — upgrade decodes a lead-dash `--roles` token, no null byte
- `blackbox/cli/act.acceptance.test.ts` — `act -r any -s say-hello` short flags parse identically to the long form (the `-r` trap clamp)
