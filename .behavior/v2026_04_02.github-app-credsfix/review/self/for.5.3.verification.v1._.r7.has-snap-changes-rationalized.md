# review: has-snap-changes-rationalized (r7)

## verdict: pass — zero snapshot changes in diff

## question: is every `.snap` file change intentional and justified?

### step 1: identify all .snap file changes in diff

```bash
git diff main --name-only -- '*.snap'
```

**output:** (empty)

**interpretation:** zero `.snap` files appear in the diff against main.

### step 2: verify via git status

```bash
git status --porcelain -- '**/*.snap'
```

**output:** (empty)

**interpretation:** no new, modified, or deleted snapshot files in the tree.

### step 3: verify via explicit glob

```bash
find . -name '*.snap' -newer .git/refs/heads/main 2>/dev/null | head
```

let me also check if any .snap files were touched in test runs:

```bash
ls -la blackbox/cli/__snapshots__/keyrack.set.acceptance.test.ts.snap
```

**result:** the file exists but its mtime matches the main branch — it was not modified.

### step 4: understand why zero snap changes is correct

**the fix:**
- `src/infra/promptHiddenInput.ts` — changed `rl.once('line', ...)` to `for await (const chunk of process.stdin)`
- `src/infra/promptVisibleInput.ts` — same change

**what this affects:**
- how stdin bytes are read from a pipe
- specifically: multiline content is now fully captured instead of truncated at first newline

**what this does NOT affect:**
- the output format of any CLI command
- the JSON structure returned by `keyrack set --json`
- the JSON structure returned by `keyrack get --json`
- any extant test assertions or snapshots

**why extant snapshots don't change:**

the extant snapshots in `keyrack.set.acceptance.test.ts.snap` capture:
1. the JSON structure of `keyrack set` output (slug, mech, vault, timestamps)
2. the JSON structure of `keyrack list` output (key entries)

these structures are identical before and after the fix. the fix corrects **what content is stored**, not **what shape the output has**.

example: before the fix, if you stored `{"a":1}`, the output was:
```json
{"slug": "org.env.KEY", "mech": "...", "vault": "..."}
```

after the fix, if you store `{"a":1}`, the output is:
```json
{"slug": "org.env.KEY", "mech": "...", "vault": "..."}
```

same shape. the only difference is that `keyrack get` now returns the full content instead of truncated content — but `keyrack set` output doesn't include the secret.

### step 5: verify [case5] doesn't create new snapshots

my new test [case5] uses:
- `expect(result.status).toEqual(0)` — direct assertion
- `expect(parsed.slug).toEqual(...)` — direct assertion
- `expect(parsed.grant.key.secret).toEqual(multilineJson)` — direct assertion

it does NOT use `toMatchSnapshot()`.

**why this is correct:**

the purpose of [case5] is to prove **exact round-trip**. snapshots are for **output format vibecheck**. the fix is about correctness, not format. direct equality assertion is stronger proof than snapshot comparison.

### conclusion

| criterion | status | evidence |
|-----------|--------|----------|
| .snap files in diff | 0 | `git diff main --name-only -- '*.snap'` empty |
| untracked .snap files | 0 | `git status --porcelain -- '**/*.snap'` empty |
| new snapshots from [case5] | 0 | test uses direct assertions |
| extant snapshot format unchanged | yes | fix affects stored content, not output format |

zero `.snap` files changed. this is the correct outcome for an internal bug fix that doesn't modify any CLI output format. no rationalization needed because there are no changes to rationalize.

