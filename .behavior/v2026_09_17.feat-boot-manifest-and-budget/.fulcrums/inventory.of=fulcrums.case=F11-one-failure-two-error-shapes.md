# F11 — one failure class, two error shapes: the absent spec

**rework: clean · status: ANSWERED · confidence: 78%**

🔴 **raised at `review.self r3`**, from a challenge to requirement 5. it was already **a call the
vision had made and left un-itemized** — the yield's edge-case table calls it *"a tension for the
council"*, which is a fulcrum by another name.

---

## .the fork, stated fairly

requirement 5 says an absent or malformed manifest **fails loud**. the vision chose
`ConstraintError` (exit **2**, caller-fixable). but the closest extant path throws differently:

| the failure | extant shape | exit |
|---|---|---|
| an absent **role dir** (`bootRoleResources.ts:45-48`) | a bare `Error` with an embedded hint | **1** |
| a bad **schema** (`parseRoleBootYaml.ts:108-112`) | `ConstraintError` with path + structured detail | **2** |
| 🔴 an absent **manifest path** (this wish) | `ConstraintError` — **the vision's choice** | **2** |

⇒ so *"the spec I was told to boot is not there"* would render **two shapes**, by which kind of spec
it was, and the two carry **different exit codes** for the same caller mistake.

| option | the cost |
|---|---|
| **manifest → `ConstraintError`, role dir keeps its bare `Error`** | 🔴 two shapes for one failure class — the exact pattern a peer lane in this repo already graded a visible inconsistency |
| both → `ConstraintError` (**fix on contact** — this wish edits that very file) | changes an extant exit code **1 → 2**; requirement 4's spirit resists any extant-boot change |
| manifest matches the extant bare `Error` | 🔴 refuses requirement 5's own logic — a caller's typo reported as exit 1 — **and adds a 192nd site to a queued debt** |

---

## 🔴 .the three measured facts that turn this from taste into evidence

### 1. a peer lane in this repo has already graded "two shapes for one failure"

`.dream/2026_09_07.bind-fault-shows-two-shapes-for-one-failure.dream.md` carries lane
`enroll-verif-snapshot-blemishes` (i005 r010) verbatim:

> *"On a bind-fault, a human's terminal shows two differently-shaped outputs for one failure … Every
> peer case in the same file (4–7) shows only the single clean framed report — so this is a real,
> visible shape inconsistency, not a hypothetical one."*

⇒ and the fix that dream prescribes is **not** *"pick one arbitrarily"*:

> *"route the unawaited `ready` rejection through the **same** composer the awaited path uses, so
> one fault renders one frame."*

**so the precedent says: one failure class, one composer.** that is option 2, and it is the shape
this repo's own reviewer already asked for on a different path.

### 2. the extant bare `Error` is not correct behavior — it is a KNOWN, QUEUED defect

`.dream/2026_09_07.forbidden-error-parents-remain-at-191-sites.dream.md`:

> *"these parent classes are forbidden in production code because they exit with code 1 regardless
> of who should fix the issue."*

**191 sites across 78 production files**, re-measured 2026-09-07, with
`rule.forbid.helpful-error-parents` as its rubric.

### 3. 🔴 this wish's own file sits in the heaviest cluster — and its throw is WORSE than the 191

from that dream's slice table:

| area | files | why they cluster |
|---|---|---|
| **`src/domain.operations/invoke/**`** | **17** | *"role/skill lookup — almost all caller-fixable specifiers"* |

`bootRoleResources.ts` **is** `src/domain.operations/invoke/bootRoleResources.ts` — the heaviest
cluster, the one the dream describes as *"almost all caller-fixable"*, which is precisely the class
that owes `ConstraintError`.

#### ⚠️ but the site itself is NOT one of the 191 — self-corrected at `review.self r3`

**an earlier draft of this fulcrum claimed it was. a direct read refuted that.** the code:

```ts
// src/domain.operations/invoke/bootRoleResources.ts:45-48
const hint = isRepoThis
  ? `Create .agent/repo=.this/role=${slugRole}/[briefs,skills] directories`
  : `Run "rhachet roles link --repo ${slugRepo} --role ${slugRole}" first`;
throw new Error(`Role directory not found: ${roleDir}\n${hint}`);
```

`throw new Error(...)` — a **bare `Error`**. and the 191-site census's own predicate is:

```
throw new (BadRequestError|UnexpectedCodePathError)   |   (…)\.throw
scope: src/, prod only (*.test.ts excluded)
```

⇒ **a bare `Error` matches neither alternative, so this site was never counted.**

🔴 **and that makes the finding stronger, not weaker.** the two parent classes are forbidden because
*"they exit with code 1 regardless of who should fix the issue"*. a bare `Error` is not even in the
`helpful-errors` hierarchy — it is **further** from a classified error than the 191 are, and it is
invisible to the census that tracks them.

| the throw | in the hierarchy? | counted in the 191? | exit |
|---|---|---|---|
| `BadRequestError` / `UnexpectedCodePathError` | ✅ yes, as a forbidden **parent** | ✅ yes | 1 |
| 🔴 `new Error` — this site | ⛔ **not at all** | 🔴 **no** | 1 |
| `ConstraintError` / `MalfunctionError` | ✅ yes, the required **leaves** | n/a | 2 / 1 |

