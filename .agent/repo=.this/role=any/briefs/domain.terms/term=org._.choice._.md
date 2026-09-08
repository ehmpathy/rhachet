# domain.term: org

term.chosen   = org
term.kind     = noun
term.synonyms.forbidden:
- organization  # the unabbreviated form; `org` is canonical on every surface
- owner         # RESERVED — `--owner` names WHOSE keyrack, an orthogonal axis (see .note)
- account       # an invoice/identity concept, never the namespace segment
- tenant        # saas jargon; the domain says org
- namespace     # names the ROLE org plays, never the term itself
- scope         # RESERVED — `scope` is its own term, and org is only one of its axes

## .what

the **first segment of a key slug** (`$org.$env.$KEY`) — the namespace a credential is filed
under.

an org segment carries exactly one of three senses, and that split is the whole subject of
`v2026_08_25.fix-keyrack-all-skips-manifest`:

| the segment | sense | needs a repo manifest? |
|---|---|---|
| a real org (`ehmpathy`) | that named org | yes — to verify against `manifest.org` |
| `@this` | *whatever org this repo's manifest declares* | **yes, by definition** |
| `@all` | the box itself — `machine-wide` | **no** |

so `org` is not one concept: `@this` is a **deferred read** of the manifest, `@all` asserts that
no manifest is involved, and a literal org is a **claim to be checked**. a verb that treats all
three alike is the defect this behavior repairs.

## .the two arities

`--org` names provenance on every verb, but its arity differs by verb shape — one sense, two
arities (`--env` already behaves this way):

- on a **keyed** ask (`get`, `set`, `del`) it **selects** a slug segment
- on a **sweep** (`unlock`, `source`, `list`, `status`) it **filters** the swept set

⇒ the two are itemized separately as `selector` and `filter`; `org` is the axis both range over.

## .refs

**the operations this repo declares on it**
- src/domain.operations/keyrack/asKeyrackAskOrg.ts          # the ONE canonical read of an ask's org
- src/domain.operations/keyrack/asKeyrackSelectorOrg.ts     # keyed-ask arity
- src/domain.operations/keyrack/asKeyrackFilterOrg.ts       # sweep arity
- src/domain.operations/keyrack/asKeyrackSlugOrgKind.ts     # which of the three senses a segment carries
- src/domain.operations/keyrack/getAllKeyrackSlugsForOrg.ts
- src/domain.operations/keyrack/cli/getOneKeyrackFilterOrg.ts
- src/domain.operations/keyrack/cli/getAllKeyrackPeerOrgsForFix.ts
- src/domain.operations/keyrack/cli/getAllKeyrackAttemptsForOrg.ts

**where the three senses are adjudicated**
- src/domain.operations/keyrack/asKeyrackKeySlug.ts   # `@this` ⇒ manifest org; `@all` exempt from ORG_MISMATCH
- src/domain.operations/keyrack/getAllKeyrackSlugsForEnv.ts   # every repo slug derives from `manifest.org`
- src/access/daos/daoKeyrackHostManifest/schema.ts            # `@all` is a legal org in the HOST manifest

**the cli surface**
- src/contract/cli/invokeKeyrack.ts   # `--org <org>  target org: @this or @all`

## .note — `org` is NOT `owner`

these are orthogonal axes and must never be conflated:

- **`org`** = the namespace a credential is filed UNDER (slug segment 1)
- **`owner`** = WHOSE keyrack is read (`--owner ehmpath` vs a human's); a per-owner isolation axis

one box holds `ehmpath`'s keyrack and a human's keyrack, each of which may hold `ehmpathy.*` and
`@all.*` slugs. so the two axes cross freely — to overload either word onto the other would
collapse a real 2-d space into a false 1-d one.

⚠️ `--for` aliases `--owner` on every verb EXCEPT `get`, where it names a **scope**. those two
senses cross; it is extant debt, named in `1.vision.yield.md`, and out of this behavior's bounds.

## .reason

see the ref-level cluster beside this choice:
- `term=org._.choice.reason.md` — etymology, disputes, evidence
