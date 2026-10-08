# F70 — must every refusal in this PR unify its remedy label on `hint`?

- **raised** = 2026-10-06, at `5.3.verification`, `review.peer i001` — `ergo-snapshot-visual-blemishes` blocker.2 and nitpick.4
- **rework** = dirty
- **status** = OPEN — **no**; the bare row is fixed, the label set stays as `main` ships it
- **confidence** = **75%**

## .the fork, stated fairly

the reviewer counts five labels on the terminal remedy slot — `hint:`, `fix:`, `fix —`, `valid:`,
and one bare row — and two json keys, `hint` and `fix`, and asks for one.

| | **unify now** | **fix the bare row, keep the set** (taken) |
|---|---|---|
| what moves | every refusal render and json key in the repo, plus their snapshots | one row in `calc.tokens.sh` |
| whose surfaces | most sites predate this branch and belong to other features | this branch's own |
| the slots | treated as one | three distinct slots, each used consistently |

## .the call, and why

three of the five labels name three different slots, not one slot three ways:

| label | slot | example |
|---|---|---|
| `hint:` | one next move | `hint: rhx calc.tokens help` |
| `valid:` | the accepted set of a closed-set arg | `valid: tree or json` |
| `fix —` | a multi-rung ladder header, with one row per strategy | `fix — four strategies, cheapest first` |

the one true straggler was the bare `└─ must be a non-negative integer, e.g. --top 8` row. it is
now `└─ hint: pass a non-negative integer, e.g. --top 8`.

`fix:` (single-row) and the json `fix` key are both `main`'s convention, in surfaces this feature
does not own: the single-row `└─ fix:` closes `assertRegistryHooksNoNpx` (`git show
main:src/domain.operations/manifest/assertRegistryHooksNoNpx.ts`), and the json `fix` key sits in
the refusal metadata of `invokeKeyrack`, `getKeyrackKeyGrant`, `assureUniqueRoles`,
`getRoleBySpecifier`, `getSdkCredsFromBrainSupplies` and more (`rhx grepsafe --pattern "^\s+fix: "
--path src`). this branch's new refusals adopt that key rather than coin a second. to unify on
`hint` is a repo-wide rename of an external json key, which a consumer may read,
and which belongs to the ergonomist's open `warn · halt · heal` question
(`rhachet-roles-ehmpathy#751`), not to a boot-budget PR.

## .why the confidence is 75%

if the wisher wants one label everywhere, the call flips; the work is mechanical but touches
contracts outside this wish.

## .rework

dirty — a json key rename across refusals this feature does not own, plus every snapshot that pins
them.
