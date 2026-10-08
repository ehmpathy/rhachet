# seed S3 — the counter must be accurate, and that is a REQUIREMENT

**caught 2026-09-18, at the `1.vision` approval gate, after F12 was disclosed.**

---

## .said

> explain why? F12 found that the boot's chars counter sees 36.5% of what the boot actually emits —
> 16,427 reported against 44,982 emitted. ; why is the tokenizer so wrong?

> we gotta get an accurate one

> make that part of the requirement

---

## .settled

**the counter must be accurate, and accuracy is a requirement rather than a delegated tradeoff.**

⇒ this **reverses** the vision's own guess. `F1` had taken `ceil(chars / 3.5)` — a deliberate
overcount, chosen because an undercount passes an over-budget boot and the alternative looked too
slow. the wisher refused the tradeoff rather than pick a side of it.

🔴 **and the question "why is the tokenizer so wrong" has a sharper answer than the vision had
written down: there is no tokenizer.** `tokens ≈ chars / 4` is a heuristic. so the error was never
a tokenizer's inaccuracy — it is two independent defects that compound:

| # | the defect | factor | what it is |
|---|---|---|---|
| 1 | the **numerator** — a scope error over which bytes are summed | **2.72x** | the heuristic is applied to 16,427 chars while 44,666 are emitted. every `ref` line, the whole `<also>` block, and all XML chrome are emitted and never summed |
| 2 | the **divisor** — a heuristic wrong for this corpus | **1.21x** | measured live on a real boot payload: its true density is **3.31 chars/token**, not 4.0 |

`2.72 × 1.21 = 3.29`, and measured end-to-end the boot reports **4,107 tokens** for a payload that
is **13,494** real tokens. ✅ the decomposition reconciles exactly.

⇒ **both defects undercount, so they compound in the dangerous direction** — the one that passes an
over-budget boot, which is the exact silent pass requirement 2 exists to forbid.

## 🔴 .the tradeoff the vision thought was fundamental is not

`F1` had refused the real tokenizer because it costs seconds against a live `under 250ms` perf
assertion on the boot path. **that argument missed what requirement 4 already grants:**

> **a boot with no `budget` needs no counter at all.**

so the tokenizer loads **lazily, only when a `budget` is declared**. an unbudgeted boot — which is
every extant boot, and the whole subject of the `under 250ms` assertion — pays zero and is
byte-identical. a budgeted boot pays the tokenizer, and it is a **new** path that owes a **new**
assertion rather than a breach of an extant one.

🔴 **requirement 4 was read for six rounds as a blast-radius shield alone. it is also the perf
shield**, and that second sense is what makes accuracy affordable.

---

## .landed

- `F1` flips: `ceil(chars / 3.5)` → **a real tokenizer** (`js-tiktoken`, already a dependency,
  already in use at `calcBrainTokens.ts`), lazily loaded on a declared `budget`
- `F12` is no longer a disclosure with a partial repair — the **full rendered payload** is the
  gated quantity, because a 2.72x scope error is the larger half of an accuracy requirement
- 🔴 the wish gains **requirement 7**, and the vision's `.what is awkward` #1 — *"we would ship a
  counter we know is wrong, and call it `tokens`"* — is **retired** rather than disclosed
- 🔴 **the durable check:** when a cost looks prohibitive, ask which callers actually pay it. an
  opt-in feature's cost falls on opt-in callers, so a global assertion may not sit in its path at all
