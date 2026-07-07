# howto: fix stale node_modules (keyrack/brain credential grabs)

## .what

when a bhrain review (or any brain-backed skill) fails to grab a credential
from keyrack — despite keyrack clearly holding the key unlocked and the skill
code clearly set up to grab it — suspect a stale `node_modules`. delete it and
reinstall.

```bash
rm -rf node_modules && pnpm install
```

## .symptom

route reviews fail with a brain credential error even though it all looks correct:

```
✋ BadRequestError: FIREWORKS_API_KEY required — provide via context
```

key tells that point at stale deps (not at the keyrack data or the skill code):

- `rhx keyrack get --owner ehmpath --key FIREWORKS_API_KEY --env prep --json`
  returns `granted` — so the credential IS available
- the bhrain review skill clearly passes
  `creds: { keyrack: { owner: 'ehmpath', env: 'prep' } }` to `genContextBrain`
- the brain reads the same supplier key (`brain.supplier.fireworks`)
- every version and key string lines up when read statically
- yet the brain still throws its "creds absent" guard at runtime
- the same skill works fine in other repos

## .why

this repo is `rhachet` itself. its `node_modules` holds:

- a published copy of `rhachet` (the bhrain review does `require('rhachet/brains')`)
- the brain packages (e.g., `rhachet-brains-fireworksai`)
- the role packages (e.g., `rhachet-roles-bhrain`)

when these drift out of sync — partial install, interrupted upgrade, leftover
duplicate versions under `.pnpm` — the brain instance created by one copy is not
the instance bound by another. the supplier-creds context binds onto one object
and reads off another, so the brain sees no creds and throws.

static reads of the dep code all look correct because each file is internally
consistent; the defect is the cross-package linkage, which only a clean reinstall
repairs.

## .fix

```bash
rm -rf node_modules && pnpm install
```

then retry the skill (e.g., `rhx route.stone.set ... --as passed`).

## .when to suspect this

- a credential grab fails but `keyrack get` proves the key is granted
- the skill code and versions all check out on inspection
- the same skill works in other repos
- you were mid-upgrade, mid-rebase, or recently bumped brain/role deps

## .note

before a deep code spelunk, try the clean reinstall first. it is cheap and
repairs a whole class of cross-package drift that is otherwise hours to trace.
