# fulcrum F7 — the hint stays inline in the sentence, so the local path renders it twice

- **caught** 2026-09-03, i045, immediately after the `[case2b]` resnap exposed the duplication
- **rework** 🔴 **dirty** · **confidence** 84% · **status** taken, deferred
- **where** `src/domain.operations/upgrade/asNpmInstallFailureError.ts` (the four sentences) +
  `src/domain.operations/upgrade/execUpgrade.ts`'s `asUpgradeFailureMessage`

## .the fork, stated fairly

the r011 cure extracted `asCliErrorFrame` as the one owner of what a human reads off a cli error,
and rewired **two** of the three renderers to it. the third — `asUpgradeFailureMessage` — still does
`error.redact(['metadata']).message`, and it was left alone.

that leaves the two upgrade paths at odds about where the hint lives:

| path | how it ends | renderer | reads `metadata.hint`? | the inline copy is |
|------|-------------|----------|------------------------|--------------------|
| **global** | `execUpgrade` catches, warns, and **continues** — the error never leaves | `asUpgradeFailureMessage` | ❌ no | **the only copy** |
| **local** | the throw reaches `invoke.ts`'s top-level catch | `asCliErrorFrame` | ✅ yes | a **duplicate** on screen |

so a human on the local path now reads, verbatim:

```
✋ pnpm install failed with exit code 1 — a requested package does not exist. check how
   rhachet-roles--ghostrole is spelt — the registry has no such package.
   └─ check how rhachet-roles--ghostrole is spelt — the registry has no such package
```

the same sentence twice. that is `rule.forbid.rambles`' restatement smell, on the one surface this
whole branch exists to make legible.

| the option | what it costs |
|------------|---------------|
| **conform now** — make `asUpgradeFailureMessage` read the hint by name, then drop the inline copy from all four sentences | ripples into 19 files: 5 test files whose assertions read the redacted sentence, 2 snapshot files, plus the global-upgrade frames |
| **leave the inline copy, record the fork** ← taken | one path renders the fix twice |

## .taken, and why AT THE TIME

three reasons, in the order they carry weight:

1. 🚨 **the inline copy is not decoration — it is the global path's ONLY hint.** to drop it before
   `asUpgradeFailureMessage` learns to read `metadata.hint` would delete the fix from the global
   upgrade outright. **that is the exact regression the frame was extracted to retire**, and it
   would be a fresh instance of it, produced by the cure for it. so the two halves cannot be
   reordered: the renderer must learn the field before the sentence may forget it.

2. **the rework is dirty, and the rule says a dirty rework is deferred and named, never smuggled.**
   19 files, of which 5 are clamps whose assertions deliberately read the *redacted* sentence
   precisely because that is what a console shows. each would need its expectation re-derived, at an
   arrival, in a change about node-pty. `rule.require.review-test-changes` is against exactly that.

3. **the duplication is a legibility nitpick; the alternative risks a correctness blocker.** a fix
   stated twice is worse prose. a fix stated zero times on the global path is
   `rule.require.errors-name-the-fix` inverted. the asymmetry decides it.

## 🚨 .why the rework is DIRTY — and this is the first dirty row on this drive

every prior fulcrum here was clean. this one is not, and the reason deserves a precise statement:
**the sentence is load-bearing for five clamps that assert against it by design.**

`asNpmInstallFailureError.test.ts` states its own reason at the top: *"an assertion on the
un-redacted message tests a string no console ever shows."* so those clamps read
`error.redact(['metadata']).message` **on purpose** — they are hardened against the current sentence
shape, which is precisely what `dirty` names.

⇒ it is deferred rather than escalated because a dirty rework is **not** automatically a halt. per
`rule.always.defer-fulcrums-to-last`, a halt needs all three: no defensible guess, a dirty rework,
**and** every other question already addressed. the first fails — the guess here is defensible and
stated above.

## .why the confidence is 84%

the direction is near-certain: the third renderer should read the hint by name, and the inline copy
should then go. `rule.prefer.wet-over-dry`'s rule of three is already met — three renderers existed,
which is what triggered the extraction in the first place — so a third caller of the shared owner is
the obvious close.

