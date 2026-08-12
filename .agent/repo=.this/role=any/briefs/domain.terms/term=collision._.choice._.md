# domain.term: collision

term.chosen   = collision
term.kind     = noun
term.synonyms.forbidden:
- conflict
- clash
- overlap
- duplicate
- shadow
- overwrite

## .what

what happens when **two keys of distinct identity would claim one name in a flat namespace** —
`export FOO=`, `process.env.FOO`, a `{ keyName: secret }` map.

a collision is a property of the **namespace**, never of the keys. both keys are legitimately
held; each is a different key by every axis keyrack tracks. the namespace simply has one slot for
the name they share, because `asKeyrackKeyName` drops the org, the env, and the reach alike.

```
two keys, one name  → a collision  → refuse, and name which axis differs
one key, one name   → an emit      → the normal path
```

that is why it is the only failure shape in the reach design that would otherwise **succeed**: an
`Object.fromEntries` or an `export` line settles it by silent retention of one and loss of the
other, and the caller receives a live credential with no signal a peer was dropped.

## .the axes, ordered

a collision always has an **axis** — the outermost identity dimension on which the two keys
differ — and the axis decides the fix, because only the outermost one always separates them:

| axis | what differs | reachable when |
|------|--------------|----------------|
| `org` | `orgA.prep.FOO` vs `orgB.prep.FOO` | a repo declares no `keyrack.yml`, so a full slug passes through verbatim |
| `env` | `org.prep.FOO` vs `org.prod.FOO` | a repo sweep at `env: 'all'` |
| `reach` | one slug at two reaches | a sweep that enumerates declared reaches |
| (none) | one address asked for twice | any surface that takes a key list |

## .refs
- `src/domain.operations/keyrack/assertKeyrackExportNamesDistinct.ts`  # the guard, and the contract that names the term
- `src/domain.operations/keyrack/assertKeyrackExportNamesDistinct.test.ts`
- `src/domain.operations/keyrack/sourceAllKeysIntoEnv.ts`              # sdk flatten surface
- `src/domain.operations/keyrack/getKeyrackKeySecrets/getKeyrackKeySecrets.ts`  # brain-creds flatten surface
- `src/contract/cli/invokeKeyrack.ts`                                  # cli `keyrack source`

## .why not `conflict`

`conflict` is already spent in this domain, and on a different concept: `asKeyrackKeySlug` throws
`ENV_CONFLICT` when the caller's `--env` **disagrees with** the slug they typed. that is one
caller who contradicts themselves about one key — a bad ask.

a collision is the opposite shape: **two well-formed asks about two real keys**, and a namespace
too narrow to hold both. to reuse `conflict` would put one word on a caller's mistake and on a
namespace's limit, which is the overload `rule.forbid.term.addition.ambiguous` forbids.

## .why not `overwrite` or `shadow`

both name the **consequence** rather than the condition, and only the consequence we refuse to
allow. once the guard throws, no overwrite ever happens — so a term built on the outcome would
describe a state the code exists to prevent.

## .reason
see the ref-level cluster beside this choice:
- `term=collision._.choice.reason.md` — etymology, the axis order, evidence
