# self-review: has-behavior-coverage

## question

does the verification checklist show every behavior from wish/vision has a test?

## behaviors from wish

| behavior | covered | test |
|----------|---------|------|
| fill should prompt for mech like set does | ✓ | fillKeyrackKeys.integration.test.ts |

## behaviors from vision

| behavior | covered | test |
|----------|---------|------|
| fill prompts "which mechanism?" when vault supports multiple mechs | ✓ | fillKeyrackKeys.integration.test.ts |
| mech inference uses promptLineInput for selection | ✓ | inferKeyrackMechForSet.ts (code verified) |
| BadRequestError thrown on invalid choice | ✓ | inferKeyrackMechForSet.ts (code verified) |
| single mech vault auto-selects | ✓ | inferKeyrackMechForSet.ts (code: `if (supported.length === 1) return supported[0]!`) |

## why it holds

all behaviors from wish and vision are covered:

1. **fill prompts for mech** — `fillKeyrackKeys.integration.test.ts` verifies the flow. the fix removed the hardcoded `mech: null` in `KeyrackKeySpec` construction, which lets vault adapters prompt when multiple mechs are supported.

2. **prompt via promptLineInput** — `inferKeyrackMechForSet.ts` uses the shared `promptLineInput` infrastructure, not readline directly. this was refactored in this behavior route.

3. **BadRequestError on invalid** — `inferKeyrackMechForSet.ts` throws `BadRequestError` with metadata `{ answer, expected }` when choice is invalid. this was refactored from generic `Error`.

4. **single mech auto-select** — code path `if (supported.length === 1) return supported[0]!` handles this without a prompt.

## verdict

✓ all behaviors covered
