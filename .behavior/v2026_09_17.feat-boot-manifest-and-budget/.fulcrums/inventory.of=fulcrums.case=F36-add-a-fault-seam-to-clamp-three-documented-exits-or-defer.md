# F36 — add a fault seam to clamp three documented exits, or defer?

- **rework** = clean
- **status** = 🔴 **NARROWED 2026-09-24** — 1 of 3 repaired + clamped portably; 2 still deferred
- **confidence** = 85% on the two still deferred (the third is closed, not judged)
- **where** = `.agent/repo=.this/role=any/skills/calc.tokens.sh` (exits 1, 2) ·
  `.agent/repo=.this/role=any/skills/get.package.format.sh` (exit 1)
- **raised** = 2026-09-23, at `5.1.execution.from_vision` i016
  (`ergo-friction-hazards` nitpicks 1–2)

---

## .the fork

a lane read both measurement skills' `--help` against their acceptance suites and found the same
hole twice: **three documented exits have no snapshot.** each is named in the docblock's `guarantee`
block **and** in the `show_help` render — stated twice, verified nowhere.

🔴 **this is arrears against a declared rule, not a discretionary polish.**
`rule.require.contract-snapshot-exhaustiveness` (behaver) demands *"every output variant a caller can
encounter (positive, negative, edge) must be snapshotted."*

⇒ and the concern is **not** that a clamp is absent. it is that **every cheap clamp is a clamp with
no teeth** — the bar `rule.require.clamp-edge-cases` sets is a test that goes **red** under the
un-fixed defect, and all three candidates fail it:

| # | the exit | the cheap fixture | why it does not bite |
|---|---|---|---|
| 1 | `calc.tokens` **2** — a file vanished between glob and read | remove the file mid-run | 🔴 **a race is not a fixture.** the window is not statically constructible |
| 2 | `calc.tokens` **1** — a file that cannot be read | `chmod 000` | 🔴 **not portable.** CI often runs as root, where the read SUCCEEDS ⇒ green exactly where it matters |
| 3 | `get.package.format` **1** — the probe could not run | a package whose `require()` faults | every cheap candidate lands on exit **0** (it loads) or **2** (not installed) |

| option | what it costs |
|---|---|
| **A** — land an env-gated fault seam now (`CALC_TOKENS_FAULT`, `GET_PACKAGE_FORMAT_FAULT`), then one snapped case per exit | 🔴 **a second code path inside a production skill**, which `rule.prefer.fewer-paths-via-idempotency` pushes against — added to close a test gap rather than to serve a caller |
| 🔴 **B** — defer, dream it, record the call | three documented exits stay unenforced; the help's phrase can change and no clamp reddens |
| **C** — delete the three clauses from `--help` | 🟡 cheapest, and **it lies less than A and more than B**: the exits still happen, and a caller who meets one now finds it undocumented |

---

## .taken, and why

**taken: B — defer, with the dream that carries the seam, the alternative, and the sequence.**

1. **SAFE ✅ / CLEAN 🔴** (`rule.always.fix-forward-under-scouts-honor`). the skills are shell and the
   repair is not risky — what is un-clean is that a correct clamp needs a **seam none of the three
   has**, so the work is a production-path change rather than a test addition.
2. 🔴 **the seam is genuinely debatable, and a fulcrum is where a debatable call belongs.** an
   env-gated fault path is a branch that exists only for a test to drive. the counter is real — the
   three faults are un-manufacturable from outside, and an unenforced contract clause is the larger
   defect — and **that trade deserves a deliberate weigh rather than a ride-along**.
3. **both lanes graded it `[nitpick][better]`**, and neither named a shipped harm. per
   `define.invariant.review.peer.budget.urgent-earns-budget` a `better` concern earns the floor and
   never more than it.

