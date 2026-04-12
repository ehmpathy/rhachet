# self-review: has-pruned-backcompat (r2)

## deeper reflection

pausing to consider what backwards compatibility truly means here.

### the three files changed

1. **getAllFilesByGlobs.ts** — new file, new function
   - no prior function to be compatible with
   - no callers to maintain compatibility for
   - holds

2. **getAllArtifactsForRole.ts** — new file, new function
   - no prior function to be compatible with
   - no callers to maintain compatibility for
   - holds

3. **invokeRepoCompile.ts** — new file, new command
   - no prior `repo compile` command
   - no prior `compile` command
   - holds

### what about the Role interface?

the implementation reads from Role.briefs.dirs, Role.skills.dirs, Role.inits.dirs, Role.readme, Role.boot, Role.keyrack.

these are all extant Role interface properties. the code does not:
- add new properties to Role
- change the shape of extant properties
- require new mandatory fields

it only reads what already exists. no compatibility concern.

### what about getRoleRegistry?

the command expects getRoleRegistry export from rhachet-roles-* packages.

this is an extant contract. the code does not:
- change the expected signature
- add new requirements to the registry
- modify how registries are discovered

it only reads what already exists. no compatibility concern.

### what about the CLI interface?

`repo compile --from src --into dist` is a new command.

there is no prior interface to maintain. the --include and --exclude flags are new additions, not changes to extant behavior.

## conclusion

no backwards compatibility concerns.

every interface touched is either:
1. new (the files added)
2. read-only (Role interface, getRoleRegistry)

no interfaces were changed that would require compatibility shims.
