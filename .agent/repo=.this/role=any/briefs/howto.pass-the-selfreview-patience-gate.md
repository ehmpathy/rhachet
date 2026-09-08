# howto: pass the self-review patience gate

## .what

`rhx route.stone.set --as promised --that <slug>` can be refused with:

```
🗿 patience, friend
   ├─ the pond barely rippled
```

**this is a TIME gate, not a content gate.** the guard measures the wall-clock elapsed
since your review report's mtime. under the threshold, it refuses the promise no matter
how good the review is.

## .why this brief exists

the failure presents as a **quality** judgment — *"the pond barely rippled"*, *"you are
not the author, you are the reviewer"*, *"when you cannot articulate either, you have not
reviewed"*. every word of that reads as *your review was too shallow*.

so the natural response is to review harder: rewrite the report, hunt for more issues, fix
more code. that is what i did — three times, across two rounds — and it failed identically
each time, because on **those attempts** the depth was already sufficient and the clock was
the only unmet condition.

> 🚨 **this brief does NOT say review depth is optional.** it says the 30s check cannot
> measure depth, so a refusal under 30s tells you naught about your review's quality.
> depth is a separate, non-negotiable requirement, and
> `rule.always.trust-the-self-review-process` governs it — read the boundary below before
> you take this brief as permission to wait out a shallow pass.

> ⚠️ **an unbounded retry loop here is expensive.** each attempt costs a full re-read, a
> rewrite, and often real code changes made to "make the pond ripple". the loop does not
> converge, because the condition it fails on is not the one it names.

## .the mechanism

`getSelfReviewChallengeDecision` (in `rhachet-roles-bhrain`) compares the elapsed time
against a threshold:

```ts
const elapsed = Date.now() - report.sinceMtime.getTime();
if (elapsed < threshold) {
  return { decision: isRush ? 'challenge:rushed' : 'challenge:first' };
}
```

- the threshold is **30 seconds** — its own test names the two cases as
  *"elapsed < 30 seconds"* → challenge, and *"elapsed >= 30 seconds"* → allowed
- `challenge:first` renders **`🗿 patience, friend` / "the pond barely rippled"**
- `challenge:rushed` renders **"what is the rush?"** — a re-attempt that is still too fast
- upstream's own acceptance test names the case verbatim: *"usecase.3: promise too quickly
  blocked"*

**each refusal restarts the clock.** so a fast retry loop can never satisfy it.

## .how to pass it

1. **re-read the path from the LATEST refusal** — the `rN` level moves (see below)
2. write the review report to that **exact** path
3. **let ≥30s of wall clock pass**
4. then run the `--as promised --that <slug>` command

the cheapest way to spend that window is real work — read the next artifact, run the
suite, repair an issue you found. an immediate retry is the one move guaranteed to fail.

## ⚠️ .a refusal can BUMP the level — so the path you were given goes stale

the two failure modes compose, and that is what makes this expensive.

observed on this route: the guard printed `…_.r2.has-consistent-mechanisms.md`, the report
was written there, the promise was refused for **time** — and the refusal's own output then
printed `…_.r3.…`. the level had advanced.

so a report written to a path the guard handed you five minutes ago can be at the wrong
level by the time you promise. the sequence that traps you:

1. guard prints `rN` → you write to `rN`
2. you promise too fast → refused for **time**, and the level moves to `rN+1`
3. you wait 30s and retry → still refused, now for **path** (no report at `rN+1`)
4. the message reads the same both times, so the second cause stays invisible

**the fix is one habit: re-read the `articulate into` line from the MOST RECENT refusal,
every time, and move the file if the level changed.** `rhx mvsafe` is enough.

### the two banners tell you which cause is live

| the level in the new refusal | banner | what it means |
|------------------------------|--------|---------------|
| **moved** (`rN` → `rN+1`) | `🗿 patience, friend` alone | the guard read your report; move the file, then wait |
| **held** | `🍂 what is the rush?` **above** `🗿 patience, friend` | the path is right; it is purely the clock now |

so the `🍂` banner is the good news: it means the path question is settled and only wall
clock stands between you and the promise. spend it on real work and try once more.

## .the tell — how to know it is THIS and not a shallow review

| symptom | verdict |
|---------|---------|
| the exact same output on every attempt, byte for byte | ⏱️ the time gate |
| it asks for the same `rN` level each time | ⏱️ the time gate |
| you changed real code between attempts and it still refuses | ⏱️ the time gate |
| **the `rN` in the printed path differs from the one you wrote to** | 📄 a stale level — `mvsafe` the file, then wait |
| the message says *"articulation is absent"* | 📄 a wrong path — see the level pitfall |

> ⚠️ **check the path first, the clock second.** the level check is a one-line diff you can
> do at a glance; the clock costs 30s to test. and a stale level renders the SAME
> *"pond barely rippled"* text, so the message will not tell you which one bit.

> the guard reads its own path, not yours. an **absent** articulation is a path defect
> (`rN` level); a **rippled pond** is a clock defect.

## 🚨 .the boundary — this brief and `trust-the-self-review-process` govern DIFFERENT conditions

read alone, the two briefs look like they disagree:

| brief | says |
|-------|------|
| this one | *"the 30s check is a TIME gate; a refusal under 30s says naught about your depth"* |
| `rule.always.trust-the-self-review-process` | *"each bounce is the guard's signal that the pass was too shallow — go find a real new issue"* |

**they are both true, of separate conditions.** passage needs all three, and only one of
them is a clock:

| condition | measured by | what a failure looks like |
|-----------|-------------|---------------------------|
| the articulation exists, at the guard's own `rN` path | a file read | *"articulation is absent"* |
| ≥30s of wall clock since the report's mtime | `Date.now() - mtime` | 🗿 *"the pond barely rippled"* |
| the review is genuinely deep | **a human, and you** | never surfaced by the guard at all |

so the third condition has **no automated check**, which is precisely why the rule states it
as a discipline rather than a gate. the two briefs do not conflict; they cover the second and
third rows.

### the two failure modes this boundary prevents

- **read only this brief** → you wait out a shallow pass, satisfy the clock, and ship a
  review that read no artifact. the guard lets you through and the rule is broken silently
- **read only the rule** → you rewrite a sound review three times over a clock you cannot
  see, which is the loop this brief was written from

> **the honest heuristic:** ask *"did i learn a fact this pass?"* if yes, the depth
> condition is met and the clock is what remains — spend it on real work. if no, the clock
> is not your problem, and no amount of wait will make the pass a review.

## .the honest caveat

the gate is not arbitrary, and the intent is sound: it exists because a promise issued
seconds after the prompt cannot have involved a real read. the defect is only that its
**report names the wrong cause** — it describes the symptom it infers (a shallow review)
rather than the condition it actually measured (elapsed < 30s).

per `rule.require.errors-name-the-fix`, a report that names a cause the reader cannot act
on sends them in a loop. **that is the same defect class as the `pnpm rebuild node-pty`
hint** this repo's node-pty wish exists to retire: confident, plausible, and pointed away
from the real fix.

worth a feedback upstream to `rhachet-roles-bhrain`: the challenge could name the wait.

## .see also

- `rule.always.trust-the-self-review-process` — the DEPTH condition; read with this brief,
  never instead of it (see "the boundary" above)
- `howto.run-self-reviews` (bhrain/driver) — covers the `rN` level pitfall, not this gate
- `rule.require.errors-name-the-fix` (ergonomist) — why the current phrasing costs a loop
- `rule.require.solve-at-cause` (architect) — diagnose before you react

## .mantra

> the pond does not want a bigger stone. it wants you to sit with it. 🍵
