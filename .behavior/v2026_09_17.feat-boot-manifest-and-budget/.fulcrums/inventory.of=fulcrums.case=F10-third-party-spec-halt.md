# F10 — does the budget gate a spec the halted party does not OWN?

**rework: clean · status: 🔴 ANSWERED — BY THE WISHER · confidence: 100%**

## 🔴 .SETTLED 2026-09-18 — OWN SPECS ONLY

**taken: the gate applies to specs this repo can write. a foreign spec's `budget` does not halt a
consumer.** it is now **requirement 8** of the wish (seed **S4**).

⇒ the wisher **narrowed the gate** rather than widen the remedies — against my 60% guess, which was
owner-aware remedies, and which needed an override flag adjacent to the two consumer halves the wish
forbids. 🔴 **the escalation was right and the guess was wrong**, which is the good outcome for a
`WISHER` item: I marked the scope question rather than settle it, and the answer came back different
from my lean.

### 🔴 what it costs — requirement 2's first exception

| the spec | over budget ⇒ |
|---|---|
| writable by this repo | **halt.** requirement 2, unchanged |
| a foreign spec (symlinked into a version-pinned store) | 🟡 **not gated** |

⇒ so *"is this spec ours?"* is now a **contract question the mechanism must answer**, and the vision
owes the criteria stage a definition a builder can implement. the candidate: a **realpath escape
check** — a spec whose realpath leaves the repo is foreign. that reuses the boundary
`cpsafe`/`rmsafe`/`teesafe` already hold, and the one axis D's `outside-repo` invariant holds for the
`--manifest` value.

🟡 **and it narrows the reach, stated plainly:** on day one the budget gates **2 role specs plus
every new manifest**. that still covers this wish's own motive completely — the ~46% payload was a
route-scoped custom manifest — but a reader who expects *"every boot in this repo is now budgeted"*
will be wrong.

---

🔴 **raised at `review.self r2 / has-questioned-requirements`**, from a challenge to requirement 2.
it is the only fulcrum found by a question about **scope** rather than about mechanism.

⇒ 🔴 **and that sentence is exactly why it is the ONLY `WISHER` item in the set of 14.** confirmed at
`review.self r4`, after a sweep re-graded `F3`, `F1`, `F13`, `F12`, `F14`, and `F9` to `ANSWERED`.
the test that sorts them:

> **does this question change WHAT we build, or HOW we build it?**

`0.wish.md:115-120` delegates the HOW by name — the flag, the gate's position, the counter, the
halt's shape — and reserves the WHAT: *"the `.what` / `.why` / requirement table are
authoritative."* every other fulcrum is a mechanism call. **this one asks whether a whole surface is
in scope**, and its third remedy (an override flag) is a new capability adjacent to the two consumer
halves the wish forbids me to build.

---

## .the fork, stated fairly

requirement 2 says an over-budget boot is a **loud hard stop**. requirement 3 says the halt
**names the remedies**. both are right, and together they assume one premise that is untrue for
most specs in this repo:

> **that the party who is halted can perform the remedies.**

| option | the cost |
|---|---|
| **the budget gates every spec, whatever its source** | 🔴 a consumer repo halts on a **third-party** role's budget, and cannot close it — see the arithmetic below |
| the budget gates only specs the calling repo **owns** (`repo=.this` + any `--boot-manifest` path inside the repo); a third-party overage **warns** | two behaviors for one key, and a warn is what requirement 2 forbids |
| gate all sources, and add a **local override** (`.agent/boot.budget.local.yml`, or a `--budget` flag) | the consumer gets a real remedy, at the cost of a second place a budget can live |

---

## 🔴 .the measured arithmetic — 13 of 15 specs are not ours

```
rhx globsafe --pattern '.agent/repo=*/role=*/boot.yml'   → 15 files
```

| source | n | writable by this repo? |
|---|---|---|
| `repo=.this` — ours | **2** | ✅ yes |
| `repo=bhrain` · `bhuild` · `ehmpathy` · `ghlitch` · `bhrowser` · `rhachet` | **13** | 🔴 **no** |

and the 13 are not merely "someone else's" — they are **symlinks into a versioned pnpm store**:

```
.agent/repo=bhrain/role=driver/boot.yml
  → ../../../node_modules/.pnpm/rhachet-roles-bhrain@0.37.0_…/node_modules/
      rhachet-roles-bhrain/dist/domain.roles/driver/boot.yml
```

⇒ so the target sits inside `dist/`, inside a **version-pinned store path**. an edit there is
**wiped by the next `pnpm install`**, and it is a published artifact of another repo.

### 🔴 every remedy `case=2` offers requires a write to that file

| the remedy | what it needs |
|---|---|
| move a `say` entry to `ref` | 🔴 edit the third-party `boot.yml` |
| point `say` at a `.min` variant | 🔴 edit the third-party `boot.yml` |
| raise the declared budget | 🔴 edit the third-party `boot.yml` |

⇒ **a halt whose every remedy names a file the halted party cannot write is a halt with no
remedy.** the session does not start, and the only real moves are *do not upgrade* or *fork the
role package*.

