# domain.term.choice.reason: unlock

## .etymology

the rack metaphor, carried the whole way. a keyrack holds keys; to **unlock** is to take one off the
rack and have it to hand for the rest of the day. you unlock **once**, and every later use is free —
which is exactly the daemon's contract: one passphrase, then every `get` answers.

that "once, then free" shape is what picks the word. `open` and `activate` name a state change with
no sense of duration. `acquire` and `retrieve` name a **read**, which is the half this term is most
often confused with — and the confusion is the defect below.

## ⚠️ .the overload, found 2026-08-09, and the defect it hid

`unlock` names two acts in one file:

```ts
// unlockKeyrackKeys.ts:249 — a VAULT unlock. decrypts a store so it can be read
await adapter.unlock({ identity, exid, silent: true, meta, slug, owner });

// unlockKeyrackKeys.ts:336 — THE unlock. hands grants to the daemon, once, after the loop
await daemonAccessUnlock({ socketPath, keys: keysToUnlock });
```

both are honest in isolation — a vault does lock, and `age`/`1password` say so. but together they
let a reader believe the **loop body** unlocks a key. it does not:

```
:171   for (const slug of slugsForEnv) {
:319       keysToUnlock.push(new KeyrackKeyGrant({ … }))   ← an accumulator, no daemon call
:332   }
:335   if (keysToUnlock.length > 0)
:336       await daemonAccessUnlock({ socketPath, keys: keysToUnlock })   ← the ONE unlock
```

**the defect this hid.** a peer review (r011, carried i060–i067) proposed the loop body be extracted
as **`unlockOneKeyrackSlugAtReach`**, and I carried that name unexamined for seven rounds. the name
is not a small imprecision — it promises a per-slug daemon write, which is the exact cost the
batched design exists to avoid. an operation so named would either lie, or invite a later traveler
to *make it true* by a move of the daemon call into the loop, so one socket write becomes N.

the extracted operation is a **get**: it takes a slug and a reach and yields a grant.
`rule.require.get-set-gen-verbs` then names it `getOneKeyrackGrantForUnlock` — the `ForUnlock`
suffix says what the grant is *for* without a claim on the verb.

## .why this term earned its file now

`unlock` is the repo's **most-published keyrack word** — `rhx keyrack unlock` is the command every
human runs, and `unlockKeyrackKeys` is a declared dop. it sat un-itemized through 21 other terms
because it felt too obvious to define. the moment it was leaned on to judge a proposed operation
name, the overload surfaced at once.

> a word is not safe because it is familiar. it is safe because it has one sense.

## .disputes

### dispute: should the vault adapter's `unlock` be renamed? — raised 2026-08-09 — status: OPEN

- raised.by = self, on the round that found the overload
- claim = `adapter.unlock` is a second sense of a published word, inside the very file that defines
  the first. a reader who learns `unlock = the daemon write` meets a call named `unlock` 87 lines
  above it that does another act. `adapter.decrypt` (or `adapter.open`) would leave one sense
- counter = three:
  1. it is the **vault's own domain word** — `age` and `1password` genuinely lock and unlock stores,
     so the adapter speaks its supplier's language, which is correct at a boundary
  2. it is on the `KeyrackHostVaultAdapter` **interface**, so a rename touches every vault adapter —
     a wide change on a converged stone, with no behavior to clamp it
  3. the ambiguity is bounded by grain: the vault sense appears only inside adapters and their one
     call site, never on a published cli or sdk surface
- resolution = **OPEN.** kept as `unlock` on both, with the two senses now written down and the
  canonical one named. flagged for the wisher beside the other structural items. ⚠️ this is a term
  whose overload is known and accepted, not one whose overload went unnoticed — which is the
  difference this file buys

## .evidence

**the declared dop + the published command.** `unlockKeyrackKeys` is a domain operation this repo
declares, and `rhx keyrack unlock` is a published cli contract — the two strongest triggers
`rule.require.domain-term-itemization` names.

**scenario timeline — the shape the word must protect**

```
given  a repo that declares 3 keys, each at 2 reaches
when   a human runs `keyrack unlock --env test`
then   the loop yields 6 grants into one accumulator
and    ONE daemonAccessUnlock call carries all 6 across the socket
and    a per-slug operation named `unlock*` would invite 6 socket writes where 1 suffices
```

**the counterfactual is the proof.** had `unlock` been itemized before i060, the proposed
`unlockOneKeyrackSlugAtReach` would have failed its own name-check on sight, and seven rounds of a
carried item would have read differently from the first.

## .invariants

checkable rules a reviewer can hold the term to:

1. **an `unlock*` operation writes to the daemon** — if it does not, it is misnamed
2. **the daemon write is batched, never per-slug** — one socket call per invocation, whatever the
   count of keys
3. **a per-slug extraction is a `get`**, and takes a `get*` name (`rule.require.get-set-gen-verbs`)
4. **the vault sense is boundary-only** — `adapter.unlock` may name a decrypt inside an adapter; no
   domain operation outside an adapter may use `unlock` for a read

## .see also

- `term=reach._.choice._.md` — the axis the proposed operation name carried
- `term=sweep._.choice._.md` — an unlock with no `--key` is a sweep; the two compose
- `rule.forbid.domain-term-ambiguity` (learner) — the rule this overload is filed under
- `rule.require.get-set-gen-verbs` (mechanic) — why the extraction is a `get`
