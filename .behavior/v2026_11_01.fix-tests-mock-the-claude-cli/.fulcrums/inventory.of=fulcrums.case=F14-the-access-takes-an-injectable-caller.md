# F14 — the access takes an injectable caller

## .the fork

the access's own integration test sits off the registry, so the fence refuses before any bin or
login read. its bin and login stages are then reachable only from the smoketests and the skill.

| option | what it does | the cost |
|---|---|---|
| A. `genRealClaudeAccess(input, context?)` with `context.getCaller` (default: jest's testPath) | the integration test drives each kind against a temp HOME and PATH; the default context still proves the wire clamp | a seam a suite could misuse to vouch for itself |
| B. register the access's own test as a smoketest | no seam | a test of infra counted as a smoketest of claude; the fence's wire clamp is lost |
| C. leave the stages proven by the smoketests alone | no seam | the gather → verdict → throw wire for `host` and `bin: null` has no direct test |

## .taken

A. F8's guard holds in practice: no smoketest passes a context, and the drift check flags an access
signature off the registry, so a suite that injects a caller still reads `unregistered`.

## .rework

clean — one optional parameter.

## .confidence

80%.

## .where

`3.3.1.blueprint.product.yield.md` — `.codepath tree`, the access block; `.test coverage`, the
access row.

## .verdict

best-guessed.
