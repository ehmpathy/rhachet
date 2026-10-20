## .what

the mechanic permissions init (`dist/domain.roles/mechanic/inits/init.claude.permissions.sh:129`, as of
1.39.5) prints a note that the rhachet split layout made false:

```
note: this clone's config dir is $REPO_ROOT/.agent/.actors/actor.via.repo=ambient/brain/.claude; its settings.of.repo.json is derived from this file. every actor picks up new allows at the next rhx init --hooks, rhx upgrade, or its own next rhx enroll. a delta actor also picks them up in the same rhx init --roles, when that init changed its roles
```

- the init now writes `.claude/settings.of.repo.json` itself, so "derived from this file" says the file
  derives from itself
- "this clone's config dir" names a grain rhachet forbids: a clone has no config dir, it reads its
  actor's brain dir (`rule.forbid.clone-config-misnomer`)
- the line runs ~370 chars, longer than the init output it annotates

## .the shape of the fix

print the note only when the target file is not `settings.of.repo.json`, or reword it to:

`note: the repo actor brain dir is $dir; every actor picks up new allows at the next rhx init --hooks, rhx upgrade, or its own next rhx enroll.`

## .where it was seen

`ehmpathy/rhachet`, branch `beav/fix-split-layout-local-settings-arrow`, snapshot
`blackbox/cli/__snapshots__/init.incremental.acceptance.test.ts.snap` [case1]. rhachet resnaps once a
release with the fix lands.
