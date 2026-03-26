# self review (r3): has-pruned-backcompat

## stone reviewed

3.3.1.blueprint.product.v1

## review criteria

check for backwards compatibility concerns that were not explicitly requested.

---

## what backwards compat concerns exist in the blueprint?

re-read the blueprint. searched for:
- deprecation treatment
- migration paths
- old API support
- fallback behavior

---

## found: no default behavior fallback

**blueprint says**: `--roles` is required. no fallback to defaults.

**question**: was this explicitly requested? or did we assume backcompat with defaults?

**evidence**:
- 0.wish.md says: explicitly declare which roles to enroll
- 2.1.criteria.blackbox.md usecase.7 says: "when human runs `rhx enroll claude` (no --roles flag), then error is surfaced: '--roles is required'"
- 1.vision.md says: "--roles is required — no fallback to defaults"

**verdict**: correct. explicit roles required. no hidden backcompat with defaults.

---

## found: no deprecation warnings planned

**question**: should we warn about any deprecated behavior?

**analysis**:
- this is a new command (`rhx enroll`)
- it doesn't replace any extant command
- no deprecation needed

**verdict**: correct to have no deprecation. this is additive, not a replacement.

---

## found: no migration path planned

**question**: should we migrate users from some old way to new way?

**analysis**:
- there is no "old way" to do dynamic roles
- users currently cannot customize roles at boot time
- this is a new capability

**verdict**: correct to have no migration. this is a new feature.

---

## found: unique config file prevents conflict

**blueprint says**: generate `.claude/settings.enroll.$hash.json` (unique per session)

**question**: does this create backcompat concerns with extant configs?

**analysis**:
- we do NOT touch `~/.claude/settings.json` (global)
- we do NOT touch `.claude/settings.json` (repo default)
- we generate a NEW unique file per session
- we use `--bare --settings <path>` to reject all defaults

**verdict**: no backcompat concern. unique file isolates enrolled sessions from extant configs.

---

## found: passthrough args preserve brain CLI compatibility

**blueprint says**: "all unknown args pass to brain after `--settings <path>`"

**question**: does this maintain compatibility with brain CLI?

**analysis**:
- usecase.14 explicitly requires passthrough
- users can use any claude flag alongside --roles
- we don't interfere with brain CLI's own options

**verdict**: correct. passthrough is explicitly requested, not assumed backcompat.

---

## no backwards compat issues found

the blueprint:
1. requires explicit --roles — no hidden defaults to maintain
2. adds new command — no old behavior to deprecate
3. uses unique config file — no conflict with extant configs
4. passes through args — explicitly requested

---

## principles reinforced

1. **new command = no backcompat** — `rhx enroll` is additive, not a replacement
2. **unique file = isolation** — settings.enroll.$hash.json prevents conflicts
3. **explicit > implicit** — `--roles` required is cleaner than assumed defaults
4. **passthrough = compatibility** — brain CLI flags work unchanged

---

## verdict

- [x] checked for backcompat concerns
- [x] found no hidden backcompat assumptions
- [x] explicit requirements only (--roles required, passthrough requested)
- [x] unique config file prevents conflict