🟡 **and the counter-pressure is stated rather than buried: option C is cheaper than either, and it
was NOT taken.** to strike the three clauses would close the gap today at the cost of a caller who
meets an exit with no documentation for it. ⇒ the deferral therefore keeps a **known-unenforced
promise** alive, which is the part of this row a council should push on.

---

## 🟡 .the residual 15% — an unenforced promise is the defect this row leaves open

the dream's own step 3 states the bound plainly:

> if the seam does not land: **correct the help** at all three sites rather than leave a contract
> clause with no enforcement behind it — **an unenforced promise is worse than an absent one**

⇒ so the deferral is coherent **only while the seam is still on the table**. the moment option A is
refused outright, option C becomes owed — and this row does not decide that, which is exactly the
15%.

---

## .what would flip it

- **a caller who meets one of the three exits and reports the render is wrong.** that converts the
  gap from arrears to a live defect, and the clamp becomes urgent rather than better
- 🟡 **a portable fixture for any one of the three.** the bar that defers this is *"a clamp with no
  teeth"*; a fixture that bites removes the reason for the seam at that site, and the row narrows
- **a scope grant.** the skills are this behavior's own artifacts, so a wisher who widens the round
  retires this without new evidence

---

## 🔴 .the premise WEAKENED in-stone — a peer's "un-constructible" verdict fell to a re-probe

**2026-09-23, same stone.** the peer dream this row cites deferred on the identical bar, and while it
sat a **different errno at the same call** was found statically constructible: `readdirSync` raises
`ENOTDIR` when its argument is a file, which a `writeFileSync` manufactures in one line. it is now
repaired and clamped at three rows, teeth proven by revert.

⇒ **that does NOT flip this row.** it is a fixture at a peer site, and the three exits here are
untouched by it. what it does is weaken the premise both deferrals rest on:

| the premise as stated | what the peer showed |
|---|---|
| *"no cheap fixture reaches this fault"* | 🔴 the search was **per-errno**, not per-call. the peer's table probed one errno and read as a verdict on the whole arm |

🟡 **so the honest grade of this row's table is narrower than it looks.** it enumerates three exits
and one candidate fixture each — which establishes that *those* candidates fail, never that the call
sites have been surveyed. a survey would ask, per site, **what else can this raise**, and neither
table did.

⚠️ **it stays at 85% rather than drops**, and the reason is specific: the peer's `ENOTDIR` had a
second property these three lack — it is reachable from **caller-controlled input** (a role dir with
a file where a dir belongs). the three here are a mid-run race, a permission mode, and a faulted
`require()`, and none of those is a value a caller supplies. ⇒ **the search was incomplete AND the
target is genuinely harder**; the peer refutes the first half and not the second.

---

## 🔴 .NARROWED 2026-09-24 — one of the three was never a fixture problem at all

**status: 2 of 3 still deferred.** the third is **repaired and clamped portably**, and the reason it
resisted is not the one this row recorded.

a peer re-raised it at `i024`, and the re-probe asked the question the table above never did —
**not** *what fixture could drive exit 1* but *what in this file can raise it*:

```
$ rhx grepsafe --pattern 'process.exit|probe.error|JSON.parse' \
    --path '.agent/repo=.this/role=any/skills/get.package.format.ts'
  55: process.exit(2);
  84: const manifest = JSON.parse(manifestRaw) as { … };
```

🔴 **the file had no path to exit 1 at all.** row 3's *"every cheap candidate lands on exit 0 or 2"*
was a true observation of a **structural** fact read as a fixture fact: the branch was **absent**, so
no fixture could have reached it.

### the two defects the re-probe found

| # | the defect | grade |
|---|---|---|
| 1 | 🔴 **`probe.error` is never read.** `spawnSync` sets it when the spawn cannot LAUNCH — and the reader went straight to `.stdout`, which is `null` there. ⇒ a probe that **could not run** rendered as `require(): 🔴 refuses` with an empty cause line, at **exit 0** | **failhide** — the file reported a measurement it never took |
| 2 | **`JSON.parse` was unguarded.** a malformed `package.json` inside `node_modules` exited 1 with a raw node stack — no class, no path, no fix | `rule.require.unabridged-error-prefix` |

