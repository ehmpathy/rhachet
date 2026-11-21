# F24 — the rule resolver stays one file, and the matcher check stays a denylist

## .the fork

i007 r011 nitpick.5 asks three things of `getOneHookDispatchRuleOfBrainHook`:

1. share the exact-list matcher pattern across the portability check, the matcher union and bash
2. split the pure route parse (`asHookCommandRoute`, a unit caselist) from the i/o (discovery, the
   shebang read)
3. turn `isHookMatcherPortable` from a denylist of js-only constructs into an allowlist of ere-safe
   ones, so it fails closed

## .taken

1, now: `HOOK_DISPATCH_MATCHER_LIST` in `constants.ts`, read by both typescript sites; the bash
pattern is held to it by `constants.manifest-parity.integration.test.ts`.

2 and 3, not in this pr:

- **2**: the file exports one procedure; its other procedures are private. the parse is covered
  through the public function: the unit caselist (`getOneHookDispatchRuleOfBrainHook.test.ts`) for
  every shape that needs no file, and the integration caselist with a real skill file for the
  run-flag reads. a split moves code with no change in what is tested
- **3**: an allowlist changes which matchers the sync accepts. every live role matcher is an exact
  list (`Bash`, `Write|Edit`, …), which never reaches the regex path, so neither form refuses a live
  hook today; the choice of ere subset to allow is a contract call best made with #765, whose
  per-rule filter adds the next regex surface

## .rework

clean: both are local to `src/domain.operations/brains/dispatch/`.

## .confidence

80%. the allowlist is the stricter form; what it should admit is unsettled.

## .where

`getOneHookDispatchRuleOfBrainHook.ts` · `isHookMatcherPortable.ts`

## .verdict

open, for the director at the pr.
