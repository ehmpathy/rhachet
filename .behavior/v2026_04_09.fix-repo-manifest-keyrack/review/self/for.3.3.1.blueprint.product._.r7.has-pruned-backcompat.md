# self-review r7: has-pruned-backcompat

## summary of r6

r6 found one issue: `.*` exclusion pattern was speculative. removed it from blueprint.

## this review: exhaustive component trace

I will trace EVERY component in the blueprint against the wish to verify no backwards-compat was added.

## component-by-component trace

### component 1: invokeRepoCompile.ts

**what it does**: CLI handler for `rhachet repo compile`

**backwards-compat question**: does this maintain compatibility with any prior system?

**trace to wish**:
```
build:complete:dist: "npx rhachet compile --from src --into dist"
```

the wish explicitly defines a NEW command. there is no prior `rhachet compile` command.

**verdict**: no backwards-compat — new command.

### component 2: getAllArtifactsForRole.ts

**what it does**: collects artifact paths for a role

**backwards-compat question**: does this replicate behavior from another system?

**trace to wish**: the wish says to discover roles via `getRoleRegistry` and apply suffix globs to registered dirs. this is a NEW pattern — the rsync incantation hardcodes paths.

**verdict**: no backwards-compat — new approach.

### component 3: applyArtifactGlobs.ts

**what it does**: filters files by glob patterns

**backwards-compat question**: do the globs match rsync includes exactly?

**trace to wish rsync includes**:
- `--include='briefs/**'` → we use `['**/*.md', '**/*.min']` for briefs
- `--include='skills/**'` → we use `['**/*.sh', '**/*.jsonc', '**/template/**', '**/templates/**']` for skills
- `--include='inits/**'` → we use `['**/*.sh', '**/*.jsonc']` for inits

wait. the wish rsync uses `briefs/**` which includes ALL files under briefs/. our globs are more restrictive — only `.md` and `.min` files.

**question**: is this a backwards-compat concern or an intentional improvement?

**analysis**: the wish says "rsync includes briefs, skills, inits" but the rsync `--include='briefs/**'` gets ALL files in briefs/. our approach is more selective.

but wait — the wish also says:
> "exclude tests and dot prefixed dirs"

and later:
> "allow them to add their own `--exclude` and `--include` overrides"

the wish does NOT say "copy only .md and .min files from briefs". it says "include briefs/**".

**found issue**: our globs are MORE restrictive than the wish rsync. we should match rsync behavior: include all files under briefs/, skills/, inits/, then apply exclusions.

actually, let me re-read the wish more carefully...

the wish says:
> "for each role, applies suffix globs to registered dirs"

hmm, it says "suffix globs" which could mean we apply globs to filter. but the rsync uses `briefs/**` which is all files.

**open question for wisher**: should briefs include ALL files, or only `.md` and `.min`?

### component 4: applyExclusions.ts

**what it does**: filters artifacts by exclusion/inclusion patterns

**backwards-compat question**: does the precedence match rsync?

**rsync precedence**: in rsync, the first match wins. our code: exclude > include > default.

this is DIFFERENT from rsync. rsync processes patterns in order. our code has a fixed precedence.

**is this a problem?**: the wish does not ask for rsync-compatible precedence. it asks for a simpler system with `--include` and `--exclude` overrides.

**verdict**: not a backwards-compat concern — the wish asks for a simpler system.

### component 5: copyFileWithStructure.ts

**what it does**: copies a file to dest with directory structure

**backwards-compat question**: does this replicate rsync `-a` behavior?

rsync `-a` preserves permissions, timestamps, ownership. our code uses `fs.copyFile` which may not.

**is this a problem?**: the wish does not ask for permission/timestamp preservation. it asks to "copy matched files to dist/ with preserved relative structure" — which means directory structure, not metadata.

**verdict**: not a backwards-compat concern — wish only asks for structure preservation.

### component 6: pruneEmptyDirs.ts

**what it does**: removes empty directories

**backwards-compat question**: does this replicate rsync `--prune-empty-dirs`?

**trace to wish**: the wish rsync uses `--prune-empty-dirs`. our implementation matches this behavior.

**verdict**: matches wish — not a backwards-compat concern.

### component 7: default exclusions

**r6 fixed this**: removed `.*` pattern. the list now matches the wish rsync excludes exactly.

### component 8: artifact globs

**found in component 3**: our globs may be more restrictive than wish rsync.

## fixes applied in r7

1. **r6 fix applied**: removed `.*` from default exclusions

2. **new open question**: should briefs include all files (`briefs/**`) or only `.md` and `.min`?

let me re-read the wish one more time...

```
rsync -a --prune-empty-dirs \
  --include='briefs/**' \
```

the rsync includes `briefs/**` which is ALL files. but earlier the wish says:
> "this will systematically eliminate the risk that they forget to rsync their keyracks"

so the purpose is to copy artifacts (briefs, skills, inits, readme, boot, keyrack). briefs are markdown files. skills are shell scripts. it makes sense to be selective.

actually, a closer look at the summary:
> "for each role, applies suffix globs to registered dirs (briefs.dirs, skills.dirs, inits.dirs)"

the wish explicitly says "applies suffix globs" — so we ARE supposed to filter by file type, not copy all files.

**verdict**: the selective globs are intentional per the wish. not a backwards-compat concern.

## conclusion

r6 fix applied (removed `.*`). all other components trace to explicit wish requirements. the selective globs for briefs/skills/inits are intentional per the wish phrase "applies suffix globs".

no other backwards-compat concerns found.
