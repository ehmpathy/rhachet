# self-review r2: has-pruned-yagni

reviewed the blueprint for extras not prescribed by the wish or vision.

---

## component 1: boot.yml file

**was this explicitly requested?**
yes. wish states:
> "we should use the boot.yml capacity and drop a boot.yml in that role"

**is this minimum viable?**
yes. one file with a list of globs. no abstractions.

**verdict:** required ✓

---

## component 2: say globs (7 briefs)

**was this explicitly requested?**
partially. wish states:
> "not all of them need to be said, refs are often times more than sufficient!"

the user then explicitly specified which 7 briefs to say.

**is this minimum viable?**
yes. a list of exact file paths. no wildcards, no complex patterns.

**did we add "future flexibility"?**
no. we used exact paths, not glob patterns like `briefs/*.md`. simpler is better.

**verdict:** required — user specified ✓

---

## component 3: codepath tree in blueprint

**was this explicitly requested?**
no. the blueprint template requested it.

**is this minimum viable?**
yes. all [○] retain — we documented that no code changes are needed.

**did we add extras "while we're here"?**
no. we didn't propose any code changes. pure config.

**verdict:** required by template — but content is minimal ✓

---

## component 4: test coverage section

**was this explicitly requested?**
the template requested it.

**is this minimum viable?**
yes. we stated "no new tests needed" with justification. no new work.

**did we optimize before needed?**
no. we explicitly declined to add tests because extant coverage is sufficient.

**verdict:** required by template — content says no new work ✓

---

## YAGNI violations found: none

the blueprint proposes exactly:
1. create boot.yml (wish asked)
2. list 7 briefs (user specified)
3. no code changes
4. no new tests

no extras were added. no abstractions. no "future flexibility." no optimization.

---

## counterfactual: what could have been added but wasn't?

| could have added | why we didn't |
|------------------|---------------|
| skills.say curation | user didn't ask, skills are small |
| glob wildcards | exact paths are clearer |
| subject mode config | simple mode is sufficient per vision |
| validation tests | extant tests cover all semantics |
| comments to explain each brief | the brief names are self-evident |

all of these would be YAGNI violations. we avoided them.

---

## summary

the blueprint is minimum viable:
- 1 file
- 7 lines of globs
- 0 code changes
- 0 new tests

YAGNI: satisfied ✓