🟡 this is the product-level form of a rule this repo already holds:
`rule.always.raise-a-blocker-a-taken-cannot-close` — **OWED ≠ PERMITTED.** a fix the actor could
imagine but is not permitted to make is not a fix.

---

## ⚠️ .why it is NOT a defect in this wish today — and is still a fork

**requirement 4 defers the whole blast radius.** a spec with no `budget` renders as today, and
**none of the 15 declares one** (`budget` is a key this wish introduces). so the halt cannot fire
on a third-party spec on day one.

🔴 **the risk is forward, and it arrives by someone else's release:**

1. `rhachet-roles-bhrain@0.38.0` ships a `boot.yml` with `budget: { tokens: 5_000 }` — a good act,
   the feature at work as intended for *its* authors
2. `0.39.0` adds two briefs and its resident payload reaches 5,400
3. **every consumer repo that upgrades halts**, on a cap they did not set, for a payload they did
   not author, with every strategy the halt names a write they cannot make

🟡 **and step 3 is now doubly closed.** requirement 8 makes the consumer-side rung a **warn** rather
than a halt; requirement 9's **gate 1** means the upstream author's own `npm run build` refuses at
step 2, in their own tree, before `0.39.0` is ever published.

⇒ and note step 2 is exactly the accretion this wish exists to catch — **caught in the wrong
repo.** the cap does its job for the author and hands the bill to the consumer.

---

## .the guess taken, and why

**gate every source (option 1), AND make the halt's remedy set a function of the spec's OWNER.**

```
🧢 roles boot --repo bhrain --role driver
   ├─ ✋ over budget
   │  ├─ budget   = 5,000 tokens   (declared by rhachet-roles-bhrain@0.39.0)
   │  ├─ payload  = 5,400 tokens
   │  └─ over by  =   400 tokens
   │
   ├─ ⚠️ this spec is not yours to edit
   │  └─ .agent/repo=bhrain/role=driver/boot.yml → node_modules/…@0.39.0/…
   │
   └─ fix — pick one
      ├─ pin the prior version     rhachet-roles-bhrain@0.38.0
      ├─ override the budget       --budget 6000   (this invocation only)
      └─ report it upstream        ehmpathy/rhachet-roles-bhrain
```

| the argument | |
|---|---|
| requirement 2 is kept **intact** | the halt stays a hard stop for every source — no second behavior, no warn |
| requirement 3 is **honored rather than nominally satisfied** | `rule.require.errors-name-the-fix` asks for the fix, and a fix the reader cannot perform does not satisfy it |
| it reuses a distinction the renderer **already has** | `repo=.this` vs a `repo=$slug` symlink is already how `.agent/` is laid out (`define.agent-dir`) |

🟡 **`case=6` already found that the remedy list is a function of the spec's MODE.** this is the
same shape on a second axis: **the remedy list is a function of the spec's OWNER too.** a hardcoded
three-item list is wrong for both cells.

---

## .the confidence — 60%, the second-lowest in the set

| confident | not confident |
|---|---|
| the gap is real, and the arithmetic is measured | whether an **override** is the right third remedy, or a licence to ignore every budget |
| requirement 3 is not satisfied by an unperformable remedy | whether *"pin the prior version"* is a remedy or a non-answer |
| the remedy set must vary by owner | whether the wisher wants this in scope **at all**, or dispatched with the consumer halves |

🔴 **the 40% is mostly one question I cannot settle from here:** an override flag is the only remedy
that lets a consumer proceed, and it is also a hole straight through the cap — the exact *"a budget
declared is a budget that can be raised"* con the yield already names, now available to a party with
**no** stake in the payload's size.

⇒ so I take the guess **with the override named and flagged**, rather than a silent include or a
silent omission.

---

## .the rework cost — why clean

the owner test is a string check on the resolved path; the remedy list is already a template. no
contract, no persisted value, no schema change. ⇒ and it stays clean **only until a consumer
hardcodes a remedy string**, which is the same window `F3` has.

---

## .where

- `rhx globsafe --pattern '.agent/repo=*/role=*/boot.yml'` — the 15, and the 2 that are ours
- `file .agent/repo=bhrain/role=driver/boot.yml` — the symlink into the versioned store
- `1.vision.experience.case=2.over-budget-halts.md` — the four strategies, each needs a write
- `1.vision.experience.case=6.subject-scoped-budget.md` — the precedent: the remedy list already
  varies by mode
- `rule.always.raise-a-blocker-a-taken-cannot-close` (bhrain/driver) — **OWED ≠ PERMITTED**
- `define.agent-dir` (repo=.this) — the `repo=.this` vs `repo=$slug` layout the owner test reuses

## .the verdict

🔴 **WISHER — the one question in this vision I am not permitted to close.**

⇒ the guess below stands as the recommendation (gate every source, make the remedy set a function of
the spec's **owner**). what the wisher must rule on is narrower and stated plainly:

> **is a foreign spec's budget in scope for THIS wish, or dispatched with the consumer halves?**

🟡 **and it is not urgent.** requirement 4 defers the whole blast radius — no extant spec declares a
`budget`, since `budget` is a key this wish introduces — so the halt it describes cannot fire today.
it can wait for the council; it does not hold the road.
