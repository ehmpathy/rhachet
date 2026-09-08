# domain.term: peer

term.chosen   = peer
term.kind     = noun
term.synonyms.forbidden:
- other
- alternative
- available
- rest

## .what

**a member of the SAME axis as the one a filter narrowed to, which the filter excluded and which
DOES hold what was asked for.** a peer is the answer to the only question a human has when a
narrowed result comes back empty: *"then where ARE my keys?"*

three properties, and each carries weight:

| property | why |
|---|---|
| **same axis** | an env narrow names peer ENVS, never peer orgs. to cross axes would suggest a fix that does not apply |
| **excluded by the narrow** | the asked-for value is never echoed back — "you have none in X; try X" reads as a taunt |
| **non-empty** | a peer that holds none is not a fix, it is a second dead end |

## .the invariant a reviewer can check

**a peer must be read from the SAME source the filter reads.** a peer named from a different
field can name a value the filter cannot match — and a fix line that sends a human to a second
empty answer is worse than no fix line at all.

- ✅ `asKeyrackSlugFullOrNull({ key: row.slug })?.org` — the slug, which is what the org filter reads
- ❌ `row.org` — the STORED field, minted from a fallback chain that can read `'unknown'` while
  the slug still says `@all` (`unlockKeyrackKeys.ts:472-477`)

## .the shape it names

`getAll…Peer<Axis>ForFix` — the set is a `getAll*`, the axis is named, and `ForFix` marks it as
the third beat of a helpful failure (`term=fix`), never a `Hint`.

## .refs

the operations the term is declared on:
- `src/domain.operations/keyrack/cli/getAllKeyrackPeerEnvsForFix.ts`
- `src/domain.operations/keyrack/cli/getAllKeyrackPeerOrgsForFix.ts`

the render that consumes them:
- `src/domain.operations/keyrack/cli/asKeyrackStatusEmptyNotice.ts`

the clamps:
- `getAllKeyrackPeerOrgsForFix.test.ts` — `[case2]` the asked value is excluded; `[case3]` the
  peer is slug-derived, so it can never name a value the filter would reject
- `asKeyrackStatusEmptyNotice.test.ts` — `[case3]` each axis keeps its own `try` clause

## .reason
see the ref-level cluster beside this choice:
- `term=peer._.choice.reason.md` — etymology, disputes, evidence

## .see also
- `term=fix._.choice._.md` — what a peer is FOR: the concrete next move
- `term=filter._.choice._.md` — the narrow that creates the need for a peer
