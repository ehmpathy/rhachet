# self-review: has-consistent-conventions

## the question

review for divergence from extant names and patterns.

unless the ask was to refactor, be consistent with extant conventions.

for each name choice in the code, ask:
- what name conventions does the codebase use?
- do we use a different namespace, prefix, or suffix pattern?
- do we introduce new terms when extant terms exist?
- does our structure match extant patterns?

## the review

### convention check: --json option pattern

**search performed:**
```
grep "\.option\('--json" src/contract/cli/
```

**extant pattern:** `--json` appears 13 times across keyrack commands with description `'output as json (robot mode)'`

**my implementation:**
- line 346: `.option('--json', 'output as json (robot mode)')` — exact match
- line 347-350: `.option('--output <mode>', ...)` — extends pattern
- line 351: `.option('--value', 'shorthand for --output value')` — mirrors `--json` as shorthand

**why it holds:** `--json` description preserved verbatim. `--value` follows same shorthand pattern as `--json`.

### convention check: as* transformer name pattern

**search performed:**
```
grep "^export const as[A-Z]" src/
```

**extant pattern:** 11 files use `as*` prefix for transformers:
- `asKeyrackKeyEnv.ts`
- `asKeyrackKeyName.ts`
- `asKeyrackKeyOrg.ts`
- `asKeyrackKeySlug.ts`
- `asBrainOutput.ts`
- etc.

**my implementation:** `asShellEscapedSecret.ts`

**why it holds:** follows extant `as*` transformer convention exactly.

### convention check: strict/lenient mode pattern

**search performed:**
```
grep -i "(strict|lenient)" src/
```

**extant pattern in SDK:** `src/domain.operations/keyrack/sourceAllKeysIntoEnv.ts`
```ts
mode?: 'strict' | 'lenient';
// ...
const mode = input.mode ?? 'strict';
```

**my implementation:**
```ts
.option('--strict', 'fail if any key not granted (default)')
.option('--lenient', 'skip absent keys silently')
// ...
const isLenient = opts.lenient ?? false;
```

**why it holds:** CLI mirrors SDK semantics exactly:
- strict is default
- lenient skips absent keys silently
- strict fails if any not granted

### convention check: command name

**search performed:**
```
grep "\.command\('source" src/contract/cli/
```

**result:** `source` is a new command, no extant convention to follow.

**why it holds:** `source` is a shell term (like `source .env`). matches user mental model. no conflict with extant commands.

### convention check: required option pattern

**extant pattern:** `.requiredOption('--env <env>', ...)` used throughout keyrack commands

**my implementation:**
```ts
.requiredOption('--env <env>', 'target env: prod, prep, test, all')
.requiredOption('--owner <owner>', 'owner identity (required)')
```

**why it holds:** follows extant `.requiredOption()` pattern for mandatory inputs.

## found concerns

none. each name choice aligns with extant conventions:
- `--json` description preserved
- `--value` mirrors `--json` shorthand pattern
- `as*` transformer name follows codebase convention
- strict/lenient mirrors SDK semantics
- `.requiredOption()` follows extant pattern

## conclusion

**consistent conventions check: PASS**

- no divergence from extant name patterns
- new patterns (`--output`, `--value`) extend extant conventions naturally
- SDK parity maintained for strict/lenient semantics
