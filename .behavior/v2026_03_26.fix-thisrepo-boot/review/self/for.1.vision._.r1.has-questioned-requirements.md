# self-review: has-questioned-requirements

## requirement 1: "briefs are too large"

**who said?** wisher (vlad)

**evidence?** session boot shows:
```
.agent/repo=.this/role=any
  ├── chars = 82972
  └── tokens ≈ 20743
```
verified: ~20k tokens is a real cost.

**what if we didn't fix?** every session pays 20k tokens for this role alone.

**verdict:** requirement holds ✓

---

## requirement 2: "use boot.yml capacity"

**who said?** wisher

**evidence?** boot.yml parse exists in `parseRoleBootYaml.ts`, schema in `RoleBootSpec.ts`

**simpler alternative?** no — boot.yml is the intended mechanism, already built and tested.

**verdict:** requirement holds ✓

---

## requirement 3: proposed say/ref assignments

**issue found:** my proposed boot.yml is overcomplicated.

i proposed 7 say patterns and 6 ref patterns. that's maintenance burden for questionable value.

**simpler approach:**
```yaml
briefs:
  say:
    - define.rhachet.v3.md
    - define.agent-dir.md
```

verified in `computeBootPlan.ts` (line 67-77):
> `say: ['glob', ...] means say matched, ref unmatched`

so if i just specify say globs, unmatched files become refs automatically. no need to specify ref globs!

**action:** simplify proposed boot.yml to minimal say list.

**verdict:** requirement questioned — simpler solution exists ⚠️

---

## requirement 4: specific say candidates

**issue found:** i guessed which briefs are essential without data.

my heuristic was:
- core identity → say
- howto active tasks → say
- deep theory → ref

but i didn't validate:
- which briefs are actually referenced most?
- are domain.thought briefs used frequently?

**action:** note in vision that wisher should review final say list.

**verdict:** requirement is subjective — need wisher input ⚠️

---

## scope question: documentation

**during review:** wisher noted there's no boot.yml docs for role suppliers.

brain suppliers have docs at `.agent/repo=.this/role=user/briefs/brains/howto.for.suppliers.md`.

similar docs for role suppliers + boot.yml would be valuable. but this is scope expansion from original wish.

**decision needed:** include docs in this behavior or separate wish?

---

## summary

| requirement | status |
|------------|--------|
| briefs too large | holds ✓ |
| use boot.yml | holds ✓ |
| specific say/ref assignments | overcomplicated, simplify ⚠️ |
| which briefs to say | subjective, need wisher input ⚠️ |
| documentation | scope expansion, decision needed |

**key fix:** simplify proposed boot.yml — just specify say globs, let unmatched become refs.
