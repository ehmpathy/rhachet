# domain.term: reach

term.chosen   = reach
term.kind     = noun
term.synonyms.forbidden:
- scope          # oauth's word for a *capability* list; ours names a *lock*. see .reason
- org            # NOT a synonym — `org` is provenance, `reach` is destination
- resource       # oauth rfc 8707's word; one repo, one word
- audience       # oauth `aud` (rfc 7519); same reason
- target
- destination
- context
- realm
- territory      # was sanctioned in PROSE until 2026-08-10; now forbidden EVERYWHERE. see .reason

## .what
**what a credential opens, out there** — the external lock it was cut for, named by a
**plaintext exid** that is opaque to keyrack (`beav@ehmpathy.com`, `github://org=ehmpathy`).

> ⚠️ this line read *"a uri whose scheme carries its address rules"* until 2026-08-04, which
> was the pre-amendment shape and contradicted the ⚠️ eighty lines below it. a say-level
> `.what` is what a reader boots into context first, so a correction buried in a footnote is
> a correction nobody reads. keyrack imposes **no scheme**; `github://org=$org` is one mech's
> private convention, not the term's form.

**reach is an identity axis of a key, not a modifier of one.** it sits beside `owner`, `org`,
`env`, and `name`: two keys may share every other axis and still be two distinct keys when
their reach differs.

> car keys for the tacoma vs car keys for the scout. same name, same owner, same garage.
> the sole difference is which vehicle they open. you do not *override* one into the other —
> you hold two keys.

three consequences fall out of reach as an identity axis:

1. **a reach-key is set explicitly.** `keyrack set --reach github://org=ehmpathy` from inside
   `ahbode` stores its own credential. a reach is never derived, inferred, or minted from
   another key.
2. **isolation is legible.** ahbode→ehmpathy and ahbode→seaturtle are separate credentials —
   separately granted, separately relockable, separately audited.
3. **partition is free.** the daemon holds one grant per (slug, reach), because that pair *is*
   the key's identity. two reaches coexist for the same reason two envs do.

## .the two axes a reach is spoken on

a reach is named on two surfaces, and they answer different questions. to conflate them is the
one live way to misread this term:

| axis | question | surface | varies by |
|------|----------|---------|-----------|
| **requirement** | which reaches do you need to work in this repo? | **repo** manifest | the repo |
| **possession** | which reaches does this machine hold? | **host** manifest | the human at the machine |

a repo declares a **floor**, never a cap. a human may hold more reaches than any repo names,
and **no repo declaration can take a reach away**. so possession stays per-human even though
requirement is per-repo.

> ⚠️ this line read *"a floor (`require` / `prefer`)"* until 2026-08-12. the strength tier was
> **cut** on 2026-08-05 — `reaches:` is a flat list, and every declared reach is unconditional.
> see `term=prefer._.choice._.md` for the reversal and the condition that would flip it back.

**a repo manifest reach is not a grant.** it says *"this repo needs this"*, never *"this repo
may have this."* the grant is the credential a human set on the host.

**who writes each surface — a hard invariant:**

| surface | written by | never written by |
|---------|-----------|------------------|
| repo manifest (`reaches:`) | a human, by hand, committed | any keyrack command |
| host vault (the credential) | `keyrack set` / `keyrack fill` | a human, by hand |

`fill` **reads** the repo manifest and **writes** the vault. it never writes back. so a repo's
declared needs are always a human's committed intent, never a tool's accretion.

two neighbours it is NOT:
- **`org`** — the cleanest statement of the split is **from vs into**:

  | term | one sense | direction |
  |------|-----------|-----------|
  | `org` | the organization a credential is authorized **from** | source |
  | `reach` | what a credential is authorized **into** | destination |

  each word carries exactly one definition, so this is the *opposite* of an overload — two
  words split one axis cleanly between them. a key declared by `ahbode` may reach `ehmpathy`;
  its org stays `ahbode` the whole way. (`org: '@all'` is a wildcard on **from**, not a claim
  about **into**.)
- **an oauth/oidc `scope`** — that is a *capability* list that only ever **narrows** what you
  may do. reach is *lateral*: it names a different lock, never a smaller grant. github
  calls the capability axis **`permissions`** for apps, and that word stays free for it here.
  see `.reason` — the dispute is settled, with a trigger to re-open it

## .the absent case is `reachless`

a key with no reach is **reachless**. one word, and it is the canonical one — recorded here
rather than in its own cluster, because it is an adjective derived from this noun, not a second
concept.

it earns a line because the absent case is spoken constantly (138 uses across 48 files as of
2026-08-04) and because its synonyms are the easy reach:

- 👎 `default key` — implies a fallback a reach-key could fall back **to**. it cannot; that is
  e18, the exact failure the design forbids
- 👎 `unscoped key` — smuggles the rejected `scope` word back in through the negative
- 👎 `bare key` / `plain key` — vague; a key is not less of a key for its absent reach

⚠️ `reachless` appears in **prose and comments only** — never as an identifier. that is
deliberate and worth its own note: the code models the absent case as `reach === undefined`
(**never `null`** — e16 turns on `JSON.stringify`, which drops `undefined` and keeps `null`), so
a `reachless` field or flag would be a second representation of a fact the absence already
states.

## ~~.the prose companion is `territory` — and it stays prose~~ — RETRACTED 2026-08-10

