# self-review: has-questioned-assumptions

## assumption 1: vault adapter calls `inferKeyrackMechForSet` when mech is null

**evidence:** read `vaultAdapterOsSecure.ts`:
```ts
set: async (input, context?: ContextKeyrack) => {
  const mech =
    input.mech ??
    (await inferKeyrackMechForSet({ vault: vaultAdapterOsSecure }));
```

**what if opposite were true?** fix wouldn't work — vault would fail on null mech

**verdict:** holds. code confirms.

## assumption 2: fillKeyrackKeys passes `keySpec?.mech ?? null` to vault

**evidence:** handoff doc says line 242:
```ts
const mech = keySpec?.mech ?? null;
```

**did wisher say this?** no, inferred from code

**verdict:** holds. code confirms. fix enables this path to work.

## assumption 3: mech as nullable won't break other code

**evidence:** `npm run test:types` passes

**counterexamples?** could be runtime issues untested

**what we did:** checked types only, no integration tests run

**verdict:** needs verification. types pass, but should run integration tests.

## assumption 4: all vaults support the mech prompt flow

**evidence:** os.secure does — it's the primary vault for fill

**what about aws.config?** has its own mech (AWS SSO), single-mech vault, auto-selects

**what about 1password?** supports multiple mechs, same prompt flow

**verdict:** holds. vaults handle single vs multi-mech internally.

## conclusion

| assumption | status |
|------------|--------|
| vault adapter handles null mech | verified in code |
| fill passes mech to vault | verified in code |
| nullable mech won't break | types pass, needs runtime test |
| all vaults support flow | each vault handles internally |

**action:** run integration tests before release to verify runtime behavior.
