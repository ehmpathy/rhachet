# seed S8 — tokenization is fast; it was the ENCODER CONSTRUCTION that was slow

**caught 2026-09-18, at the `1.vision` approval gate.** one question refuted a measurement the
vision had carried for six rounds and cited in four artifacts.

---

## .said

> wait, how slow is tokenization? i thought it was fast

then, twice, when I began to answer from the extant numbers:

> and we already do it onboot anyway

> we literally already use it onboot

*(quoted against `F1`'s perf table — the one that asserts ~1.66s and a 6.6x breach of a live
`under 250ms` assertion.)*

---

## .settled

**tokenization is fast. the ~1.66s was encoder construction, and it is once per process.**

measured via `rhx perf.test`, three runs:

| component | cost | scales with |
|---|---|---|
| process + `tsx` startup | ~81ms | naught |
| 🔴 **encoder construction** | 🔴 **~1,800ms** | naught — **once per process** |
| 🔴 **encode** | 🔴 **0.97 MB/s** ⇒ **~46ms** for a 44,666-char payload | the payload |

⇒ **two operations, and only one of them scales.** `1,882ms` for one small file and `4,973ms` for
the whole corpus reconcile exactly: one construction, plus encode proportional to bytes.

🔴 **so encode sits INSIDE `under 250ms` with room to spare.** the claim *"a real tokenizer breaches
a live assertion by 6.6x"* measured one operation and charged the cost to another.

## 🔴 .the wisher's second point was the sharper one

> we literally already use it onboot

`calcBrainTokens.ts` uses `js-tiktoken` today, and `roles cost` reaches it. 🟡 **the strict sense of
*"onboot"* is not quite right — `getRoleFileCosts.ts:81` is `Math.ceil(chars / 4)`, so `roles boot`
does NOT run the tokenizer today.** but the *point* holds completely: the tokenizer is already in
this repo's hot paths, and its cost was never the disqualifier I claimed.

## 🔴 .the ORIGINAL evidence was itself a measurement artifact

worth the record, because it is the more instructive half. my first pass had noted that a **corpus**
run appeared *faster* than a **single-file** run, and I took that to mean *"the cost is almost
entirely fixed."*

⇒ **directionally right, evidentially wrong.** the correct decomposition needed a subtraction across
three payload sizes, not a comparison of two.

🔴 **and it hid a real constraint:** `calcBrainTokens.ts:15` constructs the encoder **inside the
function body**, so a per-file loop pays ~1.8s **per file**. ⇒ **any implementation must construct
once and reuse** — a genuine design constraint the wrong measurement nearly buried.

## ✅ .the comfortable third, which had existed for six rounds

the vision's `.what is awkward` section read: *"the honest options are both uncomfortable … **there
is no comfortable third**."* it was wrong twice over:

| the claim | the hole |
|---|---|
| *"a path that asserts `under 250ms`"* | 🔴 it names the **unbudgeted** boot path, which needs no counter at all. **requirement 4's lazy load had removed this six rounds earlier** |
| *"pay ~1.66s for accuracy"* | 🔴 **accuracy costs ~46ms** |

⇒ **requirement 4 was read for six rounds as a blast-radius shield alone. it is also the perf
shield.**

## 🔴 .and it merges with `S5` — the two corrections solve each other

| `S5` gave | `S8` gave | together |
|---|---|---|
| the gate runs in a **build step** | construction is the only slow part | 🔴 **~1.8s is free where gate 1 runs** |
| the build already writes `rhachet.repo.yml` | the count is a **scalar** | 🔴 a **precomputed** count makes gate 3 an integer comparison — **zero tokenizer on the boot path** |

⇒ two independent wisher corrections, made minutes apart, **simplify the same mechanism**.

---

## .landed

- 🔴 `F1`'s perf objection **refuted**, with the decomposition on the record. the fulcrum's whole
  `.the confidence` section is re-graded: 2 of its 3 "confident of" rows were false, and 2 of its 3
  stated doubts were right
- 🔴 `F1′` **dissolved rather than priced** — the cache existed to dodge a cost that was avoidable
  (lazy load) **and** misnamed (construction, not encode). `1 research → 0`
- the yield's `.what is awkward` item 1's *"no comfortable third"* claim, **struck with both holes
  named**
- `case=5.no-budget-renders-as-today` — its perf section now guards the **lazy load** rather than
  refuse the counter, and it names the new assertion a budgeted boot owes
- 🔴 **two new criteria items** on `F1`: `1′` which perf assertion a budgeted boot owes, and `2′`
  whether `rhachet.repo.yml` gains a token-count field
- 🔴 **the durable lesson, and it is about evidence rather than tokenizers:** *"a number is not a
  warrant."* both measurements the wisher refuted this round — `F4`'s 96% and `F1`'s 1.66s — were
  **real measurements of the wrong subject**, and both read as evidence precisely because they
  carried digits. ⇒ **before a measurement becomes a premise, name the operation it measured and
  check that it is the operation in question.**
