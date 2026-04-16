# review.self: has-thorough-test-coverage

## question: does the implementation have thorough test coverage?

### test coverage by grain

| grain | file | test type | tests |
|-------|------|-----------|-------|
| transformer | `findRolesWithBootableButNoHook.ts` | unit | 13 cases |
| orchestrator | `assertRegistryBootHooksDeclared.ts` | unit | 9 cases |
| contract | `repo introspect` CLI | acceptance | case9 (4 assertions) |

### transformer tests (findRolesWithBootableButNoHook)

covers all three violation reasons:
- `no-hook-declared` — role lacks `hooks.onBrain.onBoot`
- `absent-roles-boot-command` — hook has no `roles boot` command
- `wrong-role-name` — hook boots wrong role

covers edge cases:
- role with no bootable content → no violation
- role with valid hook → no violation
- multiple violations across roles
- hook with correct role name in various formats

### assertion tests (assertRegistryBootHooksDeclared)

covers output format:
- turtle vibes header: "bummer dude..."
- treestruct format for errors
- role slug in output
- violation reason in output
- hint with fix command

covers behavior:
- no violations → no error
- violations → throws BadRequestError

### acceptance tests (repo.introspect.acceptance.test.ts)

case9 covers end-to-end:
- exits with non-zero status
- stderr includes "bummer dude"
- stderr includes role slug "mechanic"
- stderr includes "no-hook-declared" reason
- stderr includes hint about boot hook

### coverage assessment

**verdict**: thorough coverage. all grains tested. all violation reasons tested. all output format requirements tested.

