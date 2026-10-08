# F38 — extract a shared `source → payload` chain, or keep the four call sites?

- **raised** = 2026-09-23, at `5.1.execution.from_vision`, `review.peer i018 r011`
- **rework** = clean
- **status** = **DISPUTED**
- **confidence** = **94%**

---

## .the fork, stated fairly

the lane names four call sites that resolve a source, then assemble its payload, and proposes one
shared transformer:

```ts
getOneBootSourceWithPayload(...): Promise<{ source, payload } | null>
```

its argument is the strongest one available here: `F30` deferred a decomposition on a recurrence
trigger, the trigger fired, and the deferral lost. so *"do it at four rather than wait for a
fifth"* is this route's own recorded lesson, quoted back.

| | **extract the shared chain** | **keep the four** |
|---|---|---|
| line count | 4 bodies collapse to 1 | 4 bodies stand |
| drift risk | one authority to patch | 🔴 already **measured at zero** — see below |
| the null states | 🔴 **two collapse into one** | each site branches on both |
| blast radius | 3 namespaces, 4 production sites, their clamps | naught |

---

## .the call, and why — at the time

**keep the four. the proposed signature is lossy, and the set is smaller than it is stated to be.**

three grounds, and the first two are checkable against the tree rather than argued.

### 1. 🔴 the fourth site is not a member of the set

`getAllRepoBootSpecCosts.ts:62-72` does **not** call `getOneBootSource`. it calls
`getOneBootSourceFromSpecPath`, which has a **different failure contract** — it *throws* a
`ConstraintError` on a vanished spec rather than a `null` return, and the whole body sits inside a
`try` that renders an unreadable-spec row. there is no `if (!source)` at that site at all, because
there cannot be one.

⇒ so the recurrence count is **3**, not 4, and the fourth member is the one whose shape most
resists the shared signature.

### 2. 🔴 the signature collapses two null states that two sites render DIFFERENTLY

`{ source, payload } | null` can express *"naught"*. it cannot express *"a source, and no
payload"* — and that is a state two of the three sites render as a distinct, user-visible outcome:

| site | `!source` renders | `!payload` renders |
|---|---|---|
| `invokeRolesCost.ts:143-161` | `🫧 role not present, skipped` | 🔴 **`🧢 roles cost <coordinates>` + `⚠️ no resources found`** — two lines, and it NAMES the spec |
| `bootRoleResources.ts:41-58` | bare `return` | 🔴 **`⚠️ No resources found in <rootDir>`**, gated on `ifPresent` |
| `assertRegistryWithinBudget.ts:89-92` | `continue` | `continue` — the one site where they agree |

⇒ **an empty payload is a LEGITIMATE state with its own render**, not an absence. to fold it into
the same `null` as "no source" would delete a line from two commands' stdout, both of which are
pinned by acceptance snapshots. the extraction is therefore not a refactor — it is a behavior
change that wears one.

🟡 **and the lossless variant buys naught.** a signature that keeps the distinction —
`{ source: null } | { source, payload: null } | { source, payload }` — leaves every call site with
the same two branches it has today, plus one indirection to read through. the branch count is the
cost, and the extraction does not reduce it.

### 3. the drift the extraction guards against is measured at zero

`F30`'s trigger was a **recurrence**: five repairs to one unit, each a patch of a defect the peers
shared. that is a fact about a history. here the history that would match it is empty — no round of
this route has repaired one of these three call sites and missed its peers. the chain is **four
lines long** and its two branches are each three lines; there is no logic in it to drift.

⇒ `rule.prefer.wet-over-dry` puts the abstraction at **three usages**, and this is three — so the
count alone does not settle it. what settles it is that the shared shape, once extracted, would
hold no decision. the decisions all live in the branches the call sites keep.

---

## .why the confidence is 94% rather than higher

**the 6% is the lane's frame, and it is right about the general pattern even where it is wrong
about this instance:** *"exactly the shape that tends to drift at one site and not its peers."*

⇒ and this round supplied a first-party instance of that very failure — `r011`'s item 1, a docblock
corrected at `i017` at the operation and left stale at its call site. so the lane reads a real
tendency of this subsystem, on a round where that tendency demonstrably fired.

🟡 the honest residual: **prose drifted where code did not**. this call refuses the code extraction
and does naught to bound the prose, and the docblock corrections at `i016`, `i017`, and now `i018`
are three instances of one class. a shared operation would have given those claims one home.

---

## .where

- `src/contract/cli/invokeRolesCost.ts:142-162` — the two-line `!payload` render
- `src/domain.operations/invoke/bootRoleResources.ts:38-58` — the `ifPresent`-gated warn
- `src/domain.operations/manifest/assertRegistryWithinBudget.ts:78-92` — the one site where both
  arms agree
- `src/domain.operations/boot/getAllRepoBootSpecCosts.ts:61-72` — 🔴 **the non-member**: a different
  source operation, a contract that throws, no `!source` arm
- `.fulcrums/inventory.of=fulcrums.case=F30-decompose-getonebootsource-now-or-defer.md` — the
  reversed row whose lesson the lane cites

## .the verdict, once ruled

_(open — for the fulcrum council)_
