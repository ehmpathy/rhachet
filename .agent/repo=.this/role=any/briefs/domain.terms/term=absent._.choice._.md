# domain.term: absent

term.chosen   = absent
term.kind     = adj
term.synonyms.forbidden:
- missing
- notfound
- nonexistent
- unavailable
- gone

⚠️ **`miss` and `omitted` are NOT forbidden synonyms — they are DISTINCT kin terms.** each
narrows `absent` along one axis; see the boundary table below. to collapse any of the three
would erase the axis that earns it a place.

⚠️ **`unreadable` is a fourth kin, on a different axis.** `miss` and `omitted` add an observer to
the same fact; `unreadable` denies the fact is known at all — *we could not tell whether it is
there*. to fold it in here would read absence of evidence as evidence of absence
(`rule.forbid.failhide`). see `term=unreadable`, and `term=presence` for the question all four
answer.

## .what

**the value is not there.** the repo's plain, unqualified word for non-existence — no claim about
who asked for it, who is at fault, or what happens next.

that neutrality is the whole job. `absent` is the base the narrower words are built from:

```
absent   : it is not there                          ← states the fact, and stops
miss     : it is not there, AND it was asked for    ← adds expectation
omitted  : it is not there, AND the caller is told  ← adds a report
```

## ⚠️ .the boundary — why three words, not one

the three sit on one axis, from least to most committed. a word that claims more than it knows is
the hazard each boundary guards against:

| term | means | who asked? | is it reported? |
|------|-------|------------|-----------------|
| **`absent`** | not there | ⬜ unstated | ⬜ unstated |
| `miss` | not there, and it was probed for | ✅ the caller did | ❌ no — the caller acts on it |
| `omitted` | not there, and the caller could not be served | ✅ the caller did | ✅ yes — always |

concretely, all three are correct about the same key, at three different moments:

- the key is **absent** from the vault — a fact about the vault, true whether or not anyone looks
- `fill` probes for it and takes a **miss** — the probe expected it, and carries on
- `unlock` reports it as **omitted** — the caller asked, and must be told they did not get it

> `absent` describes the WORLD. `miss` describes a READ of the world. `omitted` describes what we
> TELL the caller about that read.

so `absent` is the one that survives when you strip the observer away. that is why it is the base
word, and why the narrower two cite it in their own definitions rather than replace it.

## .the compound form — `$noun-absent`

`absent` also composes as the tail of a hyphenated classify value, where it names **which** thing
is not there:

```ts
// computeCloneSocketOmissionReason.ts — CloneSocketOmissionReason
export type CloneSocketOmissionReason = 'pty-absent' | 'host-incapable' | null;

// asNpmInstallFailureKind.ts — conforms to the pattern above
export const NPM_INSTALL_FAILURE_KINDS = [
  'permission-denied', 'package-absent', 'build-gate-blocked', 'timed-out', 'unclassified',
] as const;
```

the compound reads `<subject>-absent`, never `absent-<subject>` — which keeps the subject first
for autocomplete (`rule.require.order.noun_adj`) and sorts every member of a family together.

🔴 **note which half of that first sample is the domain term.** `'pty-absent'` is a **value** of
`CloneSocketOmissionReason`, and the two words answer different questions: `absent` says *what is
not there*, and `omission reason` says *why the caller did not get what they asked for*. the type
was called `CloneSocketFallback` until 2026-09-05 and the rename touched only the type — the
`'pty-absent'` value is unmoved, because it was right all along.

⚠️ **one extant value breaks that order:** `'absent-roles-boot-command'`
(`findRolesWithBootableButNoHook.ts`) puts the adj first. it is a **known inconsistency**, left
in place until disturbed per `rule.forbid.domain-term-synonyms`. a new value must take the
`$noun-absent` form.

## .the contract surfaces it appears on

`absent` is **published** at several sites, so a rename is a breaking change at each:

```ts
// unlockKeyrackKeys.ts — the returned shape, surfaced by `keyrack --json`
omitted: { slug: string; reason: 'absent' | 'lost' | 'remote' }[];
```

```ts
// getKeyrackKeyGrant.ts — the grant status
status: 'absent',
```

```ts
// execRoleUnlink.ts — the idempotent unlink outcome
): { status: 'removed' | 'absent' } => {
```

## .why not `missing`

🚨 **the one that matters most, because `missing` is the word most reviewers reach for first.**

it is a gerund, so it is forbidden outright by `rule.forbid.gerunds`. but the deeper reason is
that the gerund ban is *right* here rather than incidental: `missing` reads as an action in
progress, which invites the reader to ask *who is doing the missing* — and no actor exists.
`absent` is a state, and a state is exactly what the word must name.

it would also collide head-on with `miss`, which is a real and distinct term in this glossary.
`missing` and `miss` share a stem and mean different things, which is the precise shape
`rule.forbid.domain-term-ambiguity` exists to prevent.

## .why not `notfound` / `nonexistent` / `unavailable` / `gone`

each smuggles in a claim the bare fact does not support:

- `notfound` — implies a **search happened**. that is `miss`, and to use it here would erase the
  distinction the two words exist to carry
- `nonexistent` — claims it never existed anywhere. `absent` is scoped to one place at one time; a
  key absent from this vault may sit in another
- `unavailable` — implies it exists but is **withheld**, which is the `locked` / `remote` sense.
  already forbidden on `term=omitted` for the same reason
- `gone` — implies it **used to be here**. `absent` makes no claim about history

## .refs
- `src/domain.operations/keyrack/session/unlockKeyrackKeys.ts`   # `reason: 'absent' | ...`
- `src/domain.operations/keyrack/getKeyrackKeyGrant.ts`          # `status: 'absent'`
- `src/domain.operations/invoke/link/execRoleUnlink.ts`          # `status: 'removed' | 'absent'`
- `src/domain.operations/clone/computeCloneSocketOmissionReason.ts`    # `'pty-absent'` — the compound
- `src/domain.operations/upgrade/asNpmInstallFailureKind.ts`     # `'package-absent'` — conforms
- `src/domain.operations/manifest/findRolesWithBootableButNoHook.ts`  # the inverted-order outlier

## .reason
see the ref-level cluster beside this choice:
- `term=absent._.choice.reason.md` — etymology, the kin boundary, the disputes it settles
