# self-review r4: has-no-silent-scope-creep

## fourth pass: question the backups

r3 documented and backed up three scope creep items. this pass questions whether those backups are truly justified.

---

## SC1: exit code consistency — deeper scrutiny

**what happened:** four `exit(1)` calls changed to `exit(2)`

**backup rationale:** semantic consistency with blueprint's exit(2)

**hostile question:** should we have ONLY changed exit codes for 1password, to leave others at exit(1)?

**investigation:**

if we left other constraints at exit(1):
- 1password op cli not installed → exit(2)
- sudo key requires env sudo → exit(1)
- key not allowed in this env → exit(1)
- owner not in recipients → exit(1)

a change to only 1password would create mixed semantics:
- callers cannot rely on exit code to distinguish constraint vs malfunction
- "some constraints are exit(2), some are exit(1)" = unpredictable

**verdict:** backup holds. consistency wins over minimal diff.

---

## SC2: host manifest index — deeper scrutiny

**what happened:** added unencrypted index file with slugs

**backup rationale:** necessary for correct locked/absent status

**hostile question:** could we have deferred this to a separate ticket?

**investigation:**

the criteria says:
- report "absent" when item deleted from 1password
- report "locked" when item exists but not unlocked

without the index file:
- 1password keys would show "absent" instead of "locked"
- user would think key needs re-set when it just needs unlock

**verdict:** backup holds. index file is required to meet criteria. to defer would ship broken status reports.

---

## SC3: failhide fixes — deeper scrutiny

**what happened:** catch blocks now rethrow system errors

**backup rationale:** legitimate bug fix discovered in the course of implementation

**hostile question:** should we have reverted these fixes and filed a separate bug ticket?

**investigation:**

the bug:
- catch blocks silently swallowed ALL errors
- permission denied → treated as "no key found"
- could cause silent data loss

to delay the fix:
- risk: silent data loss continues
- cost: overhead of a separate ticket
- benefit: smaller diff in this pr

to fix now:
- risk: none (fix is correct)
- cost: included in this diff
- benefit: no silent data loss

**verdict:** backup holds. a delay in the fix creates risk. inclusion in this pr is the right call.

---

## conclusion

| scope creep | r3 verdict | r4 verdict |
|-------------|------------|------------|
| SC1: exit code consistency | backup | **holds** — consistency is correct |
| SC2: host manifest index | backup | **holds** — required for criteria |
| SC3: failhide fixes | backup | **holds** — risk of delay > cost of inclusion |

all backups are justified. no silent scope creep detected.
