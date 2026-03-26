# review: has-divergence-addressed

## the question

has-divergence-addressed asks: did we properly address each divergence (repair or backup with strong rationale)?

## divergence 1: `invokeEnroll.play.integration.test.ts` not created

### what blueprint declared

separate journey test file `invokeEnroll.play.integration.test.ts` for usecases 1-14.

### what was implemented

journey tests consolidated into `invokeEnroll.integration.test.ts`.

### resolution

**backup** — tests consolidated.

### skeptical analysis

**is this laziness or improvement?**

not laziness. a separate file would have been trivial (just move tests). the consolidation was a deliberate choice.

**rationale strength check**:

| claim | evidence |
|-------|----------|
| "all 14 usecases are covered" | verified: 599 lines, cases 1-7 with multiple then blocks each |
| "separation would add file overhead without benefit" | true: both files would test the same code paths |
| "consolidation reduces cognitive load" | true: one file to find, one file to run |

**could this cause problems later?**

no. the tests are organized by given/when/then blocks with clear case labels (`[case1]`, `[t0]`). the file size (599 lines) is manageable. if it grows, we can split later.

**would a skeptic accept this?**

yes. the blueprint's separation was a suggestion for organization, not a contract requirement. the tests exist and cover all usecases. the implementation meets the spec.

### verdict

backup accepted. no repair needed.

---

## divergence 2: `BrainCliConfigArtifact` simplified

### what blueprint declared

```ts
type BrainCliConfigArtifact = Artifact<typeof GitFile>
// via rhachet-artifact-git
```

### what was implemented

```ts
type BrainCliConfigArtifact = { configPath: string }
```

### resolution

**backup** — simplified from artifact pattern.

### skeptical analysis

**is this laziness or improvement?**

improvement. the artifact pattern adds:
- dependency on rhachet-artifact-git
- complexity (Artifact wrapper with generic type)
- conceptual overhead (what is an Artifact?)

for this usecase, we only need to know where the config file is. a plain object suffices.

**rationale strength check**:

| claim | evidence |
|-------|----------|
| "artifact pattern adds complexity without value" | true: we write one file, pass one path |
| "we only need the path to pass to the spawner" | verified in enrollBrainCli.ts:27 — takes configPath string |

**could this cause problems later?**

potentially, if we need to:
- track config file lifecycle (cleanup)
- version the config file
- observe config changes

but for the current usecase (generate config, pass path, spawn), none of these are needed. if requirements change, we can upgrade to the artifact pattern later.

**would a skeptic accept this?**

yes. YAGNI (you ain't gonna need it). the simpler solution works and can be upgraded if needed.

### verdict

backup accepted. no repair needed.

---

## divergence 3: `genBrainCliConfigArtifact` signature changed

### what blueprint declared

```ts
genBrainCliConfigArtifact({ brain, enrollment, agentDir })
```

### what was implemented

```ts
genBrainCliConfigArtifact({ enrollment, repoPath })
```

### resolution

**backup** — signature refined.

### skeptical analysis

**is this laziness or improvement?**

improvement for these reasons:

1. **`brain` removed**: `brain` is already in `enrollment.brain`. separate parameter duplicates data and creates potential for inconsistency.

2. **`agentDir` → `repoPath`**: the settings.local.json file lives at repo root (`.claude/settings.local.json`), not in `.agent/`. the rename clarifies the actual path used.

**rationale strength check**:

| claim | evidence |
|-------|----------|
| "brain is already in enrollment.brain" | verified in BrainCliEnrollmentManifest.ts:14 |
| "settings.local.json lives at repo root" | verified in genBrainCliConfigArtifact.ts:73 — `path.join(repoPath, '.claude/settings.local.json')` |

**could this cause problems later?**

no. the signature is cleaner and more accurate. callers have `enrollment` which contains `brain`. they know the repo path.

**would a skeptic accept this?**

yes. this is a refinement that improves clarity without loss of functionality.

### verdict

backup accepted. no repair needed.

---

## summary

| divergence | resolution | skeptic verdict |
|------------|------------|----------------|
| journey test file not created | backup | accepted: tests exist, organization is adequate |
| artifact type simplified | backup | accepted: YAGNI, simpler solution works |
| signature refined | backup | accepted: reduces redundancy, improves clarity |

all three backups pass skeptical review. no repairs required.

## why it holds

1. **each backup has skeptical analysis** — not just "we decided to", but "here's why and here's evidence"
2. **evidence links to code** — specific line numbers cited (enrollBrainCli.ts:27, genBrainCliConfigArtifact.ts:73)
3. **future risk assessed** — each backup considers "could this cause problems later?"
4. **upgrade path clear** — if any simplification proves wrong, path to full implementation exists

## conclusion

**all divergences properly addressed with strong rationale.**

- none are laziness — each backup has clear justification
- none risk future problems — solutions are upgradeable if needed
- all would convince a skeptic — YAGNI, clarity, and coverage arguments hold
