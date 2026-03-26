# self review (r2): has-questioned-assumptions

## stone reviewed

3.3.1.blueprint.product.v1

## review criteria

re-review with fresh eyes. what assumptions did I miss in r1?

---

## re-read the blueprint

read through `3.3.1.blueprint.product.v1.i1.md` again, line by line. focus on:
- the `--bare --settings` approach
- unique config file generation
- domain object choices

---

## assumption I missed: DomainLiteral vs DomainEntity

**assumed**: all domain objects extend DomainLiteral

**question**: should any extend DomainEntity instead?

**analysis**:
- `DomainLiteral` = value objects, identity by all properties
- `DomainEntity` = entities, identity by unique keys

for this feature:
- `BrainCliEnrollmentSpec` — value object, no unique key → DomainLiteral ✓
- `BrainCliEnrollmentOperation` — value object, no unique key → DomainLiteral ✓
- `BrainCliEnrollmentManifest` — value object, no unique key → DomainLiteral ✓

**verdict**: assumption holds. all DomainLiteral is correct. these are ephemeral parse/compute outputs, not persisted entities.

---

## assumption I missed: unique config cleanup

**assumed**: unique config files (`.claude/settings.enroll.$hash.json`) are written but never cleaned up

**question**: what happens to these files after session ends?

**analysis**:
- files accumulate in `.claude/` directory
- could grow over time with many sessions

**options**:
1. clean up on brain exit (complex, needs signal handle)
2. add cleanup command (`rhx enroll --cleanup`)
3. document that files accumulate
4. add `.claude/settings.enroll.*.json` to `.gitignore`

**decision**: option 4 is minimal. add gitignore pattern. cleanup is future work.

**verdict**: non-issue for v1. document behavior, add gitignore pattern.

---

## assumption I missed: concurrent sessions (now solved)

**assumed**: one session per repo at a time

**question**: what if user runs `rhx enroll claude --roles mechanic` in two terminals?

**analysis in r1 (old approach)**: both would write to same settings.local.json — race condition

**analysis now (new approach)**: each session generates unique filename (`settings.enroll.$hash.json`). no collision.

**verdict**: solved by unique config file approach. concurrent sessions work.

---

## assumption I missed: default roles source (already fixed)

**assumed**: "default roles" come from somewhere

**question**: where are default roles defined?

**analysis**: blueprint key decision #7 states:
> **rolesDefault = all linked roles** — when compute delta ops (+/-), defaults are all roles in .agent/

**verdict**: already addressed in blueprint. no change needed.

---

## issues found in r2

1. **config file cleanup** — add `.claude/settings.enroll.*.json` to `.gitignore` (note for execution)
2. **concurrent sessions** — solved by unique config file approach (already in blueprint)
3. **default roles source** — already clarified in key decision #7

---

## summary

- [x] re-reviewed with fresh eyes
- [x] found 1 action item: add gitignore pattern for enroll config files
- [x] confirmed concurrent sessions are solved by unique config approach
- [x] confirmed default roles source is clarified in key decision #7

no changes needed to blueprint. gitignore addition is execution detail.
