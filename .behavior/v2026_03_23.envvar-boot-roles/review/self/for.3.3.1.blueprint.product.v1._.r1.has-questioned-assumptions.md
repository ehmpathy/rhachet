# self review (r1): has-questioned-assumptions

## stone reviewed

3.3.1.blueprint.product.v1

## review criteria

question all technical assumptions. for each assumption, ask:
- what do we assume here without evidence?
- what if the opposite were true?
- is this architecture choice based on evidence or habit?
- what exceptions or counterexamples exist?
- could a simpler approach work?

---

## assumption 1: `--bare` flag exists on claude CLI

**what we assume**: claude CLI has a `--bare` flag that skips auto-discovery of hooks, skills, MCP, CLAUDE.md

**evidence**: research in 3.1.1.research.external.product.access documented this flag

**what if opposite**: if `--bare` doesn't exist, we cannot reject default configs — the entire feature is blocked

**verification needed**: confirm `claude --help` shows `--bare` flag

**status**: needs verification before execution

---

## assumption 2: `--settings` flag accepts custom path

**what we assume**: `--settings <path>` loads settings from specified file only

**evidence**: research documented this works with `--bare`

**what if opposite**: if `--settings` merges with defaults instead of overwrite, the feature is broken

**verification needed**: test `claude --bare --settings <path>` actually uses only that file

**status**: needs verification before execution

---

## assumption 3: hooks have `author` field for filter

**what we assume**: hooks in .claude/settings.json have an author field (e.g., `author: mechanic`)

**evidence**: this is how rhachet roles link works — each role's hooks are tagged with author

**what if opposite**: if author field doesn't exist, we cannot filter hooks by role

**verification**: check extant .claude/settings.json structure in any rhachet repo

**status**: verified — this is extant rhachet behavior (roles link creates author-tagged hooks)

---

## assumption 4: .agent/repo=*/role=*/ structure exists

**what we assume**: roles are discoverable via filesystem scan of .agent/ directory

**evidence**: this is how rhachet roles link works

**what if opposite**: if .agent/ structure is different, role discovery fails

**verification**: this is extant rhachet behavior, not an assumption

**status**: verified — known rhachet pattern

---

## assumption 5: fastest-levenshtein is available

**what we assume**: fastest-levenshtein package is already a dependency

**evidence**: blueprint says "reuse for suggestions"

**what if opposite**: if not installed, typo suggestions fail at runtime

**verification needed**: check package.json for fastest-levenshtein

**status**: needs verification — add as dependency if absent

---

## assumption 6: passthrough args work with commander

**what we assume**: commander's `allowUnknownOption` passes through unknown args to brain CLI

**evidence**: extant pattern in rhachet CLI (other commands use this)

**what if opposite**: if args are consumed or mangled, passthrough feature fails

**edgecase**: do not define `-r` shorthand for `--roles` — could conflict with brain's `-r` flags

**status**: verified — known pattern, but avoid short flags

---

## assumption 7: spawn can forward exit code

**what we assume**: node's spawn can forward the child process exit code to parent

**evidence**: standard node behavior via `child.exitCode`

**what if opposite**: if exit code not forwarded, callers cannot detect brain failures

**status**: verified — node.js standard behavior

---

## assumption 8: unique hash prevents collision

**what we assume**: hash in `settings.enroll.$hash.json` is unique enough to prevent collision

**evidence**: standard practice for temp file identification

**what if opposite**: if collisions occur, concurrent sessions could corrupt each other

**verification**: use uuid or timestamp+random for uniqueness

**status**: verified — standard practice, use uuid

---

## assumption 9: genBrainHooksAdapterForClaudeCode is reusable

**what we assume**: extant hook generation can be filtered to subset of roles

**question**: does the extant code support role filter? or does it always generate for all roles?

**analysis**: if extant code generates for all linked roles, we need to:
1. either modify it to accept a roles filter
2. or read the generated config and filter hooks manually
3. or generate config from scratch

**status**: needs code review — may need adjustment to extant code

---

## critical assumptions to verify

before execution, verify:

1. `claude --bare` exists and works as documented
2. `claude --settings <path>` loads only from that path (with --bare)
3. fastest-levenshtein is installed or add as dependency
4. genBrainHooksAdapterForClaudeCode can be filtered or needs modification

---

## issues found and fixes

### issue 1: unverified external dependency (--bare, --settings)

**problem**: blueprint assumes claude CLI flags without runtime verification

**fix**: add verification step to execution phase 0 — test flags work before build

### issue 2: fastest-levenshtein may be absent

**problem**: blueprint assumes package is available

**fix**: check package.json; if not present, add to dependencies

### issue 3: avoid -r shorthand

**problem**: `-r` could conflict with brain CLI's own flags

**fix**: use only `--roles` long form; do not add short alias

---

## summary

reviewed 9 assumptions:
- 5 verified (extant rhachet/node patterns)
- 4 need verification before execution (--bare, --settings, fastest-levenshtein, hooks filter)

these are not blockers for the blueprint — they are verification steps for execution phase 0.

no changes needed to blueprint. assumptions are reasonable and based on documented behavior.
