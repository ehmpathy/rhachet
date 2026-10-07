# F26 — sweep the tree elbow repo-wide, or stop at this diff?

- **rework** = 🔴 **dirty** — a later sweep must re-open 27 files across 12 subsystems and re-run
  most of the acceptance tier. 🟡 the grade follows the **reversal**, never the taken: to stop is
  cheap, and to un-stop later is not
- **status** = ANSWERED — B taken
- **confidence** = **90%**, and the 10% is named below
- **where** = `src/utils/getOneTreeElbow.ts` · 42 call sites across 27 files
- **raised** = 2026-09-20, at `5.1.execution` `review.peer i007 r011` (`enroll-impl-arch-defects` §3)

---

## .the fork

r011 §3 found the elbow ternary `index === length - 1 ? '└─' : '├─'` at **six** sites inside this
behavior's own diff. the transformer was extracted and the six were repaired.

🔴 **then the sweep the repair owes was run, and it found 42 more.**

```
rhx grepsafe --pattern '└─.*:.*├─' --glob '*.ts'   → 46 in 29 files
   − getOneTreeElbow.ts (2)   − calc.tokens.ts (2, F24)   = 42 in 27
```

| option | what it costs |
|---|---|
| **A** — sweep all 42 | one owner for the glyph, repo-wide. and it re-opens keyrack, clone, link, init, upgrade, cli list, cost, context, skill list, repo compile, manifest, enroll — 12 subsystems this behavior never touched |
| 🔴 **B** — repair the 6 in-diff, dream the 42 (taken) | the duplication r011 named is gone; the pattern survives elsewhere, recorded |
| **C** — inline the 6 back, dream all 48 | 🔴 **wrong.** r011's concern is about **this diff**, and a concern answered by "I will do it later, everywhere" is not answered |

---

## .taken, and why

🔴 **taken: B.** the SAFE/CLEAN test, per half (`rule.always.fix-forward-under-scouts-honor`):

| half | SAFE? | CLEAN? | verdict |
|---|---|---|---|
| the **6 in-diff** sites | ✅ | ✅ **every file is mine, written this round** | 🔴 **fix now** |
| the **42 elsewhere** | 🟡 **mostly** — see below | 🔴 **no.** 27 files, 12 subsystems, and the acceptance tier that pins their renders | dream it |

🟡 **the SAFE column is 🟡 rather than ✅, and that is the part a one-line summary would lose.** the
sweep is not a substitution, because the glyph pair is **five literals**, not one:

| literal | width | sites |
|---|---|---|
| `'└─'` / `'├─'` | 2 | the majority |
| `'└──'` / `'├──'` | 3 | `getAvailableBrainsInWords.ts` · `invokeRolesCost.ts` · `execNpmInstall.ts` |
| `'└── '` / `'├── '` | 4, one space at its end | `invokeList.ts` ×4 · `formatCostTree.ts` |
| `'   └─'` / `'   ├─'` | 2, 3-space indent | `invokeKeyrack.ts` ×2 · 4 clone views |
| `'   │  └─'` / `'   │  ├─'` | 2, nested continuation | `invokeKeyrack.ts:2398` · `invokeInit.ts:143` |

🔴 **and one site is a THREE-way**: `formatCostTree.ts:79` reads `isRoot ? '' : isLast ? '└── ' :
'├── '`. the transformer returns one of two glyphs and has no root arm, so a mechanical rewrite
would render an elbow where the root renders an empty string.

⇒ **so the deferred work is a DESIGN decision, not a sweep**: does width belong in the transformer
(`getOneTreeElbow({ index, length, width: 3 })`) or at the call site? that question has no answer
this behavior is positioned to give, because every input to it lives in a subsystem this diff never
opened.

---

## 🔴 .the second half — five words for one concept

the sweep found more than duplication. `rule.forbid.domain-term-inconsistency` forbids one concept
named with two or more words where no canonical term is declared; this one carries **five**:
`prefix` · `branch` · `connector` · `marker` · `elbow`.

⇒ **the inconsistency is the signal the term earned its coinage** — the rule says so in as many
words. `elbow` is declared canonical in `getOneTreeElbow.ts`'s docblock **this round**, which is
the half that is not deferrable: a settled term lands in the round that settles it.

🟡 **the other four stay in place until disturbed**, per that rule's own no-forced-rewrite clause.
so the deferred half is a **rename**, and a rename is exactly what `rule.forbid.domain-term-*`
declines to sweep.

---

## .what would flip it

- a **third** in-diff site appears in a later stone of this behavior — then the transformer's
  signature is being decided by this behavior anyway, and the width question comes with it
- a render defect traced to a **divergent** elbow (one site renders `├──` where its peers render
  `├─`) — that makes the sweep `urgent` rather than `better`, because it ships a visible harm
- `F24` settles that an `.agent/` skill **may** import from `src/` — that adds `calc.tokens.ts` to
  the in-diff set, since this behavior wrote it

---

## .the clamps

**the 6 in-diff sites** — no new clamp is owed, and that is itself the finding: `roles.budget`,
`roles.boot.manifest`, and the `syncHooksForLinkedRoles` suites already snapshot every one of those
renders. the extraction was proved by a full green run across all three
(17 + 30 + the hook suite), with no snapshot written.

⚠️ **so the extraction is clamped by REGRESSION, never by a new assertion.** a transformer that
changed a glyph would have moved a snapshot; none moved.

**the 42 deferred** — none. the dream names what the sweep would owe: a run of the suites that pin
those 27 files, which is most of the acceptance tier.

---

## .see also

- `.dream/2026_09_20.the-tree-elbow-is-re-derived-at-42-sites-under-5-names.dream.md` — the deferred
  work, with the full site table and the width/root analysis
- `src/utils/getOneTreeElbow.ts` — the transformer, and the `elbow` term it declares canonical
- `F20` — the same shape, for the infra walk: one in-diff repair, a dreamed sweep, and a
  `what would flip it` clause that later fired
- `F24` — may an `.agent/` skill import from `src/`? the one site this row cannot claim
- `rule.forbid.domain-term-inconsistency` (learner) — why five words is the signal, and why the
  rename is not swept
- `rule.always.fix-forward-under-scouts-honor` (driver) — the SAFE/CLEAN test, run per half
