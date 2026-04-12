# self-review r5: has-pruned-backcompat

## review approach

scan the blueprint for any backwards compatibility concerns or compatibility layers.

## backwards-compat check

### check 1: new command, no prior version

`rhachet repo compile` is a new command. there is no prior version to be compatible with.

**verdict**: no backwards-compat concern.

### check 2: replaces rsync incantation

the wish explicitly says this command replaces the rsync incantation in package.json:

```
build:complete:dist: "npx rhachet compile --from src --into dist"
```

this is a replacement, not an addition. no backwards-compat needed — the old rsync command is expected to be replaced.

**verdict**: no backwards-compat concern.

### check 3: dist/ contents preserved

the blueprint states: "Preserve extant dist/ contents (tsc output survives)"

this is not backwards-compat — it's the correct behavior for a compile command that adds files to an extant dist/ rather than replaces it.

**verdict**: not a backwards-compat concern, this is the intended behavior.

### check 4: default exclusions

the default exclusions list:
```
['.test/**', '.route/**', '.scratch/**', '.behavior/**', '*.test.*', '.*']
```

these match the patterns in the wish rsync command. no backwards-compat concern.

**verdict**: not a backwards-compat concern, matches wish.

### check 5: --include/--exclude overrides

the blueprint supports `--include` and `--exclude` overrides. this is explicitly in the wish:

> and allow them to add their own `--exclude` and `--include` overrides

**verdict**: not a backwards-compat concern, explicitly requested.

## conclusion

no backwards-compat concerns found. this is a new command that replaces an rsync incantation. no prior version to be compatible with.
