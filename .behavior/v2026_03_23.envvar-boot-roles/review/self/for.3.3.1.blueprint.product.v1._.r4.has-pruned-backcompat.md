# self review (r4): has-pruned-backcompat

## stone reviewed

3.3.1.blueprint.product.v1

## review criteria

fourth pass. look even deeper for hidden backcompat assumptions.

---

## re-examined: what if someone uses both `rhx enroll` and `claude` directly?

**scenario**: user sometimes runs `rhx enroll claude --roles mechanic` and sometimes runs `claude` directly.

**question**: is there backcompat tension here?

**analysis**:
- `rhx enroll --roles mechanic` generates `.claude/settings.enroll.$hash.json`
- spawns `claude --bare --settings <that-file>`
- user then runs `claude` directly (without rhx enroll)
- claude reads `.claude/settings.json` (repo default) — NOT our generated file
- no conflict — our file is unique and separate

**why this is correct**:
- `--bare` rejects all defaults
- `--settings <path>` loads only our file
- direct `claude` uses normal config
- the two paths are isolated

**verdict**: not a backcompat concern. unique config isolation prevents conflict.

---

## re-examined: what if hooks format changes in claude-code?

**scenario**: future claude-code version changes how hooks work

**question**: did we add backcompat for different hook formats?

**analysis**:
- blueprint doesn't mention hook version support
- we generate hooks in current claude-code format
- if format changes, our generated config may need update

**is this a concern we should address?**:
- no, this is future maintenance, not backcompat
- we build for current claude-code
- future changes are out of scope

**verdict**: not a backcompat concern. we support current claude-code format.

---

## re-examined: is .claude/ vs .agent/ unclear?

**scenario**: user expects .agent/ to be the source of truth

**question**: is write to .claude/settings.enroll.$hash.json unclear?

**analysis**:
- .agent/ is source of truth for role definitions
- .claude/ is where claude-code reads config
- this is the established architecture
- rhx enroll translates from .agent/ to .claude/

**why this follows extant patterns**:
- roles link already does similar translation
- we generate settings.json with hooks from .agent/
- enroll adds dynamic role selection, same translation pattern

**verdict**: not a backcompat concern. follows extant architecture.

---

## re-examined: what if --bare or --settings flags change?

**scenario**: future claude-code removes or changes --bare or --settings flags

**question**: did we add backcompat for different flag syntax?

**analysis**:
- r1 has-questioned-assumptions flagged this as "needs verification before execution"
- we rely on current documented behavior of --bare and --settings
- if flags change, feature breaks

**is this a backcompat concern?**:
- no, this is dependency on current API
- we document the dependency
- future changes require feature update, not backcompat shim

**verdict**: not a backcompat concern. we depend on current claude-code API.

---

## what I learned in r4

1. unique config file prevents conflict with direct `claude` usage
2. hook format version is future maintenance, out of scope
3. .agent/ → .claude/ translation follows extant patterns
4. --bare and --settings dependency is documented, not hidden

---

## why the design holds

the blueprint adds a new feature (dynamic role selection) without:
- break of any extant behavior
- unnecessary backcompat shims
- version complexity

the unique config file design specifically isolates enrolled sessions:
- `.claude/settings.json` — repo default, untouched
- `~/.claude/settings.json` — global, rejected via --bare
- `.claude/settings.enroll.$hash.json` — our unique session config

users who don't use `rhx enroll` see no difference. users who do use it get isolated, explicit role selection.

---

## verdict

- [x] examined deeper scenarios
- [x] found no hidden backcompat assumptions
- [x] unique config isolation is key design choice
- [x] design is clean additive feature
