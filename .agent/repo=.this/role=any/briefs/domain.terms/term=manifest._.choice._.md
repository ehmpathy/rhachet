# domain.term: manifest

term.chosen   = manifest
term.kind     = noun
term.qualifier = REQUIRED — `hostManifest` | `repoManifest`; a bare `manifest` is forbidden in a contract
term.synonyms.forbidden:
- config
- settings
- keyrack.yml

## .what

a **declaration of record**: a resolved statement of what exists and under what terms, read
before whatever it describes is used.

**this repo declares FIVE of them** — the word is the most-shared noun in the domain object set:

| domain object | scope | what it declares | on disk |
|---|---|---|---|
| `KeyrackHostManifest` | the box | which slugs THIS machine holds, each one's mech + vault | `~/.rhachet/keyrack.manifest.json` |
| `KeyrackRepoManifest` | one repo | which keys this repo needs, and the org they belong to | `.agent/keyrack.yml` |
| `RoleManifest` | one role | a role's readme, briefs, skills, inits, boot, keyrack | (within a registry) |
| `RoleRegistryManifest` | one package | the roles a package publishes, at resolved paths | `rhachet.repo.yml` |
| `BrainCliEnrollmentManifest` | one enrollment | the brain + the ordered roles to enroll | (in memory) |

⚠️ **the qualifier is part of the term, never a decoration.** five objects share the word; each
answers a different question and is read at a different moment. an unqualified `manifest` in a
contract names whichever one its author held in mind, and the reader must go find out which.

⇒ so the term's rule is not *"use the word `manifest`"* — the word is already universal here.
**the rule is that it never stands alone in a contract.**

## .the invariant

> **a machine-wide (`@all`) ask requires NO repo manifest.** a machine-wide credential is a fact
> about the box, so the repo manifest cannot declare one and must not be consulted to serve one.

⇒ the two are disjoint by construction: a repo manifest derives every slug it can name from its
own `org`, so it can never emit an `@all.*` slug.

## .the refusal order

on a keyed mutation the **host** manifest is checked FIRST. a box with no host manifest refuses
before the repo manifest is ever read.

⇒ so a test that means to exercise a repo-manifest refusal must reach it from a box that HAS a
host manifest — otherwise it refuses upstream, exits 2, renders the same blocked tree, and reads
green against the wrong branch.

## .refs

the five declared domain objects:

- `src/domain.objects/keyrack/KeyrackHostManifest.ts`
- `src/domain.objects/keyrack/KeyrackRepoManifest.ts`
- `src/domain.objects/RoleManifest.ts`
- `src/domain.objects/RoleRegistryManifest.ts`
- `src/domain.objects/BrainCliEnrollmentManifest.ts`

the operations that read and write them:

- `src/access/daos/daoKeyrackHostManifest/` · `daoKeyrackRepoManifest/`
- `src/domain.operations/keyrack/getOneKeyrackRepoManifestForAsk.ts`
- `src/domain.operations/keyrack/hydrateKeyrackRepoManifest.ts` — the `extends` chain
- `src/domain.operations/keyrack/initKeyrackRepoManifest.ts`
- `src/domain.operations/keyrack/cli/getOneKeyrackRepoScopeForAsk.ts`
- `serializeRoleRegistryManifest` (used at `src/contract/cli/invokeRepoIntrospect.ts`)

⚠️ **every one of these names its manifest.** the qualifier rule is what the tree already
practices — this cluster records it, and names the two fields that do not follow it.

## .reason

see the ref-level cluster beside this choice:
- `term=manifest._.choice.reason.md` — etymology, disputes, evidence
