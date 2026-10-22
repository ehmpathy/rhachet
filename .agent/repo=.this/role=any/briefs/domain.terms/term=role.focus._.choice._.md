# domain.term: role.focus

term.chosen   = focus        # plural: foci
term.kind     = noun
term.boundary = role
term.synonyms.forbidden:
- scope
- slice
- subset
- narrow
- filter

## .what

**the subjects of one role that an actor boots — the role's hooks stay whole.**

```
--roles mechanic::101        # mechanic, at focus 101
--roles +mechanic::101,flow  # one role, focus on two subjects (they union)
--roles mechanic             # mechanic whole — no focus
```

a focus names **declared subjects** (`subject.$slug` sections of the role's `boot.yml`). it
narrows what the role **says** at boot, never what the role **does**: every hook the role grants
follows the role, not the focus.

| the role grants | at a focus |
|---|---|
| hooks | all of them, always |
| `always` briefs and skills | kept, unless every focused subject declares `inherit: { always: false }` |
| subject briefs and skills | only the focused subjects' |
| the other subjects | named once, in the role's `<focus given elsewhere always/>` line |

## ⚠️ .the boundary — `role.focus` is not `brain.focus`

the repo already speaks `BrainFocus = { concept, context }`
(`domain.thought/define.term.brain.focus`): what a **brain** attends to, inferred and curated. a
**role** focus is a declared, exact set of subjects chosen at enroll. same word, two boundaries —
so the term is qualified, never re-coined (`rule.require.boundary-qualified-terms`).

## .refs
- `src/domain.objects/RoleLinkRefAtFocus.ts`                     # a linked ref, with its focus
- `src/domain.operations/roles/focus/asRoleFocusParts.ts`        # `role::subject` → role + subject
- `src/domain.operations/roles/focus/asRoleFocusMap.ts`          # one entry per role, foci unioned
- `src/domain.operations/roles/focus/asRoleFocusChanges.ts`      # narrow · move · widen
- `src/domain.operations/roles/focus/ambient/`                   # the repo actor's foci record
- `src/domain.operations/boot/assertRoleFocusDeclared.ts`        # an undeclared subject refuses

## .reason
- `term=role.focus._.choice.reason.md` — etymology, the rejected peers, the boundary
