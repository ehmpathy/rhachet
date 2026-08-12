# domain.term.choice.reason: target

## .etymology

`target` is what an operation **aims at**. `fill` aims at a set of credentials and drives each to
present; one member of that set is a target. the word carries the sense of *"what this loop is
for"* without a claim about how it is reached — which matters, because a target may be
provisioned by a `set`, found already vaulted and skipped, or refused.

it was born 2026-08-03, when `fill` grew a second dimension. the reach axis turned `fill`'s inner
subject from *a key* into *a key at a reach*, and an unnamed set of those is what let the
progress denominator drift from the loop it counts.

## .rejected alternatives

| word | why not |
|------|---------|
| `job` | implies a queue and a worker. `fill` has neither — it is a synchronous walk, and `job` would import scheduler vocabulary the domain does not hold |
| `unit` | carries no sense at all. a unit **of what**? the word would need a gloss every time |
| `item` / `entry` | both are collection words, not domain words — they name a *position in a list*, and the reachless target's leading position is an invariant, not its identity |
| `slot` | already leans toward the **address** sense (`$slug@$label`, a spot in the store). to overload it onto the fill loop's subject would put one word on two concepts — `rule.forbid.ambiguous-labels` |
| `variant` | suggests the reach targets are variations **of** the reachless one. they are not: reach is an identity axis, so a reach-key is a peer, never a derivative. the word would smuggle in the mental model the whole vision argues against |
| `combo` | informal, and it names the *cartesian product* rather than one member of it |

## .why not just reuse `reach`

a target is **not** a reach. the reachless target has **no** reach (`reach` is absent,
`directive` is `null`) and it is the one target every key always brings. to name the set
`reaches` would make the reachless member an anomaly inside its own collection — and it is the
opposite: it is the member that is unconditional.

```ts
export const getAllKeyrackFillTargets = (input: {
  reaches: KeyrackKeyReachDirective[];
}): KeyrackFillTarget[] => [
  { directive: null },          // ← a target with no reach. this is why the word differs
  ...input.reaches.map((declared) => ({
    reach: declared.reach,
    directive: declared.directive,
  })),
];
```

`reaches` is the **input**; `targets` is the **output**, and the output is strictly larger by
exactly one. two words, because two sets.

## .evidence

### the scenario timeline that surfaced it

```
given  a repo manifest that declares EHMPATH_BEAVER_GITHUB_TOKEN
       with reaches: require github://org=ahbode, prefer github://org=ehmpathy
when   `rhx keyrack fill` runs for one owner
then   THREE credentials must be made present, not one:
       ├─ the reachless key                (unconditional)
       ├─ at reach github://org=ahbode     (require — fails if unmet)
       └─ at reach github://org=ehmpathy   (prefer  — warns and carries on)
```

three rows, one key. the rows needed a name, and *"key"* was already spent on the row's parent.

### the defect the naming closed

before: the denominator re-derived the count by its own arithmetic —

```ts
const targetsPerOwner = slugs.reduce(
  (count, s) => count + 1 + (repoManifest.keys[s]?.reaches.length ?? 0),
  0,
);
```

after: the denominator reads from the **same derivation the loop walks** —

```ts
const perOwner = input.slugs
  .map((slug) => getAllKeyrackFillTargets({ reaches: input.keys[slug]?.reaches ?? [] }).length)
  .reduce((sum, count) => sum + count, 0);
```

clamped by a test that asserts the **relationship**, not the number:

```ts
then('it equals what the target derivation yields, key by key', () => { … });
```

a wrong `(n/total)` is a lie that never throws, so it could only be closed structurally — and it
could only be closed structurally once the set had a name to call.

## .invariants

- a target's `reach` is **absent** for the reachless one, never `null` — the same
  optional-not-nullable rule `reach` obeys everywhere (e16)
- a target's `directive` is `null` **exactly when** its `reach` is absent. the pair moves
  together: a declared reach always carries a directive, and the reachless target never has one
- the reachless target is **always first**, and always present — even for a key that declares no
  reaches at all. that is what keeps e1 true: a lone target renders today's flat shape byte for
  byte (`asKeyrackFillTargetBranch`'s `isLone` path yields no header and no extra indent)
