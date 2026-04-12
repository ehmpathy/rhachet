# self-review r3: has-questioned-assumptions

## assumptions surfaced and questioned

### assumption 1: exclusion patterns match rsync behavior

**stated**: default exclusions are `['.test/**', '__test_*/**', '.route/**', '.scratch/**', '.behavior/**', '*.test.*', '.*']`

**evidence**: wish rsync command uses:
```
--exclude='.test' --exclude='.route' --exclude='.scratch' --exclude='.behavior' --exclude='*.test.*'
```

**issues found**:

1. **`.test/**` vs `.test`**: rsync `--exclude='.test'` excludes any file or directory named `.test` at any level. our `.test/**` would only match files under `.test/`, not `.test` itself.

2. **`__test_*/**` not in wish**: this pattern was added but not traced to the rsync command. where did it come from?

3. **`.*` not in wish**: wish says "exclude tests and dot prefixed dirs" but rsync command only excludes specific dot dirs. the `.*` pattern is broader.

**fix applied to blueprint**:

change exclusion patterns to match rsync behavior exactly:
- `.test` (not `.test/**`) — excludes directory itself
- `.route`, `.scratch`, `.behavior` — same pattern
- `*.test.*` — matches rsync
- remove `__test_*/**` — not in wish
- remove `.*` — too broad

actually, wait. the rsync uses `--include='*/'` before excludes, which means directories are preserved for structure. our approach is different — we filter artifacts, not directories.

let me reconsider: we collect files from registered dirs, then filter. the rsync patterns exclude paths that match. our `fg.isMatch` does the same.

for our use case, `.test/**` means "exclude files whose path has `/.test/`". rsync `--exclude='.test'` means "exclude any path with `.test` component".

these are equivalent for our purpose.

**conclusion**: the patterns are functionally equivalent. the slight syntax difference is due to fast-glob vs rsync pattern syntax.

### assumption 2: `__test_*/**` pattern

**questioned**: where did this come from?

**investigation**: this pattern is not in the rsync command from the wish. it appears to be an assumption about common test directory conventions.

**verdict**: this should be removed — it was not requested.

**fix**: update blueprint to remove `__test_*/**` from default exclusions.

### assumption 3: `.*` pattern

**questioned**: the wish says "exclude tests and dot prefixed dirs" but rsync only excludes specific ones.

**investigation**: the natural language in wish says "dot prefixed dirs" broadly. the rsync command is an example implementation that excludes specific dirs.

**verdict**: the wish text supports `.*`. the rsync command is not exhaustive.

**no fix needed**: `.*` aligns with wish text.

### assumption 4: fg.isMatch vs fg.sync

**stated**: blueprint uses `fg.isMatch` for pattern check

**evidence**: research showed `fg.sync` is used in extant code. need to verify `isMatch` exists.

**investigation**: fast-glob exports `isMatch` as a synchronous pattern match function.

**verdict**: valid assumption. `isMatch` is the correct API for pattern check.

### assumption 5: roles have optional dirs properties

**stated**: `input.role.briefs?.dirs`, `input.role.skills?.dirs`, `input.role.inits?.dirs`

**evidence**: research showed Role structure has these fields

**verdict**: valid assumption. the `?.` optional chain handles absent fields.

### assumption 6: extant dist/ preservation

**stated**: copyFileWithStructure adds files without delete

**evidence**: wish rsync uses `-a` which syncs without delete by default

**verdict**: valid assumption. we don't delete extant files in dist/.

## fix applied

update blueprint default exclusions:
- before: `['.test/**', '__test_*/**', '.route/**', '.scratch/**', '.behavior/**', '*.test.*', '.*']`
- after: `['.test/**', '.route/**', '.scratch/**', '.behavior/**', '*.test.*', '.*']`

removed `__test_*/**` — not in wish.

## conclusion

one assumption found invalid: `__test_*/**` pattern was added without traceability. fix applied.
