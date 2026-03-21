# self-review: has-pruned-backcompat (round 3)

## reviewed artifact

`.behavior/v2026_03_19.fix-brain-context/3.3.1.blueprint.product.v1.i1.md`

---

## backwards compatibility review

### concern 1: `TContext = Empty` default

**what**: blueprint specifies `BrainAtom<TContext = Empty>` and `BrainRepl<TContext = Empty>`.

**did the wisher explicitly say to maintain this compatibility?** yes. wish line:
> "backwards compatibility: `TContext = Empty` default"

vision explicitly states:
> "backwards compatibility: extant brains with `Empty` context still work"

**evidence this is needed**: yes. the wish provides the exact signature with `= Empty` default.

**verdict**: holds. explicitly requested.

---

### concern 2: `context?: Empty` accepts `{}` or undefined

**what**: blueprint states "context?: Empty accepts {} or undefined — no break for extant callers".

**did the wisher explicitly say this?** yes. vision section on backwards compatibility:
> "`BrainAtom` without generic infers `BrainAtom<Empty>` — no change for extant code"

**evidence this is needed**: Empty from type-fns is designed to accept {} or undefined. this is how the type works.

**verdict**: holds. this is type semantics, not extra work.

---

### concern 3: genContextBrain continues to pass `{}`

**what**: blueprint states "genContextBrain continues to pass {} — backwards compat preserved".

**did the wisher explicitly say this?** not explicitly. however:

**evidence this is needed**: genContextBrain creates ContextBrain instances. if it currently passes `{}` to brain.ask(), this change should not break it. since `TContext = Empty` and Empty accepts `{}`, no change is needed.

**question**: is this backwards compat or just non-impact?

**verdict**: holds. not extra work — genContextBrain needs no changes, which is the backwards compat.

---

## open questions

none. all backwards compatibility concerns trace to wish or are type semantics.

---

## conclusion

backwards compatibility in blueprint is:
1. explicitly requested (`TContext = Empty`)
2. type semantics (Empty accepts {} or undefined)
3. non-impact (genContextBrain needs no changes)

no unasked-for backwards compat found.

