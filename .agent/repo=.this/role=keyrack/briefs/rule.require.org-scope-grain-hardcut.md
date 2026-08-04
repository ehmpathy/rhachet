# rule.require.org-scope-grain-hardcut

## severity: blocker

the `--org` scope, and it alone, selects the **grain** a credential belongs to. this is a
**hardcut** — a deterministic branch on the scope the human already typed — never an inference
waterfall, never a runtime picker, never a silent fallback.

- `--org @all` → the **grove grain** (the machine / global grain). the credential belongs to the
  **box itself**. it is resolved from the box's own ambient / global state, with **NO repo
  manifest** consulted. failfast if the box's ambient state cannot supply it.
- a **specific org** → the **tree grain** (the repo grain). the credential belongs to **that
  org's repo tree**. it is **always** resolved via that repo org's `.agent/keyrack.yml` manifest.
  failfast if the manifest declares none — it must NEVER fall back to the grove/global grain.

## .why

a box can host many trees, and it has its own machine-global state beneath all of them. so a
credential lives at exactly one of two grains: the **grove** (the box, shared by every tree) or a
**tree** (one repo's manifest). a get-time "try the manifest, else the machine, else whatever is
ambient" waterfall is magic: the human never sees which grain answered, and a cross-grain read
(a tree credential answered by machine-global state, or a grove credential answered by a repo
manifest) is a defect — it resolves the wrong resource as the wrong principal / from the wrong
source.

the `--org` scope is the one explicit, visible signal of grain, and it is sufficient, so it MUST
be the sole decider:

- `@all` declares "this belongs to the grove" → machine/global grain, no manifest.
- a specific org declares "this belongs to that org's tree" → repo grain, that org's manifest.

no new flag, no prompt, no pin — the scope carries the whole decision.

## .the invariant, per scope

| `--org` scope | grain | resolved from | on absence |
|---------------|-------|---------------|------------|
| `@all` | grove (machine / global) | the box's own ambient / global state — NO repo manifest | failfast: name that `@all` needs the box's ambient state |
| a specific org | tree (repo) | that org's `.agent/keyrack.yml` manifest ONLY | failfast + guide: declare it in the manifest, or re-scope with `--org @all` |

## .forbidden

- a fallback from a specific-org (tree-grain) credential to the grove/global grain when its
  manifest entry is absent — this must be a hard failfast, never a rescue.
- a fallback from an `@all` (grove-grain) credential into a repo manifest — `@all` never reads a
  manifest.
- any inference waterfall (a chain of "try grain A, else B, else C") or a runtime prompt/picker
  that selects grain from a signal other than the `--org` scope.
- a grabbed ambient/global value used to answer a tree-grain credential — the tree grain is the
  manifest ONLY.

## .the grain itself is the namespace + manifest axis (general, not per-vault)

the grain above IS the **namespace / manifest axis** — WHICH scope a credential belongs to
(grove vs tree) and therefore WHERE its name/scope comes from and whether a repo manifest is
consulted at all. this is a general keyrack property, held identically by every vault: a
machine-wide `@all` key is set + read with no repo manifest for `os.secure`, `1password`,
`aws.params`, or any other vault; a specific-org key is repo-scoped from that org's manifest.
do NOT re-derive this grain per vault — it is stated here, once.

## .the applications (each itemized)

the grain hardcut is the general invariant. what each vault ADDS is how it resolves a SPECIFIC
resource AT that grain — the identity to read as, the exact form of the name it computes, etc:

| application | `@all` (grove grain) | specific org (tree grain) | itemized in |
|-------------|----------------------|----------------------------|-------------|
| **aws identity** (aws.params) | the box's IMDS instance role | that org's manifest `AWS_PROFILE` | `rule.require.org-scope-identity-hardcut.md` |
| **aws param-name sentinel** (aws.params) | the legalized `_all_` segment | the org segment verbatim | `rule.require.aws-params-sentinel-legalization.md` |

a new vault that resolves any resource by `--org` scope MUST add a row here and honor the same
grove-vs-tree hardcut. the row names only the vault-specific RESOLUTION; the grain (grove vs
tree, manifest-or-not) is this rule's, not the vault's.

## .the proofs (each bound to an acceptance test)

the grain is proven vault-agnostic — the same grove-vs-tree hardcut holds across an aws-backed
vault and a purely local one:

| id | scenario | must hold |
|----|----------|-----------|
| n1 | aws.params `--org @all`, genTempDir with **no** repo manifest | set→unlock→get roundtrips; grove grain; identity = IMDS |
| n2 | aws.params `--org @all`, repo manifest present (org: testorg) | roundtrips; grove grain, **ignores** testorg |
| n3 | aws.params no `--org @all`, repo manifest present (org: testorg) | roundtrips; tree grain, scoped to `testorg` |
| n4 | os.secure `--org @all` machine-wide static key | set→unlock→get roundtrips machine-wide — the grain holds for a purely local vault |

## .see also

- `define.keyrack-org-scope.grove-vs-tree.md` — the invariant explained (grove vs tree, the why,
  the usecases)
- `rule.require.org-scope-identity-hardcut.md` — the aws-identity application of this general rule
- `define.aws-params-account-selection.md` — the aws.params-specific account selection
