# domain.term.choice.reason: manifest

## .etymology

latin *manifestus* — "caught in the act, plainly visible." the freight sense is the one we want:
a **manifest** is the declaration a carrier files ahead of the cargo, so what is aboard is known
before a crate is unloaded. that is exactly what all five of these do — they declare what a scope
holds before any of it is loaded.

⚠️ **that generality is why the word spread to five objects, and why the qualifier is the term.**
`manifest` names a SHAPE (a declaration read ahead of use), not a subject. a word that general is
correct everywhere and specific nowhere — so it is a fine root and an unusable contract field.

chosen over three near-words:

- **`config`** — implies tunable preference. a manifest is a declaration of record: the repo
  manifest states which keys this repo NEEDS, and the host manifest states which slugs this box
  HOLDS. neither is a knob, and to call them config invites edits that read as harmless tuning
- **`settings`** — the same defect, one register down, and it reads as user preference
- **`keyrack.yml`** — the file NAME of one of the two. to use it for the concept would leave the
  host manifest (a `.json`, at a different path) with no word at all

## .the qualifier is the term

the strongest claim in this cluster is that **`manifest` is never spelled bare in a contract**.
that is not style; it closes a live overload across **five** declared objects.

| contract | the field is named | the value is always |
|---|---|---|
| `assertKeyrackOrgMatchesManifest({ manifest, org })` | `manifest` | a **repo** manifest |
| `daoKeyrackHostManifest.get()` → `{ manifest }` | `manifest` | a **host** manifest |
| `serializeRoleRegistryManifest({ manifest })` | `manifest` | a **role-registry** manifest |

one word, three contracts, three different objects — with no signal at any call site. a reader who
learns the word from one learns it wrong for the other two.
`rule.forbid.domain-term-ambiguity` names this exact shape: a term that does double duty across
distinct concepts.

⚠️ **the third one is why the count matters.** with two objects a reader might still guess right
half the time from context. with five, a bare `manifest` carries almost no information — and the
third contract sits in a different domain entirely (`invokeRepoIntrospect`), so no amount of
keyrack context helps a reader there.

⚠️ **these three are recorded, not repaired.** all predate this round and sit outside the bounds
of the wish that surfaced them (`rule.forbid.scope-leaks`). the rule the cluster declares —
qualify it — binds every NEW contract; the three extant fields are cleaned up when next disturbed,
per `rule.forbid.domain-term-synonyms`'s own leave-until-disturbed clause.

⚠️ **and the tree already practices the rule everywhere else.** all five domain objects, both
daos, and every operation that reads one carry the qualifier
(`getOneKeyrackRepoManifestForAsk`, `hydrateKeyrackRepoManifest`, `initKeyrackRepoManifest`,
`daoKeyrackHostManifest`). so this cluster records the convention the code already keeps and
names the three fields that fell out of it — never a new rule imposed on a tree that lacked one.

## .`rack` — prose only, deliberately

the human-facing renders and test names say *"the rack"* for what the host manifest holds
(*"the rack now holds one slug of each provenance"*). that word appears in **no contract** — it is
the container metaphor a human reads, while `manifest` is the declaration a program loads.

⇒ recorded here so the two do not merge: were `rack` promoted to a contract, it would need a
cluster of its own and a stated boundary against `manifest`. until then it is prose, and the
cluster claims nothing more.

## .disputes

none raised. the split was applied consistently in every contract that qualifies it
(`daoKeyrackHostManifest`, `daoKeyrackRepoManifest`, `getOneKeyrackRepoManifestForAsk`,
`hydrateKeyrackRepoManifest`, `initKeyrackRepoManifest`); this cluster records the rule those
names already follow, and names the two fields that do not. a dispute would be filed here.

## .evidence

### the invariant, and where it is enforced

> a machine-wide (`@all`) ask requires NO repo manifest.

`getAllKeyrackSlugsForEnv` derives every slug a repo manifest can name from that manifest's own
`org`, so a repo manifest **cannot** emit an `@all.*` slug. the two scopes are disjoint by
construction rather than by convention — which is what makes the skip safe rather than merely
convenient.

`getAllMachineWideSlugsForEnv` states the motive: the github-app install token is vaulted under
`@all` *"precisely so it can be fetched from anywhere, even outside any repo, before any repo is
cloned."* a bootstrap credential that needed a repo manifest could not bootstrap.

### the refusal order, and the clamp it demands

on a keyed mutation (`set`, `del`) the **host** manifest is checked before the repo manifest.

a clamp written for the repo-manifest refusal, run on a box with no host manifest, refuses
upstream instead — and the upstream refusal **exits 2, renders the same blocked tree, and names
its own cause**, so every structural assert stands green over a branch that never ran.

⇒ the fixture `blackbox/.test/assets/with-host-manifest-only` exists for this: a real repo, an
EMPTY host rack, still no `.agent/keyrack.yml`. it is the one state that falls through to the
repo-manifest refusal. the row that keeps it there is
`expect(output).not.toContain('host manifest not found')`.

⇒ **the general form, worth more than the instance:** when two preconditions refuse with the same
shape, an assert on the SHAPE cannot say which fired. the clamp must name the sentence that
belongs to its own branch, and exclude its neighbor's.

### the load has four throw modes

a repo manifest load can fail four ways — invalid yaml (`loadManifestExplicit.ts`), invalid schema
(same), a circular `extends`, and an absent `extends` target (`hydrateKeyrackRepoManifest.ts`).

⇒ this is why the fix **skips** the load for an `@all` ask rather than catches and degrades it: a
skip neutralizes all four at once, while a catch must enumerate them and would swallow a bare
`BadRequestError` (`rule.forbid.failhide`).

### an absent manifest is not a failed one

`loadManifestExplicit` yields `null` for a manifest that is simply absent, and throws only for one
that is present and unusable. the distinction is load-bearing: `[case4]`'s whole premise is a repo
whose manifest is ABSENT, which reaches the keyed refusal, while `[case1]`'s is a manifest that
cannot hydrate, which throws.
