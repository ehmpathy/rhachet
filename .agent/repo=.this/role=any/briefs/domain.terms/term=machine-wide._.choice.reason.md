# domain.term.choice.reason: machine-wide

## .etymology

the keyrack domain scopes a credential by **whose namespace declared it** — its *provenance*
(`invokeKeyrack.ts:465-467`). the org segment of a slug names that provenance, and it takes three
kinds of value:

| org segment | provenance |
|---|---|
| a real org (`ehmpathy`) | that org's repo manifest declared it |
| `@this` | the current repo's manifest declared it |
| `@all` | **the box itself** declared it — no repo did |

`machine-wide` is the adjective for the third. it names the *scope of the machine*, which is what
distinguishes the class: not "it applies to all orgs" but "it belongs to no org — it belongs to
this box."

the word is the repo's consistent choice at ~20 sites across source and tests.

## .disputes

### dispute: org-agnostic — raised 2026-08-25 — status: RESOLVED (keep `machine-wide`)

- raised.by  = the `fix-keyrack-all-skips-manifest` drive (via `ehmpathy/rhachet#467`'s sketch,
               which proposed `isKeyrackSlugOrgAgnostic`)
- claim      = "org-agnostic" describes the operative property — such a slug needs no org context
- counter    = it describes the wrong set. a **fully-qualified slug with a real org**
               (`ehmpathy.prep.FOO`) also "needs no org context" to derive, yet it is emphatically
               NOT machine-wide: it must still be checked against the repo manifest's org, or the
               `ORG_MISMATCH` guard at `asKeyrackKeySlug.ts:80-85` is silently retired. so
               "org-agnostic" would license a skipped security check for a real org's namespace.
               `machine-wide` names the box, which is the actual boundary
- counter.2   = only an `--org @any` would be org-agnostic — a sigil that fits under any org.
               `@all` is **not agnostic about org at all: it IS an org.** it names one concrete
               namespace, the box's own, with its own vault and its own declarations. "agnostic"
               would describe
               a hypothetical **`@any`** sigil — a key that matches under whichever org asks —
               which is a different concept keyrack does not have. so the word is not merely
               imprecise, it is **reserved**: to spend it on `@all` would block the one term that
               would correctly name `@any` if it ever exists
- resolution = keep `machine-wide`; record `org-agnostic` as a forbidden synonym, **and reserve
               it** for a future `@any`-shaped concept. the divergence is recorded as d1 in
               `.behavior/v2026_08_25.fix-keyrack-all-skips-manifest/1.vision.yield.md`

### dispute: manifest-free — raised 2026-08-25 — status: RESOLVED (keep `machine-wide`)

- raised.by  = the same drive, which proposed `isKeyrackAskManifestFree` for the ask grain,
               on the argument that "the ask's need" is a different question from "the slug's
               scope"
- claim      = the ask grain asks whether the manifest is needed, not whether the key is
               machine-wide; two questions deserve two words
- counter    = `machine-wide` already serves both grains, because the two are
               **coextensive by design**, not by coincidence. manifest-freeness is a *stated
               property of* machine-wide (`getAllMachineWideSlugsForEnv.ts:6-11`: an `@all` key
               *"must be unlockable with NO repo manifest at all"*). the "different question"
               argument confused a **quantifier** (over every key in the ask) with a **concept**;
               the `Ask` in `isKeyrackAskMachineWide` already carries the scope
- resolution = keep `machine-wide` at BOTH grains — `isKeyrackSlugMachineWide` +
               `isKeyrackAskMachineWide`. `manifest-free` forbidden. one concept, one word

### dispute: global — raised 2026-08-25 — status: RESOLVED (keep `machine-wide`)

- claim      = "global" is the familiar word for machine-scoped config
- counter    = ambiguous on two axes at once. keyrack already has an **env** value `all`
               (`env.all:`, every env of one org), and `@all.all.FOO` is a legal slug that uses
               both. "global" reads onto either axis, where `machine-wide` names the box
               unambiguously. see `rule.forbid.term.addition.ambiguous`
- resolution = keep `machine-wide`; `global` forbidden

## .evidence

**the design intent is stated in-repo**, `getAllMachineWideSlugsForEnv.ts:6-11`:

> *"an `@all` key is MACHINE-WIDE (the box's own namespace), so it must be unlockable with NO
> repo manifest at all — the bootstrap-to-clone credential path: the github-app install token is
> vaulted under `@all` precisely so it can be fetched from anywhere, even outside any repo,
> before any repo is cloned."*

**structural proof that the classes cannot overlap.** `getAllKeyrackSlugsForEnv.ts:19-21` builds
every repo slug from `manifest.org` — the manifest's own field. so a repo manifest can **never**
emit an `@all.*` slug. machine-wide and repo-scoped are disjoint by construction, not by
convention.

**the term carries weight at the cli boundary.** two hints shown to humans promise the property:
`invokeKeyrack.ts:1137` (*"for sudo credentials without keyrack.yml, use `--org @all`"*) and
`:1409`. so the word names a contract made to people, not merely an internal class.

## .invariants

- a machine-wide key is declared in the **host** manifest, never a repo manifest
- a machine-wide read is **manifest-free**: it needs no repo manifest to derive its slug
- the test is the **org segment**, exactly — never a loose match on the string `all`.
  `@allstar.prep.FOO` ⇒ false; `ehmpathy.all.FOO` ⇒ false (that is `env.all`, a different axis)
