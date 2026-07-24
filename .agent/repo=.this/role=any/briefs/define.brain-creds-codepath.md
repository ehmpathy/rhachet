# define.brain-creds-codepath

## .what

how a reviewer (or any role skill) gets its brain api key, end to end — and the phantom-dependency trap that breaks it in THIS repo specifically.

## .the codepath (end to end)

trace of `route.stone.set --as arrived` → peer review → fireworks call:

1. **guard** — `runStoneGuardReviews` (rhachet-roles-bhrain) execs each lens's `run` command as a shell line, e.g. `$rhx run --skill review ...` (`$rhx` → `node_modules/.bin/rhx`).
2. **skill** — `review.sh` execs `node -e "import('rhachet-roles-bhrain/cli/review').then(m => m.review())"`.
3. **cli** — bhrain's `review()` builds the brain context:
   ```js
   const brain = await genContextBrain({
     choice: options.brain, // default fireworks/deepseek/v4-flash
     creds: { keyrack: { owner: 'ehmpath', env: 'prep' } },
   });
   ```
   note: `require('rhachet/brains')` here — see the trap below.
4. **rhachet** — `genContextBrain` discovers brains (`getAvailableBrains` — discovery only, NO creds attached), then binds the chosen brain via `asBrainAtomWithContextBound(brain, genContextBrainSupplier('fireworks', { creds }))`. that plants `context['brain.supplier.fireworks'] = { creds }`.
5. **brain package** — fireworks `genBrainAtom.ask` reads `context['brain.supplier.fireworks']`; absent → throws `FIREWORKS_API_KEY required — provide via context`. present → `getSdkCredsFromBrainSupplies` → `keyrack.get({ owner, env, key })`.
6. **keyrack** — grants the secret from the unlocked vault (`rhx keyrack unlock --owner ehmpath --env prep`). NO env-var fallback anywhere: `unlock` does NOT export vars into the shell; the brain reads keyrack directly.

## .the trap: phantom dependency + version shadow

- `rhachet-roles-bhrain` calls `require('rhachet/brains')` at runtime but declares rhachet only as a **devDependency** — a phantom dependency. its resolution depends on the host repo's hoist.
- in normal repos: the phantom lands on the app's installed rhachet (current) → works by accident.
- in THIS repo: rhachet is `link:.` (we ARE rhachet). meanwhile a transitive dep (`domain-objects@0.31.7` via uni-time/test-fns) pinned **published rhachet@1.39.0**, which pnpm hoisted into `.pnpm/node_modules/rhachet`. bhrain's phantom require ancestor-walked into that stale copy — which predates the creds-thread of `genContextBrain` (#389, v1.41.21) — so `creds` was dropped and every lens failed with "provide via context", even with the key unlocked.

## .the fix

pin every rhachet in the graph to the workspace via pnpm override (package.json):

```json
"pnpm": { "overrides": { "rhachet": "link:." } }
```

then `pnpm install`. the stale `.pnpm/node_modules/rhachet` disappears and all consumers (bhrain, brains packages, domain-objects) share the one workspace instance.

## .how to diagnose a recurrence

1. `rhx keyrack status --owner ehmpath` — is the key unlocked? ("locked" error ≠ this defect)
2. `file node_modules/.pnpm/node_modules/rhachet` — does a shadow copy exist, and at what version?
3. `pnpm why rhachet` — who drags in a published rhachet?
4. bisect runtime, not just disk: a tiny repro that calls `genContextBrain({ creds })` from repo root can pass while bhrain's `review()` fails — the difference is *which module instance each resolved*.

## .upstream defect

`rhachet-roles-bhrain` should declare `rhachet` as a **peerDependency** so hosts materialize the link and phantom resolution can never drift. file against ehmpathy/rhachet-roles-bhrain.
