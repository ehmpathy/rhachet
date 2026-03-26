# self review (r5): has-consistent-conventions

## stone reviewed

3.3.1.blueprint.product.v1

## review criteria

check for divergence from extant name conventions and patterns.

---

## searched codebase for name patterns

searched for:
- domain object names in `src/domain.objects/`
- operation names in `src/domain.operations/`
- cli command patterns in `src/contract/cli/`

---

## check: domain object names

**blueprint proposes**:
- BrainCliEnrollmentSpec
- BrainCliEnrollmentOperation
- BrainCliEnrollmentManifest

**extant patterns**:
- Role (singular)
- RoleRegistry
- BrainSpec
- BrainAtom, BrainRepl

**analysis**:
- `BrainCliEnrollmentSpec` follows `BrainSpec` pattern — [noun][context][type] ✓
- `BrainCliEnrollmentOperation` follows [noun][context][type] pattern ✓
- `BrainCliEnrollmentManifest` follows [noun][context][type] pattern ✓
- `BrainCli` prefix distinguishes from `BrainRepl`/`BrainAtom` (SDK) patterns ✓

**why the names hold**:
- `BrainCli` = brain invoked via CLI (vs SDK)
- `Enrollment` = the enrollment operation
- `Spec`, `Operation`, `Manifest` = type suffixes per extant patterns

**verdict**: all domain object names are consistent with extant conventions.

---

## check: operation names

**blueprint proposes**:
- parseBrainCliEnrollmentSpec
- computeBrainCliEnrollment
- genBrainCliConfigArtifact
- enrollBrainCli

**extant patterns**:
- parse* for parsers (e.g., parseYaml, parseSpec)
- compute* for deterministic transforms
- gen* for find-or-create (findsert)
- verb* for imperative operations

**analysis**:
- `parseBrainCliEnrollmentSpec` — parser, follows parse* pattern ✓
- `computeBrainCliEnrollment` — deterministic transform from spec to manifest ✓
- `genBrainCliConfigArtifact` — creates config file, gen* is correct ✓
- `enrollBrainCli` — spawns brain, verb-first ✓

**verdict**: all operation names follow extant get/set/gen conventions.

---

## check: cli command names

**blueprint proposes**:
- `rhx enroll <brain> --roles <spec>`

**extant patterns**:
- `rhx roles boot` — verb at end
- `rhx roles link` — verb at end
- `rhx run --skill` — flag-based
- `rhx ask`, `rhx act` — top-level brain commands

**why `rhx enroll` is correct**:
- subject is the brain, not the roles
- matches `rhx ask`, `rhx act` — top-level brain commands
- `rhx enroll claude` reads as "enroll claude (with roles)"

**verdict**: command name is consistent with brain-centric commands.

---

## check: file names

**blueprint proposes**:
- parseBrainCliEnrollmentSpec.ts
- computeBrainCliEnrollment.ts
- genBrainCliConfigArtifact.ts
- enrollBrainCli.ts
- invokeEnroll.ts

**extant patterns**:
- filename === operationName (per rule.require.sync-filename-opname)
- invoke* for cli handlers

**why it holds**:
- all filenames match their exported operation names ✓
- `invokeEnroll` follows `invokeAct`, `invokeAsk` pattern ✓

**verdict**: all file names are consistent.

---

## check: test file names

**blueprint proposes**:
- parseBrainCliEnrollmentSpec.test.ts (unit)
- computeBrainCliEnrollment.integration.test.ts
- genBrainCliConfigArtifact.integration.test.ts
- invokeEnroll.integration.test.ts
- invokeEnroll.play.integration.test.ts

**extant patterns**:
- *.test.ts for unit tests
- *.integration.test.ts for integration tests
- *.play.integration.test.ts for journey/playtest tests

**why it holds**:
- all test file names follow extant conventions ✓
- play tests are the correct location for journey coverage ✓

**verdict**: all test file names are consistent.

---

## check: directory structure

**blueprint proposes**:
- src/domain.objects/ for domain objects
- src/domain.operations/enroll/ for operations
- src/contract/cli/ for cli handlers

**extant patterns** (verified via `ls src/`):
- `src/domain.objects/` — uses dot separator ✓
- `src/domain.operations/` — uses dot separator ✓
- `src/contract/cli/` — uses slash separator ✓

**why it holds**: blueprint uses correct directory structure per extant patterns

**verdict**: directory structure is consistent.

---

## principles reinforced

1. **[noun][context][type]** — domain objects follow BrainCliEnrollment* pattern
2. **parse/compute/gen verbs** — operations follow extant verb prefixes
3. **brain-centric commands** — `rhx enroll` matches `rhx ask`, `rhx act`
4. **filename === opname** — all files sync with their operations

---

## verdict

- [x] checked domain object names — consistent
- [x] checked operation names — follow verb-first
- [x] checked cli command names — consistent with brain commands
- [x] checked file names — match operation names
- [x] checked test file names — follow extant patterns
- [x] checked directory structure — uses correct separators
