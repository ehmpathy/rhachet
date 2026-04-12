# self-review r2: has-questioned-deletables

## feature traceability

| feature | traces to wish? | verdict |
|---------|-----------------|---------|
| discover roles via getRoleRegistry | implied by "same logic as introspect" | keep |
| apply globs to briefs.dirs | wish: "include skills, briefs" | keep |
| apply globs to skills.dirs | wish: "include skills, briefs" | keep |
| apply globs to inits.dirs | wish references rsync with `--include='inits/**'` | keep |
| copy readme.md | wish references rsync with `--include='**/readme.md'` | keep |
| copy boot.yml | wish references rsync with `--include='**/boot.yml'` | keep |
| copy keyrack.yml | wish: original motivation, eliminate risk of forgotten files | keep |
| default exclusions | wish: "exclude tests and dot prefixed dirs" | keep |
| --include override | wish: "allow them to add their own --include" | keep |
| --exclude override | wish: "allow them to add their own --exclude" | keep |
| preserve extant dist/ | wish: rsync uses `-a` which preserves | keep |
| prune empty dirs | wish: rsync uses `--prune-empty-dirs` | keep |

all features trace to the wish. no features were assumed.

## component traceability

| component | required? | reason |
|-----------|-----------|--------|
| invokeRepoCompile.ts | yes | CLI contract, entry point |
| getAllArtifactsForRole.ts | yes | centralizes artifact discovery |
| applyArtifactGlobs.ts | yes | filters by file type patterns |
| applyExclusions.ts | yes | handles default + user exclusions |
| copyFileWithStructure.ts | yes | copies with structure (cannot use extant util) |
| pruneEmptyDirs.ts | yes | matches rsync `--prune-empty-dirs` |
| CompileArtifact.ts | question | is the type field needed? |

### CompileArtifact.ts examination

the CompileArtifact domain object has two fields:
- `source: string` — required, the file path
- `type: 'brief' | 'skill' | 'init' | 'readme' | 'boot' | 'keyrack'` — enables per-type counts

per-type counts in success output:
```
└─ roles
   ├─ repo=.this/role=mechanic
   │  ├─ briefs: 12
   │  ├─ skills: 8
   │  └─ keyrack: 1
```

verdict: **keep but simplify**

the type field enables nice output but is not required by the wish. however:
- the type is already known when we collect artifacts (we iterate by type)
- the overhead is minimal (one string field)
- the output helps users verify their build

could simplify to `string[]` if we don't need per-type counts. but the current design is not over-engineered — it's a single field that enables clear report.

**decision**: keep as is. the overhead is minimal and the benefit is clear.

## simplification check

| question | answer |
|----------|--------|
| can any component be removed entirely? | no — each serves a distinct purpose |
| did we optimize a component that shouldn't exist? | no — all components are necessary |
| what is the simplest version that works? | current design is minimal |

## conclusion

all features trace to the wish. no features were assumed. all components are necessary. the design is minimal.

no deletions needed.