> ⚠️ **the section below is struck.** it argued that `territory` was a sanctioned prose
> companion, under the comment/contract split `rule.forbid.domain-term-synonyms` draws. the
> wisher overruled it — *"eliminate the synonym of teritory too"* — and every occurrence was
> swept from `src/` and `blackbox/`. `territory` is now a **forbidden synonym everywhere**,
> prose included, and it sits in the list at the top of this file.
>
> struck rather than deleted, because the case it makes is the one a future traveler will
> re-derive from the rule's own text. the record of why it was overruled is the point — see the
> dispute in `.reason`.

~~`territory` is the word nearly every comment reaches for to explain what a reach *is*: 99 uses
across 30 files in `src/` as of 2026-08-05, and **zero identifiers** (verified — no
`territory`/`Territory` appears in any name).~~

~~it earns a line here because its status is otherwise genuinely ambiguous. `target` and
`destination` sit in the forbidden list a few lines above; a reader who finds `territory` in
every second comment could reasonably conclude either that it is next to be banned, or that it
is the real word and `reach` is the awkward one — and then rename a flag to `--territory`.~~

~~neither. the split is the one `rule.forbid.domain-term-synonyms` already draws:~~

| ~~where~~ | ~~`territory`~~ |
|-------|-------------|
| ~~a comment, to describe the concept~~ | ~~✅ sanctioned — the alternate-perspective use the rule permits~~ |
| ~~a contract — dobj/dop name, flag, field, output~~ | ~~❌ forbidden — `reach` is the canonical word~~ |

~~it works in prose precisely because it is *not* a contract word: it names what a reach points at
(a github org, a claude account, a vpn profile) without any claim to be the axis itself. `reach`
is the axis; a territory is what sits at the end of one. that is why the two coexist rather than
compete, and why `target`/`destination` — which name the axis, badly — do not.~~

## .how to say it now, without `territory`

the struck section was right on one count: prose needs a way to name *what a reach points at*.
these are the phrasings the sweep settled on, and they are the ones to reuse:

| you want to say | say |
|-----------------|-----|
| "the territory this key opens" | **"the reach this key was cut for"** |
| "a key must be cut for the territory it opens" | **"a key must be cut at the reach you ask for"** |
| "a reach names one territory of one key" | **"a reach is an identity axis of one key"** |
| "a credential for the wrong territory" | **"a credential for the wrong reach"** |
| "its storage address carries no territory" | **"its storage address carries no reach"** |

the trick: every circular reading (*"the reach this key reaches"*) comes from a verb phrase
where `territory` was the object. swap to **"cut for" / "cut at"** — the term's own locksmith
idiom — and the sentence names the axis once, with no second noun owed.

## .refs
where the term is declared / used, plus notable examples:
- `.behavior/v2026_07_31.feat-keyrack-unlock-scope/1.vision.yield.md`  # coined here (vision)
- `src/domain.objects/keyrack/KeyrackKeyReach.ts`              # the domain object
- `src/domain.operations/keyrack/reach/`                       # ⬅ every reach operation lives in one dir (2026-08-10)
- `src/domain.operations/keyrack/reach/asKeyrackKeyReach.ts`         # the cast
- `src/domain.operations/keyrack/reach/asKeyrackKeyReachExid.ts`     # the render (was …ReachLabel)
- `src/domain.operations/keyrack/reach/asKeyrackKeySlugAtReach.ts`   # the composite address
- `src/domain.operations/keyrack/reach/assertKeyrackReachAbsent.ts`       # refusal: a mech that mints on its own axis
- `src/domain.operations/keyrack/reach/assertKeyrackReachAddressable.ts`  # refusal: a vault whose address has no reach axis
- `src/domain.operations/keyrack/reach/assertKeyrackReachRequiresKey.ts`  # refusal: a reach that rides a bulk ask (q2)
- `src/access/daos/daoKeyrackHostManifest/assertKeyrackHostAddressed.ts`  # persistence integrity: an entry keyed by its address
- `src/domain.operations/keyrack/adapters/mechanisms/asGithubOrgFromReach.ts`  # the mech-local convention
- `keyrack set|get|unlock|del|source --reach`   # the cli surface

⚠️ **status = DECLARED** (was PROPOSED). coined at the `1.vision` stone; declared in `src/` at
`5.1.execution.from_vision`, so the word was settled before the code hardened around it — as
intended.

⚠️ **no `isKeyrackKeyReach` exists, deliberately.** an earlier draft of this ref list named one
beside the cast. it was never built: `rule.require.assure-via-type-checks` wants an `is$Noun`
where a boundary **narrows** a type, and every reach enters through `asKeyrackKeyReach`, which
**throws** instead. a guard with no narrow site would be a pure YAGNI.

⚠️ **a reach is PLAINTEXT** (amended 2026-08-03). the shape is `{ exid: string }`, not
`{ scheme, org }`. keyrack imposes no scheme; the `github://org=$org` convention belongs to
`EPHEMERAL_VIA_GITHUB_APP` alone, which parses it in `asGithubOrgFromReach`. see the vision's
dated amendment.

⚠️ **the field is `exid`, renamed from `label` on 2026-08-12.** the value ROUTES the mint — the
github-app mech reads it to pick which installation to mint against — so it is the name the
EXTERNAL system knows, never a display name. the full dispute, both of my wrong counters, and
the migration it owed are recorded in `.reason`. the host manifest is encrypted on disk, so
`schemaKeyrackKeyReach` reads a pre-rename `label` and writes only `exid`
(`daoKeyrackHostManifest/schema.test.ts [case5]` clamps both directions).

## .reason
see the ref-level cluster beside this choice:
- `term=reach._.choice.reason.md` — etymology, the `scope` dispute, the `org` dispute, evidence
