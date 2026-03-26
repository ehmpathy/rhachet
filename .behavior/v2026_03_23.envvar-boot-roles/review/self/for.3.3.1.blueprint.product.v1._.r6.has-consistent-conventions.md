# self review (r6): has-consistent-conventions

## stone reviewed

3.3.1.blueprint.product.v1

## review criteria

sixth pass. deeper reflection on convention consistency with fresh eyes.

---

## re-examined: does `BrainCli` prefix fit extant patterns?

**searched codebase for Brain* patterns**:
- `BrainAtom` — brain that does single inference call
- `BrainRepl` — brain that loops with tool use
- `BrainSpec` — specification for brain configuration
- `BrainSeries` — chain of episodes (repl only)
- `BrainEpisode` — one context window
- `BrainExchange` — one request-response

**analysis**:
- `Brain*` prefix indicates brain-related domain objects
- `BrainCli` distinguishes CLI brains from SDK brains
- `BrainCliEnrollment*` narrows to enrollment via CLI

**verdict**: `BrainCli` prefix is consistent with extant `Brain*` patterns.

---

## re-examined: does `Enrollment` vs `Enroll` align?

**searched for verb vs noun patterns**:
- `Role` (noun) — the role object
- `RoleRegistry` (noun) — registry of roles
- `BrainSpec` (noun) — specification object

**analysis**:
- domain objects use nouns, not verbs
- `Enrollment` is the noun form of `enroll`
- `Enroll` alone is a verb

**verdict**: `Enrollment` (noun) is correct for domain objects.

---

## re-examined: is `Operation` suffix overloaded?

**searched for Operation patterns**:
- found `domain.operations/` directory — contains operations (verbs)
- no domain objects named `*Operation` in `domain.objects/`

**question**: is `BrainCliEnrollmentOperation` unclear due to directory name?

**analysis**:
- `BrainCliEnrollmentOperation` represents a single add/remove op
- it's not an operation in the `domain.operations/` sense
- potential ambiguity with directory name

**alternative names considered**:
- `BrainCliEnrollmentOp` — shorter, less formal
- `BrainCliEnrollmentAction` — clearer intent
- `BrainCliEnrollmentDelta` — implies change

**verdict**: `BrainCliEnrollmentOp` would be cleaner but current name is acceptable. `Operation` in domain.objects/ context means "a single op" not "a procedure".

---

## re-examined: `parse*` prefix alignment

**searched for parse* patterns**:
- `parseYaml` — parses yaml string to object
- `parseSpec` — parses spec string to spec object

**blueprint uses**: `parseBrainCliEnrollmentSpec`

**analysis**:
- `parse*` prefix is for string → typed object transforms
- `parseBrainCliEnrollmentSpec` parses `--roles` string to `BrainCliEnrollmentSpec`

**verdict**: `parseBrainCliEnrollmentSpec` follows extant `parse*` pattern.

---

## re-examined: `compute*` prefix alignment

**searched for compute* patterns**:
- `computeInvoiceTotal` — deterministic computation
- `computeRoleDelta` — deterministic delta computation

**blueprint uses**: `computeBrainCliEnrollment`

**analysis**:
- `compute*` is for deterministic transforms
- `computeBrainCliEnrollment` takes spec + defaults → manifest
- deterministic: same input → same output

**verdict**: `computeBrainCliEnrollment` follows extant `compute*` pattern.

---

## re-examined: `gen*` prefix alignment

**searched for gen* patterns**:
- `genBrainHooksAdapterForClaudeCode` — find-or-create config
- `genClone` — find-or-create clone

**blueprint uses**: `genBrainCliConfigArtifact`

**analysis**:
- `gen*` is for find-or-create (findsert)
- `genBrainCliConfigArtifact` creates config file if absent
- unique hash means always creates (no find needed)

**question**: should it be `setBrainCliConfigArtifact` since it always writes?

**analysis of set vs gen**:
- `set*` implies overwrite extant
- `gen*` implies create (find-or-create)
- config file has unique hash → always creates → `gen*` is correct

**verdict**: `genBrainCliConfigArtifact` is correct. unique hash means findsert semantics.

---

## re-examined: `invoke*` for CLI handlers

**searched for invoke* patterns**:
- `invokeAct` — CLI handler for act command
- `invokeAsk` — CLI handler for ask command
- `invokeRun` — CLI handler for run command

**blueprint uses**: `invokeEnroll`

**analysis**:
- `invoke*` prefix is for CLI command handlers
- `invokeEnroll` is the CLI handler for enroll command

**verdict**: `invokeEnroll` follows extant `invoke*` pattern.

---

## summary of current names (verified)

### domain objects

| name | pattern | verdict |
|------|---------|---------|
| BrainCliEnrollmentSpec | [noun][context][type] | ✓ |
| BrainCliEnrollmentOperation | [noun][context][type] | ✓ (acceptable) |
| BrainCliEnrollmentManifest | [noun][context][type] | ✓ |

### operations

| name | pattern | verdict |
|------|---------|---------|
| parseBrainCliEnrollmentSpec | parse* | ✓ |
| computeBrainCliEnrollment | compute* | ✓ |
| genBrainCliConfigArtifact | gen* | ✓ |
| enrollBrainCli | verb-first | ✓ |
| invokeEnroll | invoke* | ✓ |

### cli command

| command | pattern | verdict |
|---------|---------|---------|
| `rhx enroll <brain>` | brain-centric | ✓ |

---

## principles reinforced

1. **Brain* prefix** — brain-related domain objects
2. **noun suffixes for domain objects** — Spec, Manifest, Operation
3. **parse/compute/gen verbs** — match extant operation prefixes
4. **invoke* for CLI handlers** — consistent with ask/act/run

---

## verdict

- [x] re-examined BrainCli prefix — consistent
- [x] re-examined Enrollment noun — consistent
- [x] re-examined Operation suffix — acceptable (no ambiguity in practice)
- [x] re-examined parse* prefix — consistent
- [x] re-examined compute* prefix — consistent
- [x] re-examined gen* prefix — consistent
- [x] re-examined invoke* prefix — consistent
- [x] all names follow extant conventions

