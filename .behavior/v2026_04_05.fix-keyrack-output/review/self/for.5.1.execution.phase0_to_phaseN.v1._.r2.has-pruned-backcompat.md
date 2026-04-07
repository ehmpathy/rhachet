# self-review: has-pruned-backcompat

## the question

review for backwards compatibility that was not explicitly requested.

for each backwards-compat concern in the code, ask:
- did the wisher explicitly say to maintain this compatibility?
- is there evidence this backwards compat is needed?
- or did we assume it "to be safe"?

## the review

### analysis: what backwards compat could apply?

this feature adds NEW functionality:
1. `keyrack get --output <mode>` — new option
2. `keyrack get --value` — new alias
3. `keyrack source` — new command

### backwards compat check: keyrack get --output

**code location:** `src/contract/cli/invokeKeyrack.ts:347-351, 365-367`

**prior behavior before change:**
- `keyrack get` with no output flag → outputs vibes (treestruct)
- `keyrack get --json` → outputs JSON

**behavior after change:**
- `keyrack get` with no flags → `outputMode = vibes` — **unchanged**
- `keyrack get --json` → `outputMode = json` — **unchanged**
- `keyrack get --output vibes` → `outputMode = vibes` — **new, additive**
- `keyrack get --output json` → `outputMode = json` — **new, additive**
- `keyrack get --output value` → `outputMode = value` — **new, additive**
- `keyrack get --value` → `outputMode = value` — **new, additive**

**why it holds:** the default case `(opts.output ?? (opts.json ? 'json' : 'vibes'))` preserves:
- no flags → vibes (the `??` fallback)
- `--json` → json (the ternary condition)

no backwards compat shim was added. the new option extends behavior without alteration to defaults.

### backwards compat check: keyrack source

**prior behavior before change:** command did not exist

**behavior after change:** new command added

**conclusion:** no backwards compat concern. purely additive.

### backwards compat check: asShellEscapedSecret

**code location:** `src/domain.operations/keyrack/cli/asShellEscapedSecret.ts`

**concern:** could the shell escape format break extant callers?

**analysis:** this is a new transformer. it is only called by:
1. `--value` output mode (new)
2. `source` command (new)

no extant code calls this transformer because it did not exist before.

**why it holds:** purely additive. no extant callers.

## found concerns

none. I reviewed each code path:
- `--output` option does not alter default behavior (vibes)
- `--json` shorthand still works via the ternary condition
- `source` is a new command with no prior behavior to preserve
- `asShellEscapedSecret` is a new transformer with no prior callers

## conclusion

**backwards compat check: PASS**

no backwards compatibility shims were added. all changes are purely additive:
- new `--output` option extends behavior without alteration to defaults
- new `--value` alias is additive
- new `source` command is additive
- no extant behavior was modified
- default output mode preserved via `opts.output ?? (opts.json ? 'json' : 'vibes')`
