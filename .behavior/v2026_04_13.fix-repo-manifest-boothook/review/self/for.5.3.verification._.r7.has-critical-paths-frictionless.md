# self review: has-critical-paths-frictionless

## the question

are the critical paths frictionless in practice?

## the critical path

since there is no repros artifact, i derive the critical path from the wish and vision:

**path: role author builds rhachet-roles package without boot hook**

1. user creates a rhachet-roles package with `briefs.dirs` or `skills.dirs`
2. user forgets to add `hooks.onBrain.onBoot` with `npx rhachet roles boot --role <slug>`
3. user runs `npx rhachet repo introspect`
4. command fails fast with a helpful error

## frictionless verification

### does the error message help?

the error includes:
- **turtle vibes** ("bummer dude") — friendly, not scary
- **role slug** — user knows which role has the problem
- **reason** ("no-hook-declared") — user knows what is wrong
- **hint** ("add `npx rhachet roles boot --role <slug>` to hooks.onBrain.onBoot") — user knows how to fix

### is the fix obvious?

yes. the hint tells the user exactly what to add and where. they can copy the command and add it to their role configuration.

### does it fail fast?

yes. the error occurs at `repo introspect` time, not at `rhx init` time. users discover the problem before they publish a broken package.

## the acceptance test confirms frictionless path

case9 in repo.introspect.acceptance.test.ts runs through this exact path:
1. create a rhachet-roles package with bootable content but no hook
2. run `repo introspect`
3. verify exit code is non-zero
4. verify error contains helpful message

all 5 assertions pass.

## conclusion

holds. the critical path is frictionless:
- error is friendly (turtle vibes)
- error is specific (role slug, reason)
- error is actionable (hint with exact fix)
- error is timely (at build time, not runtime)
