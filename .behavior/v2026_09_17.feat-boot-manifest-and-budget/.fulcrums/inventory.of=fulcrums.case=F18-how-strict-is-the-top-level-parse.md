# F18 — how strict is the TOP-LEVEL parse?

- **rework** = clean
- **status** = ANSWERED
- **confidence** = 85%
- **where** = `src/domain.operations/boot/parseRoleBootYaml.ts` — `assertNoInertBudget`
- **raised** = 2026-09-18, at `5.1.execution` `review.self r2` (`has-pruned-backcompat`)

---

## .the fork

a MISSPELT top-level budget key was a **silent pass**, measured in both modes:

```
budgt:
  tokens: 20
briefs:
  say: ['doc.md']
```

⇒ exit **0**, a 117-token payload emitted, not one line of output to say the cap was ignored.

the question is **how wide the refusal should be**, and the three options are not close together:

| option | what it refuses | what it costs |
|---|---|---|
| **A** — a strict top-level schema | every unknown top-level key | 🔴 a **CONSUMER** halts on a foreign spec that adds a key we do not know yet — on a symlink they cannot edit |
| **B** — a list of known typos (`budgt`, `budgets`, `Budget`, …) | the enumerated variants alone | incomplete by construction; the next typo passes |
| 🔴 **C** — a STRUCTURAL test — a top-level key that holds a `tokens` field and is not `budget` | a declared token count no gate reads | a foreign key that declares `tokens` would be refused — and that is a budget synonym anyway |

---

## .taken, and why

**taken: C — the structural test.**

```ts
if (key !== 'budget' && 'tokens' in section)
  throw new ConstraintError(
    'boot.yml declares a top-level key with a token count, but the budget key is spelled `budget` — as written, the cap gates naught',
    { path: input.path, key, expected: 'budget' },
  );
```

the argument, in order of weight:

1. 🔴 **A reintroduces the defect requirement 8 exists to prevent, one layer lower.** the budget gate
   consults `lstat().isSymbolicLink()` to decide halt-vs-warn. the **parse** runs before ownership is
   known, so a strict parse halts every consumer of a foreign spec, with no symlink check able to
   reach it. that is `F10`'s unclosable halt, resurrected beneath the layer that solved it.
2. **B is a list, and a list is a guess about which typos exist.** the structural test catches every
   variant that declares a token count, enumerated or not — `[t2]` clamps `budgets:`, which the
   author never enumerated when the guard was written.
3. **C's false-positive surface is a domain-term collision, not an accident.** a foreign spec would
   have to declare a top-level key that holds `tokens` and is not a budget. that word has exactly one
   sense in a boot spec, so the collision is itself worth a refusal.

---

## .the residual 15%

- **C is narrower than the defect class.** `budgt: 20` — a scalar, no `tokens` field — still passes.
  ⇒ judged acceptable: it declares no token count, so there is no cap to honor. a reader who writes
  that has written a value that was never a budget in any form.
- **C is an inference about a future foreign spec.** the argument in 1 rests on specs not yet
  written, which no census can measure. the wisher may hold a different view of how much
  forward-compat a parse owes — see the open question in the review.

---

## 🔴 .what the CENSUS said, and why its first interpretation was wrong

both censuses were run complete, all 15 extant specs:

| level | keys found | stray keys |
|---|---|---|
| top | `briefs` (2, ours) · `always` (13) · `subject.*` (4, mechanic) | 🔴 **zero** |
| section | `briefs` · `skills` | 🔴 **zero** |

the first interpretation was *"permissiveness protects zero specs, so make it strict."* 🔴 **that
measures the wrong population.** the beneficiary of a forward-compat allowance is by construction a
spec **not yet written**, so a census of extant specs is structurally blind to it.

⇒ the census's real value is the opposite of what it first appeared to be: it proves the **narrow**
guard fires zero times today, so it is signal rather than noise.

---

## .the clamp

