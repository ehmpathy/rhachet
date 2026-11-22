# F34 — the misnamed `inherit` message states what a render does with the field

- **fork**: keep `as written, the subject still boots always`; or say `a render would ignore it, so the subject would boot always`
- **taken**: the conditional form, in `parseRoleBootSpecFromRaw.ts`; the hint keeps the `--roles -<role>` lever and adds that a clone boots the role refs-only until the fix ships
- **why**:
  - after this pr, no render boots such a spec `as written`: the lenient render sets the spec aside and boots the role refs-only. "still boots always" now states a false fact about every clone
  - the conditional form names what the misnamed key does (a render ignores it) and what that would mean, which holds under the strict `roles boot` read and the lenient birth read alike
  - the lever stays: a reader who wants no refs-only role can still enroll without it
- **bound**: the error class, its exit code, the strict `roles boot` refusal (F16), and the rename/write fix are unchanged. one clause moves
- **rework**: clean. revert the clause in two messages and one snap
- **confidence**: 80%
- **counter (5.3 i006 r12 blocker.4)**: the message rewrite is outside the wish; restore it and the escape route
- **answer**: the escape route is restored. the clause stays, since the old one would now tell each reader a false fact about the boot
- **where**: 5.3 peer review i006 r12 blocker.4
- **verdict**: open
