# domain.term.choice.reason: fill

## .etymology

`fill` predates this round — it is an extant declared operation
([`fillKeyrackKeys`](../../../../../src/domain.operations/keyrack/fill/fillKeyrackKeys.ts)), itemized
here only because the `--reach` round engaged it materially and found it load-bearing (see
`.evidence`).

the word comes from the rack metaphor the whole subsystem runs on: a keyrack has a **hook per
key**, and to *fill* it is to hang a key on every hook the manifest names. `set` hangs one; `fill`
hangs them all.

the operation's own header states the motive:

> `.why = eliminates adhoc fill commands; manifest becomes source of truth`

so `fill` names a **manifest-driven** act, not merely a bulk one. that is the distinction the
word carries and the reason a synonym like `provision` or `sync` would lose it — neither says
*whose declaration drives it*.

## .disputes

### dispute: `fill` vs the sanctioned verbs (`gen`) — raised 2026-08-02 — status: **RESOLVED (keep `fill`)**

> "fill is the keyrack domain verb" … "different to gen" — the wisher, 2026-08-02

- resolution = **keep `fill`.** it is a **domain verb of the keyrack domain**, which is exactly
               the carve-out `rule.require.get-set-gen-verbs` grants: *"domain-specific verbs
               for imperative commands only if not matched to pattern."*

               the operative half is **"not matched to pattern"** — and `fill` is not a `gen`
               with more rows. `gen` is findsert of **one** resource, named by a caller. `fill`
               is a *rack-level* act: walk a **manifest**, provision every key × owner it
               declares, and verify each by roundtrip. it takes no resource argument at all.
               `genAllKeyrackKeys` would name the cardinality and lose the manifest, the
               verification, and the rack.

               the counter below stands as recorded. the taxonomy is not violated — it is
               applied, via the door it leaves open for a domain's own verbs.

- raised.by  = me, while `fill`'s interaction with reach-keys was mapped (q10 of the `--reach`
               vision)
- claim      = [`rule.require.get-set-gen-verbs`](../../../../repo=ehmpathy/role=mechanic/briefs/practices/code.prod/evolvable.domain.operations/rule.require.get-set-gen-verbs.md.min)
               declares a closed verb set — `get` / `set` / `gen` / `del` — and calls a synonym
               verb in place of a sanctioned prefix a **blocker**. `fill` is a findsert in bulk,
               and findsert is exactly what `gen` names. by the rule's letter it should be
               `genAllKeyrackKeys`.
- counter    = the same rule carves out "domain-specific verbs for imperative commands only if
               not matched to pattern", and `fill` has a claim on that carve-out on two grounds:
               1. **it is a cli command, not a library operation.** `keyrack fill` is an
                  imperative a human types, and the rule exempts contract/cli entry points.
               2. **`gen` would understate it.** `gen` is findsert of *one* resource. `fill` is a
                  manifest-driven sweep across keys **×** owners, with a roundtrip verification
                  (`set` → `unlock` → `get`) per pair. `genAllKeyrackKeys` would name the
                  cardinality but drop both the manifest-as-source and the verification.
- resolution = **none. the question stands open.** the counter is not obviously wrong, and the
               word is entrenched in a published cli surface — so this is not a drive-by rename.
               a traveler who wants to settle it should weigh the carve-out against the blocker
               and record the outcome here.

## .evidence

- **discovery: the reach round.** `fill` surfaced as load-bearing when reach became a key
  identity axis. two facts fell out, both of which the word's meaning explains:
  1. **`fill` provisions the reaches a repo manifest declares.**
     ⚠️ **this reverses what was recorded here hours earlier**, and the reversal is worth the
     record. the first entry read *"`fill` cannot enumerate reaches … no manifest declares
     reaches."* that was true of the design at the time (reach was host-manifest only) and false
     within the day: the wisher then had repo manifests declare the reaches they need
     (`require` / `recommend`, under a key). `fill` reads the repo manifest
     ([`:239`](../../../../../src/domain.operations/keyrack/fill/fillKeyrackKeys.ts)), so the moment
     reaches were declarable there, they became fillable.

     **the term's meaning never moved** — *`fill` fills what a manifest declares* held through
     both. only the manifest's contents changed. that is the mark of a well-chosen word: the
     design reversed under it and the definition did not need a rewrite.
  2. **`fill`'s vaulted-probe is reach-blind.** it asks
     `getKeyrackKeyGrant({ for: { key: slug } })` ([`:195,291`](../../../../../src/domain.operations/keyrack/fill/fillKeyrackKeys.ts)),
     which is slug-only. once several keys share a slug, that probe mis-answers — and the
     reversal above **raises the stakes**: `fill` is no longer a bystander to reach-keys, it is a
     primary writer of them.
- **invariants** (as a dop):
  - `fill` is **idempotent** — an already-vaulted key is skipped, so a re-run converges
  - `fill` is **manifest-bounded** — it acts on exactly the keys a manifest declares, never on
    keys it discovers elsewhere
  - `fill` **verifies** — each key × owner is roundtripped (`set` → `unlock` → `get`), so a
    silent partial write is not a `fill` outcome

## .see also

- `term=reach._.choice.reason.md` — the round that surfaced this term
- `rule.require.get-set-gen-verbs` — the rule the open question is argued against
