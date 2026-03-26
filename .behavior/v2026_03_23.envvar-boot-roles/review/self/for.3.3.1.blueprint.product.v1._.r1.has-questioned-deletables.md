# self review (r1): has-questioned-deletables

## stone reviewed

3.3.1.blueprint.product.v1

## review criteria

try hard to delete before optimize. question each component: can it be deleted?

---

## domain objects

### BrainSlug, RoleSlug

**question**: can these be deleted or just use `string`?

**answer**: delete.
- simple type aliases add no runtime value
- inline `string` types are sufficient
- removes two files with no meaningful content

### BrainCliEnrollmentSpec

**question**: can this be deleted or inlined?

**answer**: no.
- captures structured parse output: `{ mode: 'replace' | 'delta', ops: [...] }`
- mode determines how ops are applied (replace defaults vs modify defaults)
- used by computeBrainCliEnrollment as input
- DomainLiteral enables identity comparison and serialization for debug

### BrainCliEnrollmentOperation

**question**: can this be inlined into BrainCliEnrollmentSpec?

**deeper question**: if we deleted this and had to add it back, would we?

**answer**: keep, but considered inlining.
- shape is simple: `{ action: 'add' | 'remove', role: string }`
- could be inline type in Spec's ops array
- however: DomainLiteral provides consistent pattern across codebase
- ops are iterated and validated — distinct identity helps debug
- tradeoff: one extra file vs pattern consistency
- **decision**: keep for pattern consistency with other domain objects

### BrainCliEnrollmentManifest

**question**: can this be inlined as `{ brain: string, roles: string[] }`?

**deeper question**: if we deleted this and had to add it back, would we?

**answer**: keep, but considered inlining.
- shape is simple: `{ brain: string, roles: string[] }`
- passed from compute → genConfig — could be inline type
- however: manifest is the "contract" between compute and genConfig
- explicit type makes contract visible
- DomainLiteral enables trace output and debug
- **decision**: keep for explicit contract and debug visibility

### BrainCliConfigArtifact

**question**: can this be deleted?

**answer**: delete.
- type alias for `Artifact<typeof GitFile>` adds no value
- consumers can use the type directly
- removes file that adds indirection without benefit

---

## domain operations

### parseBrainCliEnrollmentSpec

**question**: can parse logic be inline in invokeEnroll?

**deeper question**: could parse and compute be merged into one operation?

**answer**: no — keep separate.
- parse is syntactic: string → structured spec
- compute is semantic: spec + context → final roles
- parse has unit tests for syntax edge cases (empty, conflict, mixed ops)
- compute has integration tests for role discovery (filesystem access)
- different test boundaries = different operations
- **principle**: operations that cross different boundaries (pure vs IO) should be separate

### computeBrainCliEnrollment

**question**: can this be merged with genBrainCliConfigArtifact?

**answer**: no — keep separate.
- compute: spec + defaults → roles (semantic validation, typo detection)
- genConfig: roles → config file (file system write, hook filter)
- compute is pure (given inputs, returns manifest)
- genConfig has IO (reads .claude/settings.json, writes unique config)
- **principle**: pure operations separate from IO operations

### genBrainCliConfigArtifact

**question**: can this be deleted?

**answer**: no.
- generates unique config file (`.claude/settings.enroll.$hash.json`)
- filters hooks by author=role to computed roles only
- separates config generation from spawn

### enrollBrainCli

**question**: can this be inline in invokeEnroll?

**answer**: keep as separate operation.
- encapsulates spawn with `--bare --settings <configPath>`
- handles stdio inheritance and exit code forward
- testable in isolation (mock spawn)
- clean separation of concern

---

## contract layer

### invokeEnroll

**question**: can this be deleted or merged with extant?

**answer**: no.
- new CLI command, must exist
- composes: parse → compute → genConfig → spawn

---

## verdict

- [x] questioned all domain objects — found deletables
- [x] questioned all domain operations — all needed
- [x] questioned contract layer — needed

**deletables**:
1. `BrainSlug.ts` — use inline `string`
2. `RoleSlug.ts` — use inline `string`
3. `BrainCliConfigArtifact.ts` — use `Artifact<typeof GitFile>` directly

---

## action

update blueprint to remove:
- `BrainSlug.ts`
- `RoleSlug.ts`
- `BrainCliConfigArtifact.ts`

use inline types instead.

---

## fixes applied

### BrainSlug.ts, RoleSlug.ts

**issue**: type aliases that just wrap `string` add no value
**fix**: removed from filediff tree and codepath tree
**lesson**: type aliases for primitives without behavior are deletable

### BrainCliConfigArtifact.ts

**issue**: type alias for `Artifact<typeof GitFile>` adds indirection without benefit
**fix**: removed from filediff tree and codepath tree
**lesson**: type aliases that simply rename extant types are deletable

### enrollBrainCli

**question**: could this be inline in invokeEnroll?
**decision**: keep separate — encapsulates spawn with `--bare --settings`, handles stdio, forward exit code
**lesson**: operations with multiple responsibilities (spawn config, stdio, exit code) warrant separation

---

## non-issues (why they hold)

### domain objects

**BrainCliEnrollmentSpec**: captures mode + ops from parsed spec. mode determines replace vs delta behavior. needed for compute step.

**BrainCliEnrollmentOperation**: represents single operation (add/remove role). considered inlining, kept for pattern consistency.

**BrainCliEnrollmentManifest**: represents compute output (brain + roles). explicit contract between compute and genConfig.

### domain operations

**parseBrainCliEnrollmentSpec**: pure syntactic parse. unit testable. edge cases: empty spec, conflict detection.

**computeBrainCliEnrollment**: pure semantic computation. validates roles exist (typo detection). applies delta ops to defaults.

**genBrainCliConfigArtifact**: IO operation. reads .claude/settings.json, filters hooks, writes unique config.

**enrollBrainCli**: IO operation. spawns brain CLI with --bare --settings. handles stdio and exit code.

### contract layer

**invokeEnroll**: CLI entry point. composes all operations. must exist.

## principles discovered

1. **pure vs IO separation**: operations that are pure (compute) stay separate from operations with IO (genConfig, enroll)

2. **syntactic vs semantic separation**: parse (syntactic) stays separate from compute (semantic) — different test boundaries

3. **pattern consistency over micro-optimization**: BrainCliEnrollmentOperation could be inline, but DomainLiteral pattern provides consistency

4. **explicit contracts over implicit types**: BrainCliEnrollmentManifest could be inline `{ brain, roles }`, but explicit type documents the contract

---

## summary

reviewed all components with the question: "if we deleted this and had to add it back, would we?"

**deleted (3)**:
- BrainSlug.ts — type alias for string, no behavior
- RoleSlug.ts — type alias for string, no behavior
- BrainCliConfigArtifact.ts — type alias for Artifact<GitFile>, adds indirection

**considered but kept (2)**:
- BrainCliEnrollmentOperation — could inline, kept for pattern consistency
- BrainCliEnrollmentManifest — could inline, kept for explicit contract

**clearly needed (5)**:
- BrainCliEnrollmentSpec — captures mode + ops, needed for composition
- parseBrainCliEnrollmentSpec — syntactic parse, unit testable
- computeBrainCliEnrollment — semantic computation, pure
- genBrainCliConfigArtifact — IO, writes config file
- enrollBrainCli — IO, spawns brain with --bare --settings

**contract layer (2)**:
- invokeEnroll — CLI entry, composes all
- invoke.ts — register command

the blueprint is minimal. each remaining component has a distinct responsibility. further deletion would merge concerns that should stay separate (pure vs IO, syntactic vs semantic).

