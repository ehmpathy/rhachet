# domain.term.choice.reason: reach

## .etymology

from the wish + [`ehmpathy/rhachet#441`](https://github.com/ehmpathy/rhachet/issues/441), which
coined `--scope github://org=$org`. the **uri form survived**; the **word did not** — see the
`scope` dispute below, raised by the human 2026-08-02 and settled the same day.

`reach` names *how far a credential extends* — which external lock it opens. the hotel
model the vision used still holds, with one correction:

> one app (the pem), many locks (per-org installations). what changed is that we do not hand
> one key to many locks at mint time — we **cut a key per lock**, and `reach` names which lock
> its key was cut for.

> ⚠️ **on the dated records below.** the forbidden synonym is spelled out, unswept, inside every
> dated dispute entry from here down. that is deliberate: those entries record *what was argued
> on the day*, and to sweep an argument's own text would falsify the record it exists to keep.
> the rule binds **current voice** — the lines above, and every contract surface. it does not
> bind a quotation of the past. see the 2026-08-10 dispute for the retraction itself.

## .disputes

### dispute: `scope` → `reach` — raised 2026-08-02 — status: RESOLVED (adopt `reach`)

- raised.by  = the human, alongside the design shift that made it necessary
- claim      = two arguments, one about the word and one about the world:
  1. **the word.** `scope` is one of the most established terms in auth, and oauth/oidc use it
     for a materially different concept — a *capability* list that only ever **narrows** what
     you may do. ours is *lateral*: it names a different territory, never a smaller grant. a
     reader who knows oauth reads our flag exactly backwards. (the full oauth comparison table
     is preserved below, under `.the oauth contrast`.)
  2. **the world.** `scope` reads as a *modifier applied to one key*. the design it now names
     is the opposite: a key is **set per reach**, so reach is an **identity axis**, the way
     `owner` and `env` are. the human's analogy settled it —

     > "car keys for tacoma vs car keys for scout; same name, same owner, same org. the only
     > diff is reach."

     you do not *scope* the tacoma key into the scout key. you hold two keys. `reach` reads
     naturally as an axis; `scope` reads as an operation performed on one.
- counter    = `scope` also has an older, non-oauth **boundary/namespace** tradition (npm
               scoped packages, azure rbac scope, k8s cluster-scope, lexical scope), and the
               uri shape (`github://org=…`) already disambiguates it from an oauth scope
               string. so `scope` was defensible.
- resolution = **adopt `reach`.** the boundary/namespace defense answers argument 1 but not
               argument 2, and argument 2 is the decisive one: the word must read as an axis
               of identity, not as a narrowed view of one key. `reach` does; `scope` does not.
               record `scope` as a **forbidden synonym** — not because it is meaningless, but
               because one repo gets one word per concept.

  ✅ **the oauth collision is now fully retired, not merely contained.** the prior resolution
  kept `scope` with a caveat: if a future round let
  `EPHEMERAL_VIA_GITHUB_OIDC` or `EPHEMERAL_VIA_AWS_SSO` narrow a real oauth scope, two senses
  of "scope" would live in one cli. with `reach` adopted, that trigger is void — `scope` stays
  free for its oauth sense should those mechs ever need it, and `permissions` stays free for
  github's app-capability sense. no word does double duty.

### dispute: `org` — raised 2026-07-31 — status: RESOLVED (keep both, they are different words)

- raised.by  = the wish, implicitly. it points at `KeyrackKeyGrant.org` as evidence "the model
               already anticipates cross-org", which invites the reader to reuse that field.
- claim      = `org` already exists on the grant and already names an organization, so a new
               term is redundant — just set `org`.
- counter    = **`org` is provenance; `reach` is destination.** they are two concepts, not two
               words for one:
               - `org` = *whose manifest declared this key*, derived from the slug's first
                 segment (`asKeyrackKeyOrg` → `slug.split('.')[0]`)
               - `reach` = *which org's installation the token opens*
               these come apart exactly in the case the wish exists for: a key declared by
               `ahbode` (org=ahbode) that opens `ehmpathy` (reach=github://org=ehmpathy).
- evidence   = `org` already carries a different job: `handleGetCommand` filters reads on it
               (`cachedGrant.org !== input.org && cachedGrant.org !== '@all'` → skip). to
               overwrite `org` with the reach would break an ahbode consumer's read of its own
               grant.
- resolution = keep both. record `org` as a **forbidden synonym of `reach`** (and vice versa) —
               this is an anti-overload entry, not an anti-drift one. to conflate them would be
               `rule.forbid.ambiguous-labels`: one word, two senses.

### dispute: bare `--org` flag instead of a uri — raised 2026-08-01 — status: RESOLVED (keep uri)

- raised.by  = me, against the wish, on the strength of
               [`rule.prefer.wet-over-dry`](../../../../repo=ehmpathy/role=mechanic/briefs/practices/code.prod/evolvable.architecture/rule.prefer.wet-over-dry.md.min)
- claim      = `github://` is a namespace built for exactly **one** case. wet-over-dry says wait
               for 3+ instances before you abstract, so `--org ehmpathy` is the wetter, honester
               flag today.
- counter    = wet-over-dry governs **code structure**, where a wrong abstraction is cheap to
               undo. a **cli flag is a published contract**. once skills and scripts pass
               `--org`, to give that flag a second sense is a reinterpretation that breaks every
               caller — the "not a clean rework" category `rule.always.defer-fulcrums-to-last`
               forbids a gamble on. nine characters now buys out a broken contract later.
               a second hazard: `--org` would sit inches from `KeyrackKeyGrant.org`, and collide
               with the very overload the first dispute settled.
- resolution = keep `github://org=$org`. the uri form outlived the word that first carried it.

  ⚠️ **but the wish's stated reason was false.** it justified the uri as a mirror of the
  `duct:///` convention "the repo already uses". a grep of `src/**/*.ts` for `duct://` returns
  **zero matches**. the form survives on the published-contract argument above — it is a **new**
  convention, not a mirrored one. recorded so no later traveler cites a precedent that is absent.

### dispute: `address` for the composite `$slug@$label` — raised 2026-08-03 — status: RESOLVED (keep `slugAtReach`)

- raised.by  = me, at the execution stone. reach-as-identity needs a word for the composite key
               that `(slug, reach)` produces, and "address" is the obvious english for it
- claim      = `asKeyrackKeyAddress` reads better than `asKeyrackKeySlugAtReach`. it is shorter,
               it names the *result* rather than the *recipe*, and "address" is exactly what the
               composite is — the place a value is filed
- counter    = **`address` is already spent in keyrack, twice.** a grep found **75 occurrences
               across 19 keyrack files**, in two extant senses: the aws sso **start url**
               (`ssoStartUrl`, described as an address throughout the sso setup flow) and an
               **email address** (recipient labels, account identifiers). a third sense inside
               one subsystem is `rule.forbid.term.addition.ambiguous`, which is a **blocker**
- evidence   = the collision is not theoretical — both extant senses appear in the same files
               that would carry the new one (`vaultAdapterAwsConfig`, the recipient flows), so a
               reader would meet two senses of "address" within one screen
- resolution = keep `asKeyrackKeySlugAtReach`. it is longer and it names the recipe rather than
               the result, and that is the price of a word that stays unambiguous. `address` is
               recorded as a **forbidden synonym for the composite** — it keeps its two extant
               senses, and the composite goes by `slugAtReach`

  ⚠️ **note what this costs, honestly.** the composite genuinely is an address, and the prose in
  this repo calls it one (including in code comments — *"the composite address"*). the ban is on
  the **contract** (the operation name), not the prose, exactly as
  `rule.forbid.domain-term-synonyms` scopes it: a comment may describe a concept from an
  alternate perspective; a name may not.

### dispute: `territory` in prose — raised 2026-08-10 — status: RESOLVED (forbid it everywhere)

- raised.by  = the wisher, on a read of a source render: *"why is territory used as a synoym for
               reach?"*, then decisively: *"eliminate the synonym of teritory too"*
- claim      = `territory` is a synonym of `reach`, and one repo gets one word per concept. a
               reader who meets `territory` in every second comment learns a second name for a
               concept that already has a canonical one — which is exactly the drift
               `rule.forbid.domain-term-synonyms` exists to stop
- counter    = the prior position, argued in this cluster's say file until this date, was that
               `rule.forbid.domain-term-synonyms` **itself** sanctions the prose use: *"a comment
               may use a synonym to describe the concept from an alternate perspective — that is
               allowed."* by that letter, `territory` in a comment was compliant, and it did real
               work — it named *what a reach points at* (a github org, a claude account) without
               a claim to be the axis itself
- evidence   = when the wisher called it, `territory` had **zero identifiers** and ~99 prose uses
               across 30 files. so the prior position was factually right about the shape: the
               contract surface was clean; only the prose carried the second word.
               ⚠️ **and the prose was not the only place it had reached.** the sweep found it in
               a test-helper identifier (`genStoreWithThreeTerritoriesOfOneSlug`), in acceptance
               fixture key names (`MULTI_TERRITORY_KEY`, `TERRITORY_ONLY_TOKEN`), and — most
               tellingly — in the **published cli output**: `--reach <label>  territory this key
               opens`, and the `ConstraintError` text *"a reach names one territory"*. help text
               and error text are contract, not prose. so the "prose only" claim had already
               decayed by the time it was defended
- resolution = **forbid `territory` everywhere, prose included.** the wisher's call, and the
               evidence backs it: a word sanctioned in comments leaks into help strings and
               fixture names, because the line between "a comment" and "a string a human reads"
               is not one a sweep can hold. one word, everywhere.
               recorded in `term.synonyms.forbidden`; the prior section is **struck, not deleted**,
               in the say file

  ⚠️ **the cost, honestly.** `territory` genuinely named what `reach` names only obliquely: a
  reach is an *axis*, a territory was the *place at the end of it*. with the synonym gone, a
  handful of sentences read circularly on a blind swap — *"a reach names one reach"*, *"the reach
  this key opens"*. those are not acceptable prose and were rewritten by hand, not by sed. the
  replacement idiom is **"cut for" / "cut at"** (the locksmith metaphor this term was built on),
  which lets a sentence name the axis once. the table of settled phrasings lives in the say file
  under `.how to say it now, without territory`.

  ⚠️ **a lesson for the next synonym.** the "sanctioned in prose" carve-out looks cheap and is
  not. it survived five days and produced a contract violation in cli help text within that
  window. if a concept needs a second word for a genuinely different facet, that facet deserves
  its **own term cluster** — not a licence to alternate.

### dispute: `label` for the reach's own field — raised 2026-08-05 — status: RESOLVED 2026-08-12 (take `exid`)

- raised.by  = the wisher, on a read of `KeyrackKeyHost.reach`: *"isnt this more of an exid than a
               label?"*
- claim      = `label` says almost naught. `KeyrackKeyReach = { label: string }` holds the string
               that **identifies an external lock** — a github org, a claude account. that is
               an **external identifier**, and this repo already has a word for exactly that:
               `exid`. a reader who meets `label` learns only that it is text
- counter    = `exid` is **already spent** in keyrack, and its extant sense is a near neighbour
               rather than a distant one — which makes the collision worse, not milder.
               `KeyrackKeyHost.exid` is the **vault's storage handle** (a 1password item id, an
               aws parameter name): *where this vault filed the value*. a reach is *what the value
               opens*. two external identifiers, one word, adjacent on the same dobj — that is
               `rule.forbid.term.addition.ambiguous`, a blocker
- evidence   = both would sit on `KeyrackKeyHost` **six lines apart** (`exid` at the vault handle,
               `reach.exid` at what it opens), so a reader meets two senses within one screen. the
               same shape that killed `address` for the composite, one dispute above
- weighed    = a third option nobody has argued yet: **drop the wrapper entirely.** the object
               holds exactly one string and keyrack never parses it (the plaintext amendment), so
               `KeyrackKeyReach` may earn less than a branded `string` would. that would dissolve
               the naming question rather than settle it — no field, no field name

  ⚠️ **I concede the claim and cannot yet defend a replacement.** `label` is weak and the wisher is
  right about that. but `exid` is not available at the reach's own field without an overload, so
  the fix is either a *different* word or *no wrapper at all* — and that is a shape decision, not a
  naming one. left OPEN deliberately rather than settled badly.

  ⚠️ this dispute is **wider than a rename**: it questions whether `KeyrackKeyReach` should be an
  object. that is not a clean rework once callers construct it, so it wants a decision before more
  code hardens around the wrapper.

- resolution = **2026-08-12 — take `exid`.** `KeyrackKeyReach = { exid: string }`. settled on the
               wisher's decisive argument: *"since the Reach is used to route which key to mint at
               unlock time, its perhaps better identified as an exid after all;
               `github://org=ehmpathy`; otherwise, label looks like it implies for display purposes
               only"*.

               **what decided it — the value ROUTES, so a decorative name under-claims.** at unlock,
               `asGithubOrgFromReach` parses `ehmpathy` out of `github://org=ehmpathy`, and that org
               drives the `keyrack-infra` installation lookup that picks which token is minted. the
               string's *content* selects an external resource. `label` reads as a sticker on a
               drawer; this value is an address the mint resolves.

               **the in-repo precedent is exact.** `KeyrackKeyHost` already carries the pair, and
               `exid` there is no more validated than it would be here:

               | field | value | who fixes its grammar | validated by keyrack? |
               |---|---|---|---|
               | `KeyrackKeyHost.exid` | `op://vault/item/field`, an aws param path | the **vault** | no — `string \| null` |
               | `KeyrackKeyReach.exid` | `github://org=ehmpathy`, `beav@ehmpathy.com` | the **mech** | no — non-empty, no whitespace |

               ⚠️ **two counters of mine were WRONG, and both are recorded because each looked
               sound:**

               1. *"a reach label is never handed OUT, so it is not an external id"* — **false at
                  unlock.** `asGithubOrgFromReach` consumes it to route the mint. the test was fine;
                  I mis-assessed its input.
               2. *"`exid` re-imports the grammar claim the plaintext amendment removed"* — **proves
                  too much.** it would condemn `KeyrackKeyHost.exid` equally, which is unvalidated
                  and mech-specific in exactly the same way. a field name states what the value IS;
                  it was never a promise that keyrack parses it.

               **`Reach.slug` is refused** on that same pair: `slug` is the name **we** assign
               (`KeyrackKeySlug` = `org.env.KEY`), `exid` is the name the **external system** knows.
               a reach names the latter.

               ⚠️ **this entry took THREE passes in one hour** — `exid`, then `label`, then `exid`.
               kept in full rather than tidied, because the churn is the lesson: each reversal came
               from a *new fact about runtime behavior*, never from taste, and the settle is the one
               grounded in what the value DOES at unlock. weigh the table above; do not re-run the
               argument.

               **migration owed** (its own commit, post-approval): the encrypted host manifest
               persists `reach: { label: "…" }` on developer machines today, plus the zod schema,
               `asKeyrackKeyReachLabel` → `asKeyrackKeyReachExid`, every construction site, and a
               batch of snapshots.

## .the oauth contrast

preserved from the settled `scope` dispute, because it is the clearest available statement of
what `reach` is *not*:

| | oauth/oidc `scope` | our `reach` |
|---|---|---|
| answers | what may i **do** — capabilities | **where** does this extend — which lock it opens |
| shape | space-delimited list (`repo read:org`) | exactly one plaintext label |
| cardinality | many at once | one per key |
| direction | **narrows** — request ≤ what you hold | **lateral** — a different lock, not a smaller grant |
| who decides | client requests, server may downgrade | set explicitly, per key, at `keyrack set` |

> ⚠️ the **shape** row read *"exactly one uri"* until 2026-08-10 — the pre-amendment shape. a
> reach is **plaintext**, opaque to keyrack; `github://org=$org` is one mech's private convention
> (`asGithubOrgFromReach`), never the term's form.

the **direction** row is the real mismatch. an oauth scope is monotonically restrictive — it
can only subtract. reach subtracts none: a key at `github://org=ehmpathy` does not hand back
*less* than the default, it opens a different lock entirely.

the oauth-family word that most nearly matches ours is **`resource`** (rfc 8707, resource
indicators) — a uri that names the target protected resource; even the uri shape matches.
else **`aud`** (audience, rfc 7519). both are recorded as forbidden synonyms: not wrong, but
one repo gets one word.

**github itself keeps the capability word apart, in our favor.** verified 2026-08-02 on the mint
endpoint (`POST /app/installations/{id}/access_tokens`): it accepts `permissions`,
`repositories`, `repository_ids` to limit a token, and github calls those **permissions** for
github *apps* — it reserves **"scopes"** for oauth apps and classic PATs. so if we later expose
least-privilege limits, `--permissions` / `--repos` are free and match github's own
vocabulary. **no contest for any word.**

## .the per-mech reach contract

⚠️ **this section described a `reach?: { schemes, parse, describe }` mech facet until 2026-08-03.
that design was superseded by the plaintext amendment and was never built.** repaired on
re-read, per this glossary's own caution that a term file inherits the lifespan of the decision
it cites. what follows is the contract as it actually ships.

**a reach exid is OPAQUE to keyrack.** there is no scheme list, no registry of grammars, and no
generic parse stage beyond "is this a non-empty, whitespace-free string". every vault and the
daemon file a value under the exid and look it back up; not one of them reads it.

exactly one mech reads sense into an exid, and it does so **locally**:

| kind | mech | what the reach does |
|------|------|---------------------|
| **derived** | `EPHEMERAL_VIA_GITHUB_APP` | mints a token FOR one org's installation, so it needs an org it can look up. it requires the `github://org=$org` convention and parses the org out — in `asGithubOrgFromReach`, a **mech-local** parser. the convention lives in the mech, never in the domain |
| **declared** | `PERMANENT_VIA_REPLICA` | a human pastes a secret and asserts what it opens. the mech carries the exid through untouched; the vault files the value under it. this is the os.secure account juggle — one key name, N copies, one per account |
| **refused** | `EPHEMERAL_VIA_AWS_SSO` | mints against an sso profile, which is its own axis of the same kind. a reach here would move *where* the value is filed yet leave *what it opens* untouched — an exid that lies. `assertKeyrackReachAbsent` fires |

**why this is better than the closed set it replaced.** keyrack does not know what reaches
exist — a github org, a claude account, a vpn profile — and it does not need to. the moment the
domain held a `scheme` enum, every new kind of lock became a contract change in a closed
set. as plaintext, the domain holds a **name**, and the one mech that must act on a reach
holds the convention for how to read it.

## .evidence

- **discovery: scenario narrative.** the concrete blocked task — dispatch into an `ehmpathy` repo
  from inside an `ahbode` repo — surfaced provenance and destination as distinct the moment they
  were walked through a timeline: provenance stays `ahbode` the whole way; reach is `ehmpathy`
  from the moment the key is set.
- **discovery: production data.** the `keyrack-infra` registries confirm the one-app/N-locks
  shape the term names: `ehm-a-seaturtle` is a single app (`appId 4094439`) with installation
  `141321273` in ehmpathy and `141321231` in ahbode. same app, two locks — so a word for "which
  lock" is genuinely needed.
- **discovery: the human's analogy.** "car keys for tacoma vs car keys for scout" is the whole
  design in one line, and it is what moved the term from a modifier (`scope`) to an axis
  (`reach`). recorded because the analogy, not the argument, is what settled it.
- **invariants** (as a dobj, `KeyrackKeyReach = { exid: string }`):
  - the exid is **plaintext**. only an empty exid, or one that holds whitespace, is refused; a
    bare word (`ehmpathy`) is a legal exid
    ⚠️ *this invariant read "the scheme is required — a bare org is not a reach" until
    2026-08-03. the guarantee it protected did not weaken, it **moved**: a bare word is still
    never read AS a github org, but the refusal now lives in `asGithubOrgFromReach`, the mech
    that would have to read it. one parser still serves cli and manifest alike, so a manifest
    can never legalize an exid the flag rejects*
    ⚠️ *the FIELD read `label` until 2026-08-12 — see the dispute above. only the name moved*
  - a reach must be **absent**, never `null`, when a key has none (`JSON.stringify` drops
    `undefined` and emits `null`, so a nullable field would break the byte-identical json
    guarantee)
  - a reach is honored by the mechs that can act on one (`EPHEMERAL_VIA_GITHUB_APP`
    derives one, `PERMANENT_VIA_REPLICA` carries a declared one) and **refused** by a mech that
    mints against its own axis (`EPHEMERAL_VIA_AWS_SSO`) — never a silent no-op either way
    ⚠️ *this read "exactly one mech today" until 2026-08-03; the os.secure account juggle made
    `PERMANENT_VIA_REPLICA` a second honoring mech*
  - a reach is part of a key's **identity**, so the address `$slug@$exid` keys the daemon store
    **and** the encrypted host manifest
  - a reach is **never derived** — a key with a reach must have been set with that reach
  - an exid is **never case-folded**. two exids that differ only in case are two reaches

## .see also

- `define.keyrack-registry-vs-installation` — why a reach's org must be checked against github,
  never against the local registry
