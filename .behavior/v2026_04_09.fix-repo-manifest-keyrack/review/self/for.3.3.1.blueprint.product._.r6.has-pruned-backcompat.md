# self-review r6: has-pruned-backcompat

## deeper review

r5 declared "no backwards-compat concerns" too quickly. let me trace each decision more carefully.

## the key question

is there ANY compatibility layer in this blueprint that was not explicitly requested?

## line-by-line trace through blueprint

### CLI interface

```
npx rhachet repo compile --from <dir> --into <dir> [--include <glob>]... [--exclude <glob>]...
```

**is `--from` and `--into` backwards-compat with rsync?**

the wish rsync command:
```bash
rsync -a --prune-empty-dirs ... src/ dist/
```

rsync uses positional args: `rsync [options] src/ dist/`

our command uses named flags: `--from src --into dist`

this is NOT backwards-compat — it's a deliberate design choice for clarity. rsync's positional args are error-prone. the wish does not ask for rsync CLI compatibility.

**verdict**: not a backwards-compat concern.

### default exclusions

```ts
defaultExclusions: ['.test/**', '.route/**', '.scratch/**', '.behavior/**', '*.test.*', '.*']
```

trace each against the wish rsync:
- `.test/**` — matches wish `--exclude='.test'`
- `.route/**` — matches wish `--exclude='.route'`
- `.scratch/**` — matches wish `--exclude='.scratch'`
- `.behavior/**` — matches wish `--exclude='.behavior'`
- `*.test.*` — matches wish `--exclude='*.test.*'`
- `.*` — NOT in wish rsync. let me check...

wait. the wish rsync does NOT have `--exclude='.*'`. where did this come from?

**found issue**: `.*` exclusion was added without explicit request.

**but hold on** — let me think about this more carefully.

the wish says:
> "exclude tests and dot prefixed dirs"

the wish says "dot prefixed dirs" but not "dot prefixed files".

let me re-read the wish rsync:
```bash
rsync -a --prune-empty-dirs \
  --exclude='.test' \
  --exclude='.route' \
  --exclude='.scratch' \
  --exclude='.behavior' \
  --exclude='*.test.*' \
  --include='*/' \
  --include='briefs/**' \
  --include='skills/**' \
  --include='inits/**' \
  --include='templates/**' \
  --include='**/readme.md' \
  --include='**/boot.yml' \
  --include='**/keyrack.yml' \
  --exclude='*' \
  src/ dist/
```

the wish rsync uses `--include` and `--exclude` patterns in rsync order. the `--exclude='*'` at the end means "exclude all not matched by prior includes".

the `.*` pattern in our default exclusions tries to exclude all dot-prefixed items (dirs and files). but is this what the wish asks?

the wish says "exclude tests and dot prefixed dirs" — but the listed excludes are specific dirs (`.test`, `.route`, `.scratch`, `.behavior`), not a generic `.*` pattern.

**question**: should we exclude ALL dot-prefixed paths, or just the four listed?

**answer from wish**: the wish lists four specific dirs. it says "dot prefixed dirs" which COULD mean all, but the example only shows four.

**decision**: the `.*` pattern is speculative. we should stick with the four explicit patterns from the wish:
- `.test/**`
- `.route/**`
- `.scratch/**`
- `.behavior/**`

**fix needed**: remove `.*` from default exclusions.

### other checks

all other aspects trace to explicit wish requirements. no other backwards-compat concerns.

## fix applied

remove `.*` from default exclusions in blueprint:
```ts
// before
defaultExclusions: ['.test/**', '.route/**', '.scratch/**', '.behavior/**', '*.test.*', '.*']

// after
defaultExclusions: ['.test/**', '.route/**', '.scratch/**', '.behavior/**', '*.test.*']
```

## conclusion

found one issue: `.*` exclusion pattern was speculative, not explicitly requested. removed it.