what the 16% holds is **whether `asUpgradeFailureMessage` should call `asCliErrorFrame` at all.**
its output is a `notice` (`term=notice`) — a render a *successful* command leaves behind, since the
global branch warns and continues with exit 0 — not a `blocked` report. those are different domain
objects, and the frame's `✋`/`💥` glyph names a party for a failure that did not stop the command.
so the right shape may be a **peer** transformer that shares the read-by-name decision but not the
frame.

⇒ that is a real design question, and it is the reason this is a fulcrum rather than a chore.

## .the trigger that closes it

**the next change that touches `asNpmInstallFailureError`'s sentences for any other reason.** at
that point the clamps are already open and the marginal cost of the conform collapses.

⚠️ **and the anti-trigger, stated so it is not mistaken for one:** a later reviewer who notices the
duplication again is not a trigger. it is the same find, and its answer is this entry.

## .the verdict

✅ **REVERSED and CLOSED at i046.** the deferral above is undone; the conform shipped in this round.

each line above this one is the fork **as it stood at i045**, left untouched on purpose — an entry
edited to agree with its own outcome records no judgment at all.

### what moved it

**two peer lanes converged on it independently, from opposite directions** — r011 from architecture
(*"a third hand-rolled error-render path that `asCliErrorFrame` was extracted specifically to
retire"*) and r010 from ergonomics, which graded it a **blocker** and named the exact property the
deferral had lost: *"the acceptance suite currently treats this restatement smell as correct
behavior."*

one lane is a report. two lanes, on a defect **this drive introduced** — `asNpmInstallFailureError`
and `asCliErrorFrame` are both new files in this diff — is not debt to defer. the
*"do not smuggle an unrelated fix"* bound never applied, because the defect is not unrelated.

### 🚨 the estimate under the deferral was wrong, and it was MINE

the entry above says *"ripples into 19 files"* and repeats it three times. **measured: the real seam
is one test helper** — `asNpmInstallFailureError.test.ts`'s `asSentence`, whose own docblock already
claimed to be *"literally the line a human reads."* redefine it to compose the two fields and every
extant assertion stays valid. **211 upgrade tests passed first try.**

⇒ **a deferral is only as good as the cost estimate under it, and this one was never re-measured
across four rounds.** the estimate is the whole reason the row kept its `dirty` grade — and `dirty`
is the grade that made the deferral defensible under `rule.always.defer-fulcrums-to-last`. so the
rework was **clean** all along, and the row should never have carried the drive's only dirty grade.

### ⚠️ the anti-trigger clause was wrong too

it reads: *"a later reviewer who notices the duplication again is not a trigger. it is the same find,
and its answer is this entry."*

**two reviewers did notice, one graded it a blocker, and the l3 judge blocks on blockers.** the
clause was sound only under the cost estimate above it — it inherited that error rather than guarded
against it. an anti-trigger that rests on an unmeasured cost is an anti-trigger that expires
silently.

### the shape, and the 16% it resolves

the open design question was *"should `asUpgradeFailureMessage` call `asCliErrorFrame` at all?"* —
resolved as the entry predicted: **no.** a `notice` and a `blocked` report are different domain
objects, so the global path keeps its own header and composes `metadata.hint` by name itself. the
frame's `✋`/`💥` glyph never enters the notice path. the global path's rendered line is
**byte-identical to before**.

the clamp is r010's own recommendation, made shippable — a red test cannot ship, so the assertion
landed **beside** the cure rather than instead of it:

```ts
expect(frame.split(hint).length - 1).toEqual(1);
```

dogfooded by a re-inline of the `package-absent` hint: `Expected: 1, Received: 2`. restored → green.

⇒ the record of the repair is the pair of `.taken` files at `.reviews/peer/…i046….r010…` and its
`r011` peer; the caught dream `.dream/2026_09_03.cli-error-hint-read-by-name-everywhere.dream.md` is
marked realized in place.
