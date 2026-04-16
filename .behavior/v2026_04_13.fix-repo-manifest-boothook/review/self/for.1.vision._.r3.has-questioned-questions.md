# self-review r3: has-questioned-questions

## verification: all questions triaged?

the vision now has questions marked as:
- `[wisher]` — migration path
- `[research]` — blast radius
- `[answered]` — boot field, typed-skills-only roles

**check:** are there any questions i overlooked?

re-read the vision...

### from "open questions & assumptions"

the vision lists 3 assumptions:
1. every role in registry should boot — **this is not a question, it's the design**
2. boot.yml is the mechanism — **answered: yes, boot field is correct**
3. failfast is better than auto-fix — **answered: per wish, explicit > magic**

all assumptions are addressed.

### from "what is awkward"

the vision lists 3 awkward points:
1. boot.yml requirement on skill-only roles — **answered: they shouldn't be in registry**
2. registry as gatekeeper — **design decision, accepted**
3. friction is the feature — **design decision, accepted**

these are not open questions — they're acknowledged tradeoffs.

### overlooked questions?

are there questions i should have asked but didn't?

**question: what happens if boot.yml file doesn't exist but boot field is declared?**

this would be a validation error — the role declares boot but the file is absent. should introspect also validate the boot.yml file exists?

**triage:** can this be answered via logic?

yes. if `boot: { uri }` points to a file that doesn't exist, that's a build error. introspect should validate file exists.

**verdict:** [answered] — add validation that boot.yml file exists when boot field is declared.

i'll update the vision to include this.

---

## summary

| question | triage | action |
|----------|--------|--------|
| migration path | [wisher] | confirm immediate vs deprecation |
| blast radius | [research] | inventory extant packages |
| boot field vs bootable | [answered] | boot field is correct |
| typed-skills-only roles | [answered] | not in registry |
| boot.yml file exists | [answered] | add file existence validation |

---

## issue found and fixed

**issue:** vision didn't specify validation that boot.yml file exists.

**fix:** introspect should validate that when `boot: { uri }` is declared, the file at that path exists.

**action taken:** updated vision contract outputs to include:
- `on failure (boot file absent): error when boot.yml file doesn't exist at declared path`

this ensures the validation catches both:
1. roles without boot field declared
2. roles with boot field that points to absent file

---

## deeper reflection: questions i didn't think to ask

the first pass found the obvious questions. but what questions did i fail to consider?

### question: what about roles under development?

a role author is iterating. they've defined the role, exported it in the registry, but haven't created boot.yml yet. they run introspect to test something else.

**now introspect fails.**

is this friction intentional or accidental?

**analysis:**
- the wish says "failfast to guard against roles that dont have a boot hook declared"
- the footgun is shipping a role without boot — not developing one
- but introspect is run during development, not just at release

**implication:** the error message must be actionable enough that a developer mid-iteration understands "i need to add boot.yml before this role is shippable" — not "introspect is broken."

**verdict:** the vision's error message includes hints. this is handled. but worth noting: friction during development is intentional. the pattern is "if it's in the registry, it must be bootable."

### question: what about CI breaking on extant repos?

when this change lands, CI pipelines that run `repo introspect` will fail if any role lacks boot field.

**analysis:**
- this is the blast radius question again, but from a different angle
- the `[research]` triage defers to later phase
- but the vision should acknowledge this consequence

**implication:** the migration path question isn't just "how do we communicate this to authors" — it's "how many CIs will break, and is that acceptable?"

the wish says "failfast for now" which suggests the wisher accepts CI breakage. but has the wisher considered the scope?

**verdict:** [wisher] question strengthened. the wisher should confirm: "are you ok with CI breaking for extant repos until they add boot.yml?"

### question: what about conditional bootability?

could a role be bootable in some contexts but not others? e.g., a role that boots in prod but not in test?

**analysis:**
- the boot.yml contains curated selections — it doesn't have conditional logic
- the registry is static — no runtime conditions
- if a role shouldn't boot in some env, that's handled at `rhx init` time, not introspect

**verdict:** [answered] — conditional bootability is out of scope for introspect. introspect validates "this role declares its boot configuration." runtime boot decisions are separate.

### question: what if boot.yml is a symlink?

the validation says "file at that path exists." what if the path is a symlink to a file that exists? what if it's a broken symlink?

**analysis:**
- symlinks that point to real files should pass
- broken symlinks should fail (the file doesn't exist)
- this is standard fs.existsSync behavior

**verdict:** [answered] — standard file existence check handles symlinks correctly. broken symlinks fail, which is correct.

### question: what about monorepos with multiple role packages?

a monorepo might have:
- `packages/rhachet-roles-core/` with 5 roles
- `packages/rhachet-roles-advanced/` with 3 roles

each runs `repo introspect` independently. does this change affect them differently?

**analysis:**
- each package has its own RoleRegistry
- each introspect validates its own roles
- no cross-package concerns

**verdict:** [answered] — each package is independent. no special monorepo considerations.

### question: what about the error recovery path?

a user runs introspect, sees the error. what do they do next?

**analysis:**
the error message says:
- which roles lack boot
- hint: add `boot: { uri: __dirname + '/boot.yml' }` to the role
- why: roles in registry are expected to boot

but it doesn't say:
- how to create a boot.yml
- what should go in boot.yml
- where to find examples

**implication:** the hint tells them WHAT to add to the role definition, but not HOW to create the boot.yml file itself.

**verdict:** the vision's error message is actionable for adding the `boot` field. but role authors may not know how to create boot.yml content.

**question:** should the hint include a link to docs or an example?

this is a UX polish question, not a blocker. the core functionality is sound. but better error messages reduce support burden.

**action:** note this as potential enhancement — error message could include `npx rhachet roles boot --help` or doc link.

---

## revised summary

| question | triage | action | depth |
|----------|--------|--------|-------|
| migration path | [wisher] | confirm CI breakage is acceptable | strengthened |
| blast radius | [research] | inventory extant packages | unchanged |
| boot field vs bootable | [answered] | boot field is correct | unchanged |
| typed-skills-only roles | [answered] | not in registry | unchanged |
| boot.yml file exists | [answered] | add file existence validation | unchanged |
| roles under development | [answered] | friction is intentional | new |
| conditional bootability | [answered] | out of scope | new |
| symlinks | [answered] | standard fs behavior | new |
| monorepos | [answered] | independent packages | new |
| error recovery UX | [nitpick] | could enhance hint | new |

---

## what changed in this reflection

the first pass categorized questions. this pass asked: "what questions did i not think to ask?"

found 5 additional questions i hadn't considered:
1. development workflow impact — answered (friction intentional)
2. CI breakage scope — strengthened wisher question
3. conditional bootability — answered (out of scope)
4. symlink handling — answered (standard behavior)
5. monorepo considerations — answered (independent)

and one UX enhancement:
6. error message could link to docs/examples — noted as nitpick

the [wisher] question is now stronger: it's not just "immediate vs deprecation" but "are you ok with CI breaking for extant repos?"

---

## final assessment

all discoverable questions have been triaged. the vision is complete enough for human review.

remaining unknowns:
- wisher decision on migration path
- research on blast radius (how many extant roles lack boot)

these cannot be addressed by me alone — they require human input and codebase research.
