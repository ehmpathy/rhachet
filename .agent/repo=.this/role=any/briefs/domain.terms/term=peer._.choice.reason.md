# domain.term.choice.reason: peer

## .etymology

`peer` is latin *par* — an EQUAL. that is exactly the relation the word must carry here: the
values named are equals of the one the human asked for, drawn from the same axis, and they differ
only in which one holds keys.

the rejected words each lose one property the concept needs:

| word | what it loses |
|---|---|
| `other` | says only "not the one you asked for" — a repo org is `other` than `@all`, and so is a garbage string. it names no membership in the axis |
| `alternative` | implies interchangeability. a peer env is NOT an alternative to the env you wanted; it is merely where your keys happen to be |
| `available` | reads as a permission or a stock level, and keyrack already spends `available` on a key's grant state — an overload (`rule.forbid.domain-term-synonyms`) |
| `rest` | implies the complement of a set. but the asked-for value is excluded AND empty members are excluded, so a peer set is strictly smaller than "the rest" |

## .disputes

### dispute: other — raised 2026-09-02 — status: RESOLVED (keep `peer`)
- raised.by  = the round that declared `getAllKeyrackPeerOrgsForFix`
- claim      = `getAllKeyrackOtherOrgsForFix` reads plainer, and "other" is the word a human
               would say out loud
- counter    = `other` is a pure negation and carries none of the three properties the concept
               needs. it does not say "same axis" (so it cannot forbid a cross-axis suggestion),
               and it does not say "non-empty" (so it permits a fix line that names a second dead
               end). `peer` carries both by its sense of an EQUAL — a member of the same rank in
               the same set. the operation's whole value is those two constraints, so the name
               must hold them
- resolution = keep `peer`; record `other` as a forbidden synonym. dispute closed

### dispute: sibling — raised 2026-09-02 — status: RESOLVED (keep `peer`)
- raised.by  = the same round
- claim      = `sibling` names the same-parent relation even more precisely than `peer`
- counter    = twofold. first, it implies a PARENT — a tree relation this domain does not have;
               envs and orgs are flat sets, not children of a node. second, it is gerund-shaped
               and so is refused on sight by `rule.forbid.gerunds`, which would make every future
               use a lint argument
- resolution = keep `peer`. deliberately NOT added to the forbidden list, since
               `rule.forbid.gerunds` already forbids it for every term — a second, weaker copy of
               a rule that already holds is how two rules drift apart

## .evidence

### the discovery — a scenario narrative, then its distillation

the term was unearthed by a dogfood, not designed at a keyboard. the narrative:

> a human types `keyrack status --org @al` — one character short of `@all`. six keys are unlocked.
> the render says `(no keys unlocked)`. the human believes the daemon is empty, re-runs `unlock`,
> and is confused when it reports keys it just unlocked a minute ago.

distilled to a bdd timeline, the absent piece names itself:

- **given** a daemon that holds keys under org `ehmpathy`
- **when** a human narrows to org `@al`, which holds none
- **then** the render must name (a) the filter at fault, and (b) *where the keys actually are*

(b) is the concept. it had no word, so it had no operation, so it did not exist — and the render
fell back to a sentence that was false.

### the invariant this term carries

a peer must be derived from the **same source the filter reads**. this is not a style preference;
it was found as a live divergence:

- the org filter reads the **slug** (`getAllKeyrackStatusKeysForFilter` → `getAllKeyrackSlugsForOrg`)
- a daemon row ALSO carries a stored `.org`, minted from a fallback chain
  (`hostConfig.org ?? grant.org ?? slugOrg ?? repoManifest?.org ?? 'unknown'`)

so a row whose grant fell through carries `'unknown'` while its slug still says `@all`. a peer
read from the stored field would print `try --org unknown` — a value the filter can never match.
the human's next command lands on a second empty answer, and now they distrust the tool.

clamped at `getAllKeyrackPeerOrgsForFix.test.ts` `[case3]`, whose input contract accepts **only**
`{ slug }` — so the wrong field is not merely discouraged, it is unreachable.

### the axis-locality invariant

each axis carries its own `try` clause; the two are never merged. `try --env prep or --org ehmpathy`
would read as "either alone fixes it", which for a compound narrow is a claim that cannot be made:
`--env prep --org ehmpathy` may still be empty. clamped at `asKeyrackStatusEmptyNotice.test.ts`
`[case3]`, which asserts exactly two `try ` occurrences.

### precedent

the shape predates the word by one operation: `getAllKeyrackPeerEnvsForFix` was declared earlier
in this same round, for the env axis. the org axis then needed the identical concept, which is the
rule-of-three signal that a term — not merely a helper — had been found. two declarations, one
word, one recorded reason.
