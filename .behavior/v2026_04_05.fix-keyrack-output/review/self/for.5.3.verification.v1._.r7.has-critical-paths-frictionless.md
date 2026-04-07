# self-review: has-critical-paths-frictionless

## the question

double-check: are the critical paths frictionless in practice?

## the review

### critical paths from vision

vision defined these critical user paths:

1. `rhx keyrack get --key X --value` — pipe secret to command
2. `eval "$(rhx keyrack source --env test)"` — source all repo keys
3. `rhx keyrack source --key X` — source single key
4. `rhx keyrack source --strict` — fail-fast for CI/CD
5. `rhx keyrack source --lenient` — partial results for local dev

### path 1: `keyrack get --value`

| aspect | evaluation |
|--------|------------|
| syntax | simple: `--value` flag |
| output | raw secret, no newline |
| error | exit 2 with status message |
| friction? | none — one flag, one output |

**why it holds:** the `--value` flag is self-evident. output is pipe-friendly (no newline). errors are clear.

### path 2: `keyrack source` (all keys)

| aspect | evaluation |
|--------|------------|
| syntax | `source --env test --owner ehmpath` |
| output | shell export statements |
| usage | `eval "$(rhx keyrack source ...)"` |
| friction? | none — output is directly eval-able |

**why it holds:** the command outputs valid shell syntax. users can copy-paste the eval pattern from docs.

### path 3: `keyrack source --key X`

| aspect | evaluation |
|--------|------------|
| syntax | adds `--key X` to source command |
| output | single export statement |
| friction? | none — consistent with all-keys syntax |

**why it holds:** single-key syntax mirrors all-keys syntax. no special treatment needed.

### path 4: strict mode (default)

| aspect | evaluation |
|--------|------------|
| default | strict is default |
| behavior | fails if any key absent |
| error | exit 2 with hint for --lenient |
| friction? | none — fail-fast is expected behavior |

**why it holds:** CI/CD users expect fail-fast. the hint guides users who want partial results.

### path 5: lenient mode

| aspect | evaluation |
|--------|------------|
| syntax | `--lenient` flag |
| behavior | skips absent keys silently |
| output | partial export statements |
| friction? | none — opt-in escape hatch |

**why it holds:** lenient mode is explicit opt-in. users know they will get partial results.

### friction check against vision "aha moment"

vision stated: "wait, i can just `--value` to get the secret? and `source` outputs export statements i can eval?"

| claim | verified |
|-------|----------|
| `--value` gives raw secret | ✓ (tested in case1 t0) |
| `source` outputs exports | ✓ (tested in case1 t0) |
| exports can be eval'd | ✓ (tested in case1 t2) |

**why it holds:** the "aha" experience is preserved. users get exactly what vision promised.

### error ergonomics

| error case | message | friction? |
|------------|---------|-----------|
| key locked | `absent: org.env.KEY` | no — status is clear |
| key absent | `absent: org.env.KEY` | no — status is clear |
| strict fail | `not granted: ... (absent)\nhint: use --lenient...` | no — hint guides next action |

**why it holds:** error messages include actionable hints. users know what to do next.

## found concerns

none. all critical paths are frictionless:
- simple syntax (one flag per mode)
- predictable output (shell-compatible)
- clear errors (status + hint)
- consistent behavior (strict default, lenient opt-in)

## conclusion

**has-critical-paths-frictionless check: PASS**

- all 5 critical paths from vision verified
- no syntax friction (simple flags)
- no output friction (shell-compatible)
- no error friction (clear hints)
- "aha moment" preserved (matches vision promise)
