# domain.term.choice.reason: exid

## .etymology

`exid` = **ex**ternal **id** — the id an external system assigned, which we store verbatim and
hand back when we go there.

the word was **already in service** when this dispute opened: `KeyrackKeyHost.exid` has held a
vault's external id (a 1password item id, an aws.params path) since the host manifest was
declared. so the term was not coined for the reach — it was **extended** to a second, parallel
case, which is exactly the reuse `rule.require.domain-term-itemization` asks for.

why the short form:

| candidate | why it lost |
|-----------|-------------|
| `externalId` | the long form invites a mixed rack — one field `exid`, one `externalId` — and a reader who meets both must ask whether they differ. one form, one word |
| `external_id` | snake case in a camelCase domain; same drift, one layer worse |
| `foreignKey` | database vocabulary, and it implies a join we never perform |
| `handle` / `locator` | generic; neither says **who assigned it**, which is the whole distinction |
| `ref` | already spent — `Ref<typeof X>` is the `domain-objects` reference type |

it also sits well beside `slug`: both are four-to-five characters, both name an id, and the
pair reads as one axis with two ends — **we named it** (`slug`) vs **they named it** (`exid`).

## .disputes

### dispute: label — raised 2026-08-03 — status: RESOLVED (2026-08-12, `exid` prevails)

- raised.by  = the beaver (as author of the plaintext amendment), settled by the wisher
- claim      = the field is an opaque plaintext string a human types. keyrack validates almost
               none of it. `label` says "a name" and asserts no grammar we do not check, so it
               is the honest word for a value keyrack treats as inert
- counter    = the wisher's, and it decided the round:

  > "since the Reach is used to route which key to mint at unlock time, its perhaps better
  > identified as an exid after all … otherwise, label looks like it implies for display
  > purposes only"

  a `label` is for a human to see. this value is for a **system to act on**: the github-app mech
  parses it (`asGithubOrgFromReach`) to choose **which installation to mint against**. a value
  that steers where a token comes from is an address, and an address the *other* side assigned
  is an `exid`. to call it a label invites the next reader to treat a load-bearing value as
  cosmetic and change it freely — which would silently point the mint at a different org.

- resolution = rename `KeyrackKeyReach.label` → `.exid`. record `label` as a forbidden synonym
               **where the value addresses**; `label` stays correct where a value only names for
               a human (`KeyrackKeyRecipient.label`). dispute closed.

#### ⚠️ two counters i raised, and both were wrong — recorded, never tidied away

these are kept because each looked sound and each failed for a reason worth the next reader's
time.

**counter 1 — "the exid is never handed to the external system."**

false, and its falsity is the very fact that settles the term. `asGithubOrgFromReach` consumes
the value and yields the org that the mech mints against. the value does cross the boundary — it
just crosses as a *selector* rather than as a payload. a selector the far side defined is an
exid.

**counter 2 — "`exid` asserts a grammar keyrack does not validate."**

it proves too much. `KeyrackKeyHost.exid` has been an unvalidated external id since the day it
was declared — keyrack stores a 1password item id verbatim and polices no shape. if the counter
held, it would condemn the extant field equally, and the extant field is correct. the lesson:
**an exid promises provenance (who assigned it), never a shape we enforce.**

## .evidence

**domain discovery — the who-named-it axis.** the three id-ish words in this domain split
cleanly by one question, with no overlap left over:

| term | who assigned it | what it is for |
|------|-----------------|----------------|
| `slug` | us | our canonical name (`org.env.name`) |
| `exid` | the other system | the name we address by |
| `label` | a human | a name a human sees; it names, it does not address |

**in-repo precedent.** `KeyrackKeyHost.exid` predates this round. the reach field joins an
extant word rather than adds a new one — the cheapest possible outcome for the glossary.

**the migration proves the term is load-bearing.** the host manifest is encrypted on disk and
cannot be regenerated, so a machine that already holds a reach-key holds it under the old word.
`schemaKeyrackKeyReach` therefore reads **both** spellings via a `z.preprocess` and writes only
`exid`. clamped at `daoKeyrackHostManifest/schema.test.ts [case5]`: legacy read, native read,
both at once (native wins), and an empty legacy value still refused — the read is a rename, never
a relaxation. dogfooded: with the preprocess reverted, `[t0]` and `[t2]` go red.

`schemaKeyrackHostManifest.safeParse` has exactly **one** call site
(`daoKeyrackHostManifest/index.ts`), so every host-manifest load on every machine funnels through
that preprocess — which is why one unit clamp covers the whole migration surface.

**the rename exposed two dead assertions, and that is evidence too.** `tsc` follows types; a
value that entered as `JSON.parse(stdout)` is `any`, so `parsed.reach.label` type-checked forever
and merely became `undefined` at run time. two acceptance clamps compared against `undefined`
and asserted naught — one of them the clamp that a `del` at one reach leaves its peer whole,
which exists precisely to catch a destroyed credential. a term whose rename can blind a
destructive-defect clamp is a term that carries weight.

captured as a rule of its own: `rule.require.sweep-untyped-reads-on-field-rename`.

## .invariants

- an exid is stored **verbatim**. keyrack does not own its grammar and does not police one
- `asKeyrackKeyReach` refuses **only** an empty value or one that holds whitespace — and that
  pair guards the *address* it rides inside (`$slug@$exid`), never the exid's own shape
- exactly **one** consumer reads sense into an exid, and it does so locally:
  `asGithubOrgFromReach` requires the `github://org=$org` convention, because the github-app mech
  must mint against one org's installation. that convention lives in the mech, never in the domain
- `KeyrackKeyHost.exid` and `KeyrackKeyReach.exid` are **never compared**. they live on different
  objects and name different external systems. the shared word is right; neither is a synonym of
  the other

## .refs

⚠️ **paths decay; confirm with a glob before you trust one.** `term=address` records a round
where three cited paths had all gone dead.

- `src/domain.objects/keyrack/KeyrackKeyReach.ts` — the reach's exid
- `src/domain.objects/keyrack/KeyrackKeyHost.ts` — the vault storage's exid
- `src/domain.operations/keyrack/adapters/mechanisms/asGithubOrgFromReach.ts` — the one local parse
- `src/access/daos/daoKeyrackHostManifest/schema.ts` — reads both spellings, writes only `exid`
