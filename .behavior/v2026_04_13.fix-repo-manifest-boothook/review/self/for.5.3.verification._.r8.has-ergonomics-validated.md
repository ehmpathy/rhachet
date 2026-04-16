# self review: has-ergonomics-validated (round 8)

## the question

does the actual input/output match what felt right in the wish/vision?

## no repros artifact

this behavior has no repros artifact. the wish/vision serve as the source of truth for expected ergonomics.

## wish ergonomics

from `0.wish.md`:

| aspect | wish expectation |
|--------|------------------|
| trigger | `npx rhachet repo introspect` |
| behavior | failfast |
| target | roles without boot hook |
| outcome | role authors will know they need to add it |
| philosophy | explicit, not magic |
| time | build time (not runtime) |

## implementation ergonomics

| aspect | actual implementation |
|--------|----------------------|
| trigger | `repo introspect` command |
| behavior | throws BadRequestError, exits non-zero |
| target | roles with bootable content (`briefs.dirs` or `skills.dirs`) but no valid `hooks.onBrain.onBoot` |
| outcome | error shows role slug + reason + hint |
| philosophy | explicit (requires manual fix) |
| time | build time (introspect runs before publish) |

## comparison

### input

| planned | actual | match? |
|---------|--------|--------|
| run `repo introspect` | run `repo introspect` | yes |

### output on violation

| planned | actual | match? |
|---------|--------|--------|
| failfast | exits non-zero | yes |
| role authors know | error shows role slug | yes |
| know what to add | hint shows exact command | yes |
| build time | introspect runs at build | yes |

### design changes

no drift between wish and implementation. the implementation delivers exactly what was asked:

1. **failfast** — implemented via BadRequestError
2. **role authors will know** — error shows role slug and reason
3. **know what to add** — hint shows `npx rhachet roles boot --role <slug>`
4. **explicit, not magic** — no auto-fix, requires manual action
5. **build time** — guard runs at `repo introspect`, not `rhx init`

## additional refinements beyond wish

the implementation added:

1. **multiple violation types** — detects not just absent hooks, but also wrong command and wrong role name
2. **bulk error** — reports all violations at once
3. **treestruct format** — consistent with other rhachet errors

these refinements enhance ergonomics without change to the core contract.

## conclusion

holds. the actual input/output matches the planned ergonomics from the wish. no drift occurred. the implementation delivers exactly what was requested.