`parseRoleBootYaml.test.ts` `[case13]`, five `when`s — **3 negative, 2 positive**:

| | what it holds |
|---|---|
| `[t0]` | the typo refuses in **simple** mode, and the refusal names `key` + `expected` |
| `[t1]` | it refuses in **subject** mode too — the two modes swallowed it by different mechanisms |
| `[t2]` | `budgets:` refuses — the guard is structural, not a typo list |
| 🔴 `[t3]` | a **correct** `budget: { tokens: 5000 }` parses and reaches the spec |
| 🔴 `[t4]` | a foreign `hooks:` key parses and is ignored — **option A's cost, clamped as forbidden** |

**teeth verified**: with the guard reverted, `38 passed, 4 failed` — the four failures are exactly
`[t0]`(×2), `[t1]`, `[t2]`, and both positive controls stayed green.

⇒ `[t3]` and `[t4]` are the two assertions that give the negatives their meaning. without `[t3]`, a
guard that refused **every** top-level `tokens` — the real budget among them — passes all three
negatives and breaks the feature. without `[t4]`, option A passes every test in the file.

---

## 🔴 .the SECOND axis — extended 2026-09-24, at `i024`

the guard above closes the **budget** half and left its twin open, and a peer named the gap:

> a mistyped `subject.*` key is swallowed by the same catchall, and its consequence is worse.

```
subjct.repo:
  briefs:
    say: ['core.md']
```

⇒ the whole section is dropped, the boot reports **exit 0**, and the author believes those briefs
are resident. a swallowed **budget** under-gates a payload that still boots; a swallowed **section**
drops the payload itself.

🔴 **the asymmetry was created by this round.** `[case13]` guarded a MODIFIER and left the PAYLOAD
unguarded, which is the more expensive of the two to lose.

**taken: C again — the same structural test, one axis over.** a top-level key whose value carries
`briefs` or `skills` IS a payload section, however it is spelled:

```ts
if (key === 'briefs' || key === 'skills') continue; // simple mode's own keys
if (key === 'budget') continue;                     // its twin guard owns this one
if (isBootSectionKey(key)) continue;                // a section the render does read
if (!('briefs' in section) && !('skills' in section)) continue;
throw new ConstraintError('boot.yml declares a payload section under a key no mode reads …');
```

the three arguments hold unchanged — A still resurrects `F10`'s unclosable halt beneath the layer
that solved it, B is still a guess about which typos exist, and C's false-positive surface is still
a domain-term collision rather than an accident.

⚠️ **one asymmetry the twin does NOT share**: in simple mode `briefs`/`skills` ARE top-level keys, so
they are excluded by name. without that line every simple-mode spec in the tree would refuse itself —
a failure mode `[case13]` had no analogue of.

### .the clamp — `[case14]`, six `when`s: 4 negative, 3 positive

| | what it holds |
|---|---|
| `[t0]` | `subjct.repo:` refuses, and the refusal names `key` + the shape it wanted |
| `[t1]` | `subject-repo:` refuses too — a separator slip, same branch |
| `[t2]` | the mistyped key ALONE still refuses **by name**, never by collapse to mode `none` |
| 🔴 `[t3]` | correct `always:` + `subject.repo:` parse, both sections survive |
| 🔴 `[t4]` | **simple mode** parses unchanged — the control a naive guard breaks first |
| 🔴 `[t5]` | a foreign `hooks:` key parses and is ignored — option A's cost, clamped as forbidden |

**teeth verified**: with the guard elided, `48 passed, 4 failed` — the four negatives red, all three
positive controls green.

---

## .see also

- `F10` — the ownership fork this one sits beneath; option A would have undone it
- `F5` — the schema-placement fork; this extends its guard from **place** to **name**
- `define.invariant.a-symlink-under-agent-is-foreign` — why a consumer cannot edit a foreign spec
- `review/self/for.5.1.execution.from_vision._.r2.has-pruned-backcompat.md` — the round that raised it