⇒ defect 1 is the docblock's **own** stated cause for exit 1, unconsulted. defect 2 is the only route
to 1 that existed, and it was the undocumented one.

### the repair, and the portable fixture

a `halt()` (MalfunctionError, exit 1) beside the extant `belay()`, reached from both sites. the
clamp is `get.package.format.acceptance` `[case8]`: a temp cwd with a malformed
`node_modules/broken-manifest/package.json`.

🔴 **it needs no `chmod` and no race** — which is exactly what this row's *"what would flip it"* row 2
asked for, and what parts it from the two exits still deferred (`calc.tokens` 1 and 2).

### 🔴 the teeth, and what they taught

with the guard stripped: **2 failed, 2 passed**. the two that **stayed green** are the lesson —

| assertion | under the revert |
|---|---|
| `expect(result.status).toEqual(1)` | 🔴 **green** — a raw `SyntaxError` exits 1 too |
| `expect(stderr).toContain('MalfunctionError')` | ✅ red |
| `expect(stderr).toContain('fix:')` | ✅ red |

⇒ **the exit code alone could not part a guarded refusal from an unguarded crash.** a clamp that
asserted only `status === 1` would have passed on the defect it exists to catch — the `no teeth`
shape this whole row was deferred on, reproduced inside the clamp that closes it.

### 🔴 what the two still-deferred exits inherit

the argument for B above is **weakened rather than void**. what stands: the two `calc.tokens` exits
are a mid-run race and a permission mode, and neither is caller-controlled input. what falls: the
premise that a per-candidate table establishes un-constructibility.

⇒ **both residual sites owe a per-call-site survey before the next deferral**, on the same question
this one answered: *what in this file can raise it*.

---

## 🔴 .NARROWED 2026-09-29 — row 2's portability premise was false; exit 1 is clamped

**status: 1 of 3 still deferred** — the `calc.tokens` exit-2 vanish race.

row 2 deferred `chmod 000` on *"CI often runs as root."* a read of `.github/workflows/.test.yml`
refutes it for this repo: every job is `runs-on: ubuntu-24.04` with no `container:`, so the suite
runs as the non-root `runner` user, where a mode-000 read raises `EACCES`.

the clamp is `calc.tokens.acceptance` `[case7]`: a `genTempDir` with `locked.md` at mode 000,
asserted on exit 1, a `💥 MalfunctionError` header, and a snapshot of `errno: EACCES`. under root
it throws a `ConstraintError` before the fixture, so it fails loud rather than go green.

⇒ the one exit left is the mid-run vanish (`ENOENT` between glob and read). a per-call-site survey
of `getOneFileContent` found no caller-controlled input that reaches it: an orphan symlink is
dropped by `onlyFiles` at the glob (measured — the case returned *"no files matched"*), so only a
concurrent delete remains, and that is a race, not a fixture.

---

## .see also

- `.dream/2026_09_23.three-documented-exits-have-no-pinned-render.md` — the seam, the per-site
  reason each cheap fixture fails, and the order to take it up in
- `.dream/2026_09_23.the-walk-refuses-a-vanish-at-its-entries-and-swallows-one-at-its-root.md` — the
  peer deferred on the identical *"a race is not a fixture"* bar
- `rule.require.clamp-edge-cases` (mechanic) — the bar that defers it
- `rule.require.contract-snapshot-exhaustiveness` (behaver) — the rule this is arrears against
- `rule.prefer.fewer-paths-via-idempotency` (architect) — the rule option A pushes against

---

## .the verdict, once ruled — (open; taken as **B** for this stone)

🟡 `open` carries the set's one sense: **open to the council's reversal**, never *nobody decided*.
