# F005 — the snapshot masker's root derivation is not a read outside the repo

## .the fork

repo-rules i009 nitpick.1: `getTestTempRepoPathPattern` derives the temp root via
`getOneTempDirRoot().pathPhysical`; `rule.forbid.reads-outside-the-repo`'s one exception names
only the clamp's count. the ask: name this derivation in the exception table, or route it through
a helper the exception already names.

## .taken — no new exception is owed

- **the rule governs observation of host state** — what sits on the host (entries, contents,
  capacity). the masker observes none of it: it never lists the root, never opens a file there. it
  takes a PATH STRING from the allocator and builds a regex from it
- **the derivation is the allocator's own act.** `getOneTempDirRoot()` is the same call every
  `genTempDir` makes in the same worker to name the dir it allocates; the rule has never treated
  allocation as a read, or every migrated test would violate it
- **the alternative routes cost more and gain naught.** a new exception row would be a grant the
  human holds for an act that reads no host state; a helper "the exception names" would be the
  clamp's count, which cannot mask a path

## .rework

clean — should the human prefer it named, one row in the exception table, no code change.

## .confidence

90%. the rule text frames reads as observation of state; no clause names path derivation.

## .verdict

settled by the driver, by reason. disputed, not conceded.
