# self-review r6: has-pruned-backcompat

## review for backwards compatibility not explicitly requested

### potential backcompat concerns identified

| concern | what it preserves | explicitly requested? |
|---------|-------------------|----------------------|
| `--json` flag kept | extant `keyrack get --json` behavior | yes — vision Q&A: "same with --output json" |
| default output = vibes | extant default turtle treestruct | yes — vision Q&A: "default is --output vibes" |
| exit code 0/2 semantics | extant exit code behavior | implicit — SDK parity via wish |
| `formatKeyrackGetOneOutput.ts` reuse | extant vibes formatter | implicit — supports default vibes output |

### deep analysis: --json flag

**question:** did the wisher explicitly request to keep `--json`?

**the alternative:** what if we deleted `--json` entirely?
- users who run `keyrack get --json` would break
- they would need to change to `keyrack get --output json`
- this is a disruptive change to extant CLI behavior
- zero-backcompat principle says "just delete" if not explicitly needed

**evidence to keep:**
- vision Q&A: "--output is the full format, --value is an alias"
- vision Q&A: "same with --output json"
- the pattern: `--output value` / `--value` = `--output json` / `--json`

**analysis:**
the wish only asked for `--value`. the vision discussion explicitly addressed `--json`. the wisher said "same with --output json" which establishes that `--json` should be an alias for `--output json`, identical to `--value` as alias for `--output value`.

**verdict:** explicitly approved in vision Q&A. not speculative backcompat.

### deep analysis: default output = vibes

**question:** did the wisher explicitly request vibes as default?

**the alternative:** what if we changed the default?
- could default to `--output json` (machine-friendly)
- could default to `--output value` (minimal)
- extant users expect vibes output when no flags passed
- new default would change behavior for all extant scripts

**evidence to keep vibes as default:**
- vision Q&A: "default is --output vibes"
- wish: does not specify default behavior, but also does not ask to change it
- vibes is the extant default, least disruptive

**analysis:**
the wish asks for `--value` mode but does not ask to change the default. the vision Q&A explicitly confirmed "default is --output vibes". this preserves extant behavior with explicit approval.

**verdict:** explicitly stated in vision. not speculative backcompat.

### deep analysis: exit codes

**question:** are exit codes maintained as backcompat?

**the alternative:** what if we changed exit codes?
- could use exit 1 for all errors (common unix convention)
- could use different codes for locked vs absent vs blocked
- extant scripts may check for exit 2 specifically

**evidence to keep exit 0/2:**
- blueprint: "[○] exit code logic (0 granted, 2 not granted)" — [○] = no change
- wish: "in a way that matches the sdk"
- SDK uses exit 2 for constraint failures
- exit 2 = constraint error (user must fix), semantic standard

**analysis:**
the wish says "in a way that matches the sdk". SDK uses exit 2 for constraint errors. exit 0/2 is also the extant CLI behavior. this is not backcompat — it's SDK parity as requested.

**verdict:** extant behavior, SDK parity as requested. not speculative backcompat.

### deep analysis: formatKeyrackGetOneOutput.ts reuse

**question:** is reuse of the extant formatter a backcompat concern?

**the alternative:** what if we changed the vibes format?
- could redesign the turtle treestruct layout
- could add/remove fields from the output
- extant users may parse the vibes output (though they shouldn't)

**evidence to reuse without change:**
- blueprint: "[~] formatKeyrackGetOneOutput.ts # (no change, reuse for vibes)"
- vibes is explicitly the default (per vision)
- the format works; no reason to change it
- changing format would be scope creep

**analysis:**
the formatter produces vibes output. vibes is approved as the default. no modification was requested or needed. this is not backcompat — it's simply reuse of code that works. no shim, no fallback, no deprecated path.

**verdict:** reuse of extant code, not backcompat concern.

## issues found

none.

## why it holds

all potential backwards compatibility concerns trace to explicit approvals:

1. **--json as alias** — explicitly approved: "same with --output json"
2. **vibes as default** — explicitly stated: "default is --output vibes"
3. **exit codes** — SDK parity per wish, extant behavior preserved
4. **formatter reuse** — no modification, supports approved vibes default

no speculative backcompat was added "to be safe":
- no deprecated flags maintained without approval
- no fallback behavior for old syntax
- no shims for compatibility with previous versions

the blueprint is additive: new features (`--value`, `--output`, `source`) with explicit integration into extant patterns (`--json` as alias, vibes as default).

### zero-backcompat principle check

per feedback memory "zero-backcompat": "never add backwards compat, just delete"

does the blueprint add backcompat? no.
- `--json` already exists — we did not add it, just clarified it is an alias
- vibes output already exists — we did not add it, just confirmed it as default
- exit codes already exist — we did not add shims

the blueprint adds new capabilities without new backwards compat shims.
