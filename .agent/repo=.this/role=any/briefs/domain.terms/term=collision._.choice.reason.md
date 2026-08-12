# domain.term.choice.reason: collision

## .etymology

taken from the hash-table sense, and deliberately: in a hash table a **collision** is two distinct
keys that land in one bucket — not an error, not a caller's mistake, purely a consequence of a
namespace narrower than the key space. that is exactly the shape here. `asKeyrackKeyName` is the
hash: it maps `ahbode.prep.FOO@beav@ehmpathy.com` down to `FOO`, and any two keys that share the
last segment land in one slot.

the word carries three things no alternative does:

1. **blamelessness** — a collision implicates neither key. both were legitimately cut, legitimately
   held, legitimately asked for. `conflict` and `clash` both imply one party is wrong
2. **the namespace as the cause** — a reader who knows the hash sense asks *"which namespace?"*
   rather than *"which key is bad?"*, and lands on the right question in one step
3. **inevitability without harm** — a hash collision is expected and handled; it becomes a defect
   only when handled silently. that is precisely the reach design's stance: the collision is fine,
   the **silent resolution** is the hazard

## .the axis order, and why it is part of the term

a collision is not fully named until its **axis** is named, because the axis decides the fix. the
order is **org → env → reach**, outermost first, and the order bears weight rather than taste:

a slug reads `org.env.name` with the reach hung below it. so the outermost axis on which two
keys differ is the only one whose fix always separates them:

- two keys that span two **orgs** cannot be separated by a narrower `--env`, nor by a `--reach`
- two keys that span two **envs** cannot be separated by a `--reach`
- only when org and env match is a `--reach` the fix

the innermost-first order hands a human the narrower fix and lets them obey it into the same
refusal — the walk-a-human-down-a-road-that-cannot-work shape `rule.require.errors-name-the-fix`
forbids. that hazard was live in the code before 2026-08-07: an org collision fell to the `env`
arm and told a caller to `narrow env` while both keys sat at `prep`.

## .disputes

no dispute has been raised. `conflict` was considered and declined at authorship time, on the
overload ground recorded in the say-level file (`ENV_CONFLICT` already holds a different sense).

## .evidence

**scenario timeline — the collision, from both ends**

```
given  a repo with no keyrack.yml, and one env var SHARED_KEY
when   a brain asks getKeyrackKeySecrets({ keys: ['orgA.prep.SHARED_KEY',
                                                  'orgB.prep.SHARED_KEY'] })
then   both slugs pass through getOneKeyrackGrantByKey verbatim (no manifest to validate against)
and    os.envvar answers BOTH from the one bare-name variable
and    both reduce to `SHARED_KEY` via asKeyrackKeyName
and    without the guard: Object.fromEntries keeps the LAST, and the brain holds one credential
       with no signal the other was lost
and    with the guard: ConstraintError, both addresses named, hint names the ORG axis
```

clamped at `getKeyrackKeySecrets.integration.test.ts [case5]` — dogfooded by removal of the guard
call, which turned all four assertions red, **the secret-leak one among them**: proof that the
un-guarded path returns the map.

**the three surfaces that share the term**

before `assertKeyrackExportNamesDistinct` reached all three, each surface had its own answer to
one collision — the cli **threw**, `sourceAllKeysIntoEnv` kept the **first** (`!process.env[name]`),
`getKeyrackKeySecrets` kept the **last** (`Object.fromEntries`). one condition, three behaviors,
none announced. that divergence is the strongest evidence the concept needed one name: three
implementations of an unnamed idea drift; one named guard cannot.

**invariants**

- a collision is decided on `asKeyrackKeyName(slug)`, never on the address — the address is what
  distinguishes the two keys, so it can never be what collides them
- only `granted` attempts can collide; a `locked`/`absent` peer emits no line, so it is no peer
- the collision guard on the flat surfaces is fed the **reachless** attempt set, never the raw
  enumerate — otherwise every repo that declares a reach would be refused, which would turn
  the wisher's chosen *enumerate* into a de-facto *refuse*
