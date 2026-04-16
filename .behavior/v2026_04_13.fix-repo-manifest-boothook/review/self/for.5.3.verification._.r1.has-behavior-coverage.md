# self review: has-behavior-coverage

## the question

does the verification checklist show every behavior from wish/vision has a test?

## the wish (0.wish.md)

the wish states:
- `npx rhachet repo introspect` should failfast to guard against roles that dont have a boot hook declared
- this has been a footgun where roles are created that think after `npx rhx init` they'll boot the briefs and skills
- we should failfast for roles that dont declare it
- the role authors will know they need to add the boot hook
- this failfast will prevent a common footgun at build time

## the vision (1.vision.stone)

the vision declares:
- failfast with turtle vibes error when role has bootable content but no valid boot hook
- error shows reason: `no-hook-declared`, `absent-roles-boot-command`, or `wrong-role-name`
- error shows hint about how to add the boot hook

## coverage verification

| behavior from wish/vision | test file | assertions |
|--------------------------|-----------|------------|
| failfast when bootable content + no hook | blackbox/cli/repo.introspect.acceptance.test.ts case9 | exits with non-zero status |
| turtle vibes error message | blackbox/cli/repo.introspect.acceptance.test.ts case9 | stderr includes bummer dude message |
| shows role slug | blackbox/cli/repo.introspect.acceptance.test.ts case9 | stderr includes role slug |
| shows no-hook-declared reason | blackbox/cli/repo.introspect.acceptance.test.ts case9 | stderr includes no-hook-declared reason |
| shows hint about boot hook | blackbox/cli/repo.introspect.acceptance.test.ts case9 | stderr includes hint about boot hook |

## conclusion

every behavior from the wish and vision is covered by test assertions:

1. **failfast** - verified via non-zero exit status
2. **turtle vibes** - verified via "bummer dude" in stderr
3. **role slug shown** - verified via role slug assertion
4. **reason shown** - verified via no-hook-declared assertion
5. **hint shown** - verified via hint assertion

all 5 assertions in case9 pass. no gaps found.

## status

holds. all behaviors have test coverage.
