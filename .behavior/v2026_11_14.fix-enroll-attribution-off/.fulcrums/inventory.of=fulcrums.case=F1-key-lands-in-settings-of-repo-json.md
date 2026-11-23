# F1: the key lands in `settings.of.repo.json`

- **the fork**: write `attribution` into (a) the actor's `settings.of.repo.json`, passed via
  `--settings`, or (b) the file claude names `settings.json` in the actor's `CLAUDE_CONFIG_DIR`
- **taken**: (a)
- **why**: (b) is an arrow to the human's `~/.claude/settings.json` (the grove); a write there edits
  the human's own file, which the wish forbids, and a real file there is replaced by the arrow on the
  next layout findsert. (a) is in the same dir, outranks the grove, and is already rewritten by one
  writer on every enroll and init
- **rework**: clean — the key's target is one line in one writer
- **confidence**: 95% — the only doubt is whether the wisher meant the literal filename; the bound
  rules it out
- **where**: `genBrainCliConfigArtifact.ts` `setActorSettingsRepoWithinLock`
- **verdict**: —
