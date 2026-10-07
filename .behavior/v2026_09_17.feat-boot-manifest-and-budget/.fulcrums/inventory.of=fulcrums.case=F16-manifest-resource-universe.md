# F16 — what is a manifest's resource universe?

**raised at `5.1.execution`, 2026-09-18** — the second fulcrum a build raised rather than a read.

`F7` settled what a manifest's globs are relative to (**its own directory**). `F8` settled the
`path=` label (**repo-root-relative**). neither settles the question those two leave open:

> **which files are CANDIDATES for a manifest's globs to match?**

---

## .why a read could not have found it

a role boot derives its universe from two hard-coded subdirs (`bootRoleResources.ts:53-73`):

```ts
const briefsDir = resolve(roleDir, 'briefs');
const skillsDir = resolve(roleDir, 'skills');
const briefFilesRaw = allFiles.filter((f) => f.startsWith(briefsDir));
const skillFiles = allFiles.filter((f) => f.startsWith(skillsDir));
```

**a route directory has neither subdir.** and the vision's own worked manifest globs files that sit
directly beside it:

```yaml
always:
  briefs:
    say: ['0.wish.md', '1.vision.yield.md']
```

⇒ so strict structural parity **breaks the vision's own example**: `0.wish.md` is not under
`briefs/`, so it would be in no universe and match no glob. the example renders empty.

🟡 that is what makes this a real fork rather than a detail — *"mirror the role"* is the obvious
answer and it is the one option that provably does not work.

---

## .the fork

| option | the universe | the cost |
|---|---|---|
| **A — every file under the manifest's dir** (minus the blocklist; `skills/` if present carries skills) | dir-scan, no subdir requirement | a `say: null` manifest says **every** file beside it — in a route dir that is `.seeds/`, `.fulcrums/`, `review/` too |
| **B — only the glob-matched files** (glob-driven discovery) | the declared globs ARE the universe | 🔴 `say: null` means *say all* — of naught. **a second dialect**, which requirement 1 forbids |
| **C — require a `briefs/` subdir**, exactly as a role does | strict structural parity | 🔴 **breaks the vision's own example**, and forces a route to restructure to be bootable |

---

## .the guess taken — option A

**the universe is every file under the manifest's own directory**, minus the extant blocklist, with a
`skills/` subdir contributing skills if one exists.

| the argument | |
|---|---|
| 🔴 **it is the only option that preserves schema parity** | requirement 1 demands `always.briefs.say`/`ref` behave identically. `say: null` means *say all* in a role boot, so it must mean *say all* here — and option B gives it a different meaning, which is the second dialect the wish names as forbidden |
| it is the only option the vision's own example renders under | `0.wish.md` sits beside the manifest, so the universe must include a manifest's neighbors |
| the sharp edge is **the feature's whole purpose**, not a defect | a `say: null` route manifest says every file beside it — which is precisely the ~46% payload the wish was written about. ⇒ **the budget is the answer to it.** ~~and `F9`'s warn covers the uncapped case~~ — 🔴 **STRUCK by `S11`; see `.the narrow`** |
| the renderer invents no policy | *which* neighbors to exclude is the author's call, expressed in globs. a renderer that guessed `.seeds/` is metadata would be a policy nobody declared |

### 🟡 what it costs, stated plainly

an author who writes a manifest with **no `say` key** in a busy directory gets a very large payload.
that is loud rather than silent — the `<stats>` files count reports it, and a declared budget
refuses it — but it is a sharp first experience.

⇒ the mitigation is **the pit of success in the docs, never a special case in the renderer**: a
manifest's worked example always carries an explicit `say`. the vision's example does.

---

## 🔴 .the narrow — 2026-09-23, `S11`. one of the two mitigations is CUT

the taken above rested on **two** mitigations for the busy-dir edge, and the wisher struck one:

| the mitigation | fate |
|---|---|
| a **declared budget** refuses the payload | ✅ **stands** — and it is the one that always did the work |
| 🔴 `F9`'s `🟡 no budget declared` warn | 🔴 **CUT.** the cap is opt-in by construction, so a spec with no budget has exercised a sanctioned choice; to advise against it grades a decision the contract grants |

⇒ **the taken is unchanged, and its confidence is better founded than before.** the cut removes a
mitigation that only ever fired on the **uncapped** case — and an uncapped manifest was never the
sharp edge this row named. **the sharp edge is a large payload, and a large payload is loud either
way**: the `<stats>` block reports every file and every token, on stdout, on the first boot.

🟡 **and the row's own residual doubt is now settled by the cut rather than by an argument.** its
`.the confidence` table read *"not confident: whether the `say: null` blast radius deserves a warn of
its own, beyond `F9`'s uncapped-manifest warn."* ⇒ **there is no warn to go beyond.** a manifest is
measured, never graded, and the one refusal is the cap the author declared.

### 🔴 .the clamp — the busy dir is demonstrated, not merely argued

`roles.boot.manifest.acceptance.test.ts` `[case12]` — *a manifest in a BUSY dir that declares no
`say` key* — boots a manifest beside `.seeds/`-shaped neighbors and snapshots what it renders.

⇒ that is the assertion this row's whole `.what it costs` section describes, and it is why the
sharp edge is a **documented experience** rather than an undemonstrated claim.

## 🔴 .what would overturn it

- a measured case where a route's metadata dirs (`.seeds/`, `.fulcrums/`, `review/`) make an
  explicit-`say` manifest unusable — e.g. if the **`<also>` block** or the ref list grows so long
  that the ref lines alone breach a reasonable budget. ⚠️ **that is now a live risk rather than a
  hypothetical**, because `F12` put every ref line inside the counted payload
- a decision that a manifest should carry its own blocklist key (`exclude:`), which would be a
  schema addition and therefore a wish-level scope call

## .the confidence — 80%

| confident | not confident |
|---|---|
| option B is a second dialect and option C breaks the example — so A is the only survivor | whether the `say: null` blast radius deserves a warn of its own, beyond `F9`'s uncapped-manifest warn |
| the schema-parity argument is decisive and comes straight from requirement 1 | whether a `skills/` subdir is the right skills convention for a non-role directory, or whether a manifest should simply have no skills |

## .where

`src/domain.operations/invoke/bootRoleResources.ts` — the discovery block, and `getOneBootSource`.

## .the verdict

pending council.

## .see also

- `inventory.of=fulcrums.case=F7-manifest-glob-base.md` — the glob base this builds on
- `inventory.of=fulcrums.case=F8-manifest-path-prefix.md` — the label this builds on
- `inventory.of=fulcrums.case=F9-uncapped-manifest-warn.md` — 🔴 the warn that **once** covered the
  sharp edge, cut by `S11`
- `inventory.of=fulcrums.case=F12-what-counts-as-payload.md` — why a long ref list now costs tokens
- `1.vision.experience.case=3.manifest-boot-within-budget.md` — the cell whose example forced option A
