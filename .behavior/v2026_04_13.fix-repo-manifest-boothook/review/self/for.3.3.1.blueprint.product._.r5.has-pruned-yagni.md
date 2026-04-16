# self-review: has-pruned-yagni (round 5)

## question

were any components added that were not prescribed? did we add extras "while we're here" or "for future flexibility"?

## deeper methodology

r4 reviewed at component level. r5 goes deeper:
- question whether components could be combined
- question whether test cases overlap
- question whether fixture is minimal
- question whether patterns are habit or need

---

## probe questions

### could find and assert be combined into one file?

**current blueprint:** two files - `findRolesWithBootableButNoHook.ts` and `assertRegistryBootHooks.ts`

**could they be one file?**
- inline find logic in assert: fewer files
- but unit tests would be harder (8 find cases + 5 assert cases = mixed)
- extant pattern: assertRegistrySkillsExecutable uses findNonExecutableShellSkills

**is this pattern YAGNI or evidence-based?**
- extant pattern is evidence (not habit I invented)
- separation improves testability (unit test find logic in isolation)
- vision doesn't prescribe separation, but doesn't prescribe combination either

**verdict:** holds — follows extant pattern, improves testability

---

### do test cases overlap?

**findRolesWithBootableButNoHook cases:**

| case | what it tests | unique value? |
|------|---------------|---------------|
| [case1] | all valid → empty | baseline |
| [case2] | briefs.dirs only | criteria.usecase.2 |
| [case3] | skills.dirs only | criteria.usecase.2 variant |
| [case4] | both dirs | criteria.usecase.2 variant |
| [case5] | typed skills only | criteria.usecase.3 |
| [case6] | inits only | criteria.usecase.6 |
| [case7] | empty onBoot array | criteria.boundary |
| [case8] | undefined hooks | criteria.boundary variant |
| [case9] | empty briefs.dirs array | criteria.boundary |
| [case10] | multiple invalid | criteria.usecase.5 |

**overlap analysis:**
- case2/3/4: all test "bootable without hook" — could we test just one?
  - NO: vision error shows "has: briefs.dirs" vs "has: skills.dirs" vs "has: briefs.dirs, skills.dirs"
  - each variant produces different error message
- case7/8: both test "no valid hook" — could we test just one?
  - NO: different null paths (empty array vs undefined property)

**verdict:** no overlap found — each case tests distinct criteria requirement or boundary

---

### is the fixture minimal?

**current fixture:**
```
with-roles-package-no-hook/
├── index.js
├── readme.md
├── briefs/
│   └── example.md
└── skills/
    └── example.sh
```

**do we need both briefs/ and skills/?**
- guard triggers on briefs.dirs OR skills.dirs
- one directory would suffice for guard to trigger
- but: both dirs shows error format "has: briefs.dirs, skills.dirs"

**question:** does acceptance test need to verify both-dirs error format?
- vision example shows both
- but acceptance test [case3] just checks "stderr contains role slug"
- error format is tested in unit test for assert function

**potential prune:** fixture could have only briefs/, not skills/

**but wait:** is this premature optimization?
- fixture with both dirs matches typical role structure
- removal of skills/ saves one file, adds complexity ("why only briefs?")
- the fixture should represent realistic invalid role

**verdict:** fixture structure holds — realistic representation of invalid role

---

### do acceptance tests overlap with unit tests?

**acceptance test cases:**
| case | what it tests | unique vs unit? |
|------|---------------|-----------------|
| [case1] | valid → success | blackbox verification |
| [case2] | invalid → exit != 0 | blackbox exit code |
| [case3] | stderr contains slug | blackbox error format |
| [case4] | stderr contains hint | blackbox error format |
| [case5] | typed-skills-only → success | blackbox positive path |

**overlap with unit tests?**
- unit tests verify find logic and error construction
- acceptance tests verify CLI contract (exit code, stdout/stderr)
- these are different layers with different purposes

**verdict:** no overlap — unit tests internals, acceptance tests contract

---

### did we add "while we're here" features?

**checklist:**
- [ ] verbose mode for debug? — no
- [ ] --skip-boot-check flag? — no
- [ ] warn mode before error? — no
- [ ] auto-fix suggestions? — no (just hint)
- [ ] config file to customize? — no

none added.

---

### did we add "for future flexibility"?

**checklist:**
- [ ] plugin hooks for custom checks? — no
- [ ] abstract base class for guards? — no
- [ ] generic violation type? — no
- [ ] registry.bootable[] track list? — no (vision said no)

none added.

---

## conclusion

deeper probe found:
1. find/assert separation follows extant pattern — holds
2. test cases are non-overlap — each maps to criteria — holds
3. fixture has both dirs for realistic representation — holds
4. acceptance tests verify contract, unit tests verify internals — holds
5. no "while we're here" features — holds
6. no "for future flexibility" abstractions — holds

**verdict:** **pass** — no YAGNI violations found at deeper probe level.

