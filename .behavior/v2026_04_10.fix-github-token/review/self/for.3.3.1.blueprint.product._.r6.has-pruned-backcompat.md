# self-review r6: has-pruned-backcompat

## purpose

review for backwards compatibility that was not explicitly requested. eliminate speculative backcompat.

---

## backcompat concern 1: nullable mech type widens API

**the change:**
`mech: KeyrackGrantMechanism` → `mech: KeyrackGrantMechanism | null`

**backcompat implication:**
code that reads `keySpec.mech` and assumes non-null will get type errors.

**was backcompat requested?**
no — the vision doesn't mention preserving non-null mech behavior. the change is intentional.

**analysis:**
this is type widening, which is the safe direction:
- callers that pass `mech` values still work (supertype accepts subtype)
- callers that read `mech` and require non-null get compile errors (good — forces update)

TypeScript catches issues at compile time. no runtime backcompat shim needed.

**verdict:** no backcompat needed. type widening is safe; compile errors are intentional.

---

## backcompat concern 2: fill no longer defaults to PERMANENT_VIA_REPLICA

**the change:**
hydration set `mech: 'PERMANENT_VIA_REPLICA'`; now sets `mech: null`.

**backcompat implication:**
users who expected fill to auto-select static secret now see a prompt.

**was backcompat requested?**
no — the vision explicitly wants this behavior change. the whole point is to prompt.

**analysis:**
vision states: "fill just works now — i don't have to detour through set for ephemeral credentials."

the old behavior (auto-select PERMANENT_VIA_REPLICA) was the bug. the new behavior (prompt) is the fix. to preserve old behavior would defeat the purpose.

**could we add a flag to restore old behavior?**
we could add `--mech PERMANENT_VIA_REPLICA` to fill. but:
1. vision doesn't request this
2. set already supports `--mech` — fill could too, but that's scope creep
3. users who want static secret can just choose it in the prompt

**verdict:** no backcompat needed. old behavior was the defect.

---

## backcompat concern 3: tilde expansion changes path resolution

**the change:**
`~/.ssh/my.pem` now resolves to `/home/user/.ssh/my.pem` instead of literal `~/.ssh/my.pem`.

**backcompat implication:**
users who have a literal `~` directory would break. (is this real?)

**analysis:**
no sane user has a directory literally named `~`. the POSIX convention is that `~` means home directory. Node.js just doesn't expand it automatically.

the old behavior (ENOENT for `~/` paths) was the bug. the new behavior (expansion) is the fix.

**could a user have literal `~` directory?**
technically yes: `mkdir '~'` creates a directory named `~`. but:
1. this is pathological — no one does this for ssh keys
2. the old behavior failed anyway (ENOENT)
3. the regex protects `~user` (no expansion for usernames)

**verdict:** no backcompat needed. old behavior was a bug.

---

## backcompat concern 4: extant tests

**the change:**
tests pass with null mech because they don't assert mech value.

**backcompat implication:**
none — tests still pass.

**analysis:**
if tests had asserted `mech === 'PERMANENT_VIA_REPLICA'`, they'd fail. but they don't. research verified this.

no test backcompat shim needed.

**verdict:** no backcompat needed. tests don't assert mech.

---

## did we add backcompat "to be safe"?

| potential backcompat | added? | why not |
|---------------------|--------|---------|
| `--legacy-mech` flag | no | old behavior was the defect |
| `getMechOrDefault()` wrapper | no | null is the new intended value |
| deprecation warning | no | not a public API change |
| migration procedure | no | no persisted data to migrate |
| feature flag | no | instant rollout is fine |

no speculative backcompat added.

---

## project guidance: zero backcompat

project memory states: "never add backwards compatibility shims, migration logic, or legacy support — delete old patterns completely."

the cost of backcompat:
- code bloat
- maintenance burden
- hides that a break happened
- delays the pain instead of cuts it

this blueprint follows zero-backcompat:
- no `--legacy-mech` flag
- no `getMechOrDefault()` wrapper
- no deprecation period
- no migration procedure
- just: remove the hardcoded value

---

## why each concern holds without backcompat

### concern 1 holds: nullable mech

**why no wrapper?**
a wrapper like `getMechOrDefault()` would hide the null case. but the null IS the intent — vault adapter should see null and prompt. a wrapper would reimpose the old default, defeating the fix.

**TypeScript is the migration path:**
compile errors force callers to handle null. this is better than a runtime wrapper because issues surface at build time, not in production.

### concern 2 holds: no auto-select in fill

**why no flag?**
a `--mech` flag on fill would be scope creep. the vision doesn't ask for it. users who want static secret can choose "1. PERMANENT_VIA_REPLICA" in the prompt — one extra keystroke.

**the "extra prompt" cost is acceptable:**
vision says: "same behavior as set (consistency > convenience)". the one-time prompt is consistent with set. no flag needed.

### concern 3 holds: tilde expansion

**why no literal `~` protection?**
the old behavior was ENOENT. there's no working state to preserve. users who have literal `~` directories for ssh keys are pathological — we don't accommodate them.

### concern 4 holds: extant tests

**why no assertions added?**
if tests don't assert mech, they don't care about mech. to add mech assertions would be scope creep — "testing for completeness" rather than "testing behavior change".

---

## conclusion

**no backcompat concerns require action.**

project guidance is zero-backcompat. this blueprint follows it:
- all changes are intentional behavior changes
- old behaviors were bugs, not features to preserve
- no shims, wrappers, flags, or migration paths

the fix is clean: remove the hardcode, let null flow through, let vault prompt.
