# domain.term.choice.reason: clone.address

## .etymology

`address` is inherited, not coined. `define.address-sigils` already fixes `@<slug>` as an actor
address and `@:<body>` as a clone address, and it grounds the choice in three separate arguments —
markedness (the base is bare, the instance is marked), shell safety (`@` never opens an expansion,
where a rejected `#` opens a comment), and an exact character-level convergence with distilisys's
own `@<name>`.

⇒ **that argument is not restated here.** this cluster records the WORD's boundary and its
contract; the sigil scheme has its own owner, and a second copy would drift from it.

what this cluster adds is the answer to a question `define.address-sigils` does not ask: **is the
sigil part of the value, or a decoration a render supplies?**

## 🚨 .the boundary — why this is `clone.address` and not `address`

the test from `rule.require.boundary-qualified-terms` is *"$word, of WHAT?"*, and it returns **two**
answers in this repo:

| boundary | what an address is | shape |
|---|---|---|
| **keyrack** | the identifier a keyrack **key** is filed under | `ehmpathy.test.FOO`, or `…FOO@beav@ehmpathy.com` |
| **clone** | the string a human types to reach one live **clone** | `@:driver`, or `@:7f3a1b2c` |

two answers = two senses = two clusters. this one is qualified from birth so it cannot become the
ambiguity it is named to avoid.

⚠️ **and the extant keyrack cluster is filed FLAT, as `term=address._.choice._.md`.** that is the
defect `rule.require.boundary-qualified-terms` lists first — *"a flat or truncated filename"* — and
it was invisible for as long as the word had one sense. **a second sense is what makes a flat name
readable as a defect**, which is worth the record on its own: the collision did not appear when the
second term was coined; it appeared when the second term was *looked for* and the first one answered.

the rename to `term=keyrack.address` is **owed and not taken here** — 7 citation sites, all in the
keyrack subdomain, none of them this round's work. caught as a dream rather than swept into a diff
that already darkens its own review lanes.

## .disputes

### dispute: the sigil — inside the value, or supplied by the render? — raised 2026-09-06 — status: RESOLVED (inside)

- raised.by = the six-render sweep that produced `asCloneAddressHuman`
- claim = the transformer should return the **body** (`driver` / `7f3a1b2c`) and let each render
  prefix its own `@:`. the sigil is presentation; the body is the datum
- counter = the sigil states the **grain**, and grain is not presentation. six call sites that each
  re-supply `@:` means the one that forgets emits an ACTOR address for a CLONE — the precise
  confusion `define.address-sigils` exists to close, and which `enroll-to-reach.journey` [t2]
  already catches at the acceptance tier. a value whose grain must be re-supplied by every reader
  is not a whole value
- resolution = the sigil lives **inside** `asCloneAddressHuman`. `asCloneAddressHuman.test.ts`
  bounds both halves: every branch starts `@:`, and `address.split('@:').length - 1 === 1` catches
  the migration hazard where a call site keeps its own prefix AND calls the owner

### dispute: `handle` — raised 2026-09-06 — status: RESOLVED (keep `address`)

- claim = *"handle"* reads friendlier and is common for a reachable name
- counter = it names no grain and has no sigil story, so it would sit beside `@`/`@:` and explain
  neither. `address` is already the word `define.address-sigils` uses throughout, and the
  keyrack boundary uses it too — one word, two boundaries, is the shape the glossary is built for;
  one concept, two words, is the shape it forbids (`rule.forbid.domain-term-inconsistency`)
- resolution = keep `address`; record `handle` as a forbidden synonym

## .evidence

### the sweep that forced the term into existence

a grep for the inlined projection `slug ?? serial` found **six** human-faced renders, each with
its own copy and none with an owner. three had drifted to the full 36-char uuid while three
rendered 8 hex — **one concept, two shapes, inside one cli**.

🚨 **the sharpest single datum: `asClonePruneView`'s docblock claimed it rendered *"the same address
form `list` renders"*, and it rendered the full uuid while `list` rendered 8 hex.** the comment
asserted agreement with a neighbour, the assertion was false, and it had been false for as long as
it stood. **a claim of agreement with a neighbour is a claim no compiler checks** — which is the
argument for a shared owner over a truer comment, and it is why this term exists as code rather
than as a convention.

### the clamps that proved the collapse

the six-site collapse was verified at three tiers, red-then-green, each on an independent re-run
with no `-u`:

| tier | what moved |
|---|---|
| unit | `asClonePruneView` — 3 assertions, plus a new one that bounds the machine twin to the FULL serial |
| acceptance | `clone.acceptance` whoami tree, `clone.prune` ×4 snapshots |
| **realbrain** | `clone.realbrain` + `clone.saybulk-probe.realbrain` say headers, and `clone.joker` [t7]'s whoami assertion |

⚠️ **the realbrain row is the one that carries evidentiary weight**, because the say header has
**zero** unit coverage — a grep of `src/**/*.test.ts` for `said to` returns not one match. its only
clamps live in a tier that needs a real authenticated brain. so *"the address renders short in
`clone say`"* is a guarantee no cheap test holds, and the term's docblock says so rather than let a
later reader assume the unit tier covers it.

## .see also

- `define.address-sigils` — the sigil scheme, its markedness argument, and its rejected candidates
- `rule.require.short-serial-for-unslugged-clones` — the rule the serial body obeys
- `rule.require.boundary-qualified-terms` — why this cluster is `clone.address` from birth
- `term=address._.choice._.md` — the keyrack sense, flat-named and owed a rename
- `term=serial`, `term=reach` — the peer nouns of this boundary