⇒ so the rule this site violates is not `rule.forbid.helpful-error-parents` (it has no forbidden
parent) — it is **`rule.require.failloud`**: *"error without proper class = blocker."* and the
practical consequence is unchanged: `getExitCodeFromError` defaults to **1**, so a caller's typo in
a role slug is reported as a server malfunction.

🟡 **the honest net: the unclassified-throw debt in `src/` is LARGER than 191**, and this site is
one instance the census cannot see.

---

## 🔴 .why this re-frames the vision's own words

the yield's edge-case row reads:

> *"this makes the manifest path **inconsistent with** the extant role-dir throw at `:45-48`, and
> that tension is for the council"*

**that assumes the extant throw is a correct baseline to be consistent with.** it is not.

⇒ so the honest statement is the reverse: **the vision's `ConstraintError` choice is aligned with
this repo's declared repair direction, and the inconsistency it creates is transient** — it lasts
until the `invoke/**` area's sweep lands. the vision does not depart from a standard; it reaches
the standard before its neighbour does.

🟡 **and the deferral reason the 191-site dream records does not apply here.** it deferred because
*"its intersection with this behavior's diff is **zero**."* for **this** wish the intersection is
not zero — `bootRoleResources.ts` is the file this wish edits most (the gate at ~line 147, the
`<stats>` line at 148-154, the throw at 45-48). ⇒ `rule.always.fix-forward-under-scouts-honor` puts
this **on contact**.

---

## .the guess taken, and why

**option 1 for this wish — `ConstraintError` for the manifest, leave `:45-48` alone — and raise
the one-composer question as this fulcrum rather than absorb it in silence.**

| the argument | |
|---|---|
| the two scouts-honor questions split | it is **CLEAN** (one throw, in a file already open) and ⚠️ **not SAFE** — it flips an extant exit code `1 → 2` on a path no requirement names |
| requirement 4's spirit governs | the wish's one hard bound is *"no blast radius on extant boots"*. an exit-code change is blast radius, even one that corrects |
| the debt has an owner and a shape | the 191-site dream forbids a find-and-replace and prescribes a **per-area sweep, one area per PR**. `invoke/**` is one of its four named areas — so `:45-48` has a queue, and this wish is not it |
| the inconsistency is **transient and documented** | materially different from an inconsistency nobody has written down |

⇒ **so the guess is "do not fix it here, and do not call it a tension either."** name it, cite its
queue, and say plainly that the vision reaches the standard first.

---

## .the confidence — 78%, and where the doubt sits

| confident | not confident |
|---|---|
| the extant bare `Error` is a known defect, in a named queue, in the heaviest cluster | whether **option 2** should win anyway — this wish is *in* the file, and one throw is a very small diff |
| `ConstraintError` is right for an absent manifest path (a caller's typo owes exit 2) | whether a reviewer reads the transient two-shape state as a requirement-5 breach rather than a queued debt |
| the two-shapes pattern is graded a real inconsistency here, with a quote | whether the `invoke/**` sweep is near enough that "transient" is honest |

🟡 **the 22% is mostly one worry: I may be too conservative.**
`rule.always.fix-forward-under-scouts-honor` is emphatic that a CLEAN fix in a file you already
touch should be taken now, and *"I wasn't asked to"* is explicitly not one of its two questions. my
refusal rests entirely on **SAFE** — an extant exit-code change — and a reviewer could fairly judge
that a 1 → 2 correction on an already-forbidden throw is safe, since no caller can depend on a
documented-wrong exit code.

⇒ I take the conservative guess because requirement 4 is the wish's one **explicit** bound on blast
radius, and a wish's explicit bound outranks my read of a general rule.

---

## .the rework cost — why clean

either way it is **one throw** plus whichever exit-code assertion covers it. no contract, no
persisted value, no schema change. ⇒ and it stays clean **only until the manifest path's own
`ConstraintError` is snapshotted**, at which point a later switch to one-composer re-snaps both.

---

## .where

- `src/domain.operations/invoke/bootRoleResources.ts:45-48` — the extant bare `Error`, exit 1
- `src/domain.operations/boot/parseRoleBootYaml.ts:108-112` — the extant `ConstraintError`, exit 2
- `1.vision.yield.md`, the edge-case table — the *"tension for the council"* row this replaces
- `1.vision.experience.case=4.manifest-unreachable-fails-loud.md` — the cell that renders it
- `.dream/2026_09_07.bind-fault-shows-two-shapes-for-one-failure.dream.md` — the peer grade + the one-composer prescription
- `.dream/2026_09_07.forbidden-error-parents-remain-at-191-sites.dream.md` — the 191 sites, and the `invoke/**` cluster of 17
- `rule.forbid.helpful-error-parents` (repo=.this) — the rubric behind the 191; ⚠️ **it does not
  cover this site**, since a bare `Error` has no forbidden parent
- 🔴 `rule.require.failloud` (ehmpathy/mechanic) — *"error without proper class = blocker"*, the rule
  this site actually violates
- `rule.require.exit-code-semantics` (ehmpathy/mechanic) — why 2 rather than 1
- `rule.always.fix-forward-under-scouts-honor` (bhrain/driver) — the SAFE/CLEAN test this turns on

## .the verdict

_(open — for the fulcrum council. a design call, so it is not flagged for the wisher)_
