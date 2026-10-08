# seed S4 — the budget gates our OWN specs only

**caught 2026-09-18, at the `1.vision` approval gate, in answer to `F10`.**

---

## .said

> Own-specs only

*(selected against the alternatives: owner-aware remedies — my best guess at 60% — and defer it
entirely.)*

---

## .settled

**the budget gate applies where the spec is writable by this repo. a foreign spec's `budget` does
not halt a consumer.**

⇒ 13 of the 15 extant `boot.yml` specs are symlinks into a version-pinned pnpm store. so a halt on
one of those would name — in all three of its remedies — a file the halted party cannot write. the
wisher's answer removes that surface from the feature rather than build a remedy set for it.

🔴 **it also refuses the new capability my guess implied.** the owner-aware option needed an
override flag, and an override flag is adjacent to the two consumer halves the wish explicitly
forbids this behavior to build (`rhachet-roles-bhrain#510`, `rhachet-roles-bhuild#392`). ⇒ the
wisher held the scope bound they reserved, which is exactly the axis `0.wish.md` keeps while it
delegates mechanism.

## 🔴 .what this costs, stated plainly

**requirement 2 — *"a loud hard stop, never a warn"* — now carries an exception**, and it is the
first exception in the wish's requirement set:

| the spec | over budget ⇒ |
|---|---|
| writable by this repo | 🔴 **halt.** requirement 2, unchanged |
| a foreign spec (symlinked, version-pinned) | 🟡 **not gated.** the remedies would name an unwritable file |

⇒ so *"is this spec ours?"* becomes a **contract question the mechanism must answer**, not an
incidental detail. the vision owes the criteria stage a definition of *writable* that a builder can
implement — and the honest candidate is a **realpath escape check**: a spec whose realpath leaves
the repo is foreign. that is the same boundary `cpsafe`/`rmsafe`/`teesafe` already hold, and the
same one axis D's `outside-repo` invariant holds for the `--manifest` value.

🟡 **and it is a narrower reach than a reader might assume.** on day one the budget gates **2 role
specs plus every new manifest** — which still covers this wish's own motive completely, since the
~46% payload that prompted it was a route-scoped custom manifest.

---

## .landed

- `F10` flips from `[wisher]` to **answered by the wisher**, against my 60% guess. the fulcrum
  inventory's open-question count goes to **0 wisher items**
- requirement 2 gains its first stated exception, and the vision must carry it explicitly rather
  than leave a reader to infer it
- 🔴 a **new contract question** for the criteria stage: what makes a spec *ours*? the candidate is
  a realpath escape check, which reuses an invariant this repo already holds in three skills
- 🔴 **the durable check:** a remedy list is part of a halt's contract. where a remedy names a file
  the halted party cannot write, the halt has no remedy — and the fix may be to narrow the gate
  rather than to widen the remedies
