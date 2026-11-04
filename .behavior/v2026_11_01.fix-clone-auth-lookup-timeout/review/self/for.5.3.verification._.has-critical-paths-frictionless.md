# self review — 5.3.verification — has-critical-paths-frictionless

no repros artifact is declared, so the critical paths come from the wish and the vision's critipath
cells: **case=1** (same-user say on a loaded box), **case=4** (same-user say on a quiet box, held
unchanged), **case=2** (another user's say, still denied). each walk below is a real `rhx clone say`
against a real enrolled clone, run by the acceptance harness; the outputs are pasted from the run logs
and the snapshots those same runs wrote (masked only for serial, date, and temp dir).

## case=1 — same-user say on a loaded box (`ss -xp` takes 7s)

```
$ rhx clone say @:slowbox --what 'poke slowbox-x1'
😶🎙️ said to @:slowbox
   └─ 🟡 screen probe unanswered (a loaded box) — verified by transcript; no action needed
> exit 0

  ✓ then: the say returns (13696 ms)
  ✓ then: it exits 0 — the say landed, never refused as auth-denied (8 ms)
```
(`.log/role=mechanic/skill=git.repo.test/what=acceptance/2026-11-01T23-59-59Z.stderr.log`)

and the same box when the clone is busy (no transcript rise):

```
$ rhx clone say @:slowbusy --what 'hold-me-slowbox'

💥 MalfunctionError: the clone did not answer its screen probe in time (a loaded box: its auth check is slow) and the transcript did not rise within the bound

{
  "hint": "do NOT blind re-send — the message reached the pty and may have landed (a re-send would double it). wait for the box to calm, then read the clone with `clone get`; a `get` that times out too means the box is still loaded. a re-enroll does not help",
  "delivered": true,
  "verdict": "unreadable",
  "reason": "probe-unanswered",
  "probe": "unsupported",
  "serial": "__SERIAL__",
  "slug": "slowbusy",
  "debugLog": "/TMP_TEST_DIR/.agent/.cache/repo=rhachet/skill=clone-say/debug.__DATE__.log"
}
> exit 1

  ✓ then: the say returns (29958 ms)
```
(the message line re-captured after the ergonomics review tightened it to its peers' form —
`.log/role=mechanic/skill=git.repo.test/what=acceptance/2026-11-02T00-24-12Z.stderr.log`)

| def.frictionless | score |
|---|---|
| no surprises | ✓ — the human is the clone's user and the say lands; before this PR the same walk said "you are not the same unix user" |
| no unexpected error, stack trace, or stall | ✓ — no stack trace; the busy branch is a classed malfunction with exit 1, by design |
| no undiscoverable step | ✓ — the busy branch names the next move (wait, then `clone get`) and its dead end (a `get` that times out) |
| 🟡 visible status throughout | ✗ — 13.7s of silence before `said to` (29s on the busy branch). see below |
| defaults match the common case | ✓ — no flag; the bare `clone say` does the work on a loaded box |
| failures loud and legible | ✓ — names the cause (a loaded box), the state (`delivered: true`), and the fix; forbids the one move that harms (a blind re-send) |

### the friction found — the silent wait

the paste shows it: no output for 13.7s. I weighed the fix now:

- it predates this PR. a say on a slow box always waited silently, up to its 30s window; the old
  bounds cut it at ~5s with a false refusal. this PR turns a fast wrong answer into a slower right one
- the fix is a cli output contract: which stream, after what threshold, a line or a tty spinner. it
  moves stderr snapshots across the clone-say suites (the busy-branch snapshot above is a stderr snap)
- so it fails CLEAN (`rule.always.fix-forward-under-scouts-honor`): it ripples into contracts and
  files beyond this fix. it ships as its own PR, #688, filed with the measured cost. fulcrum F12 now
  records the 13.7s figure and the reason (amended this round)

## case=4 — same-user say on a quiet box (held unchanged)

walked under this PR's build, in the same acceptance run:

```
$ rhx clone say … --await release      (an idle brain)
  ✓ then: an explicit --await release lands on an idle brain (3751 ms)
  ✓ then: it exits 0 and reports released — the strongest verdict, not merely enqueued (18 ms)

$ rhx clone say …                      (the plain success path)
  ✓ then: the say succeeds (1975 ms)
```
(`.log/role=mechanic/skill=git.repo.test/what=acceptance/2026-11-01T23-34-50Z.stderr.log`, lines 70–71, 109)

| def.frictionless | score |
|---|---|
| no surprises | ✓ — same tree as before; the snapshots in the extant suites did not move |
| no unexpected error, stack trace, or stall | ✓ |
| no undiscoverable step | ✓ |
| visible status throughout | ✓ — 2–4s, inside the say's normal observe |
| defaults match the common case | ✓ |
| failures loud and legible | ✓ — unchanged copy |

the quiet path pays the scan once per connection, as before; the bound only matters past 5s.

## case=2 — another user's say, still denied

no second unix user exists on this box, so the walk runs at the server grain with the real gate and
a real `ss` whose table says every process is pid 1 (`[case21]`) or that the caller is unseen
(`[case20]`). the copy the human reads, as the cli prints it:

```
💥 MalfunctionError: clone refused the message: the caller is not the same unix user as the clone — a clone socket accepts only its own user; run the say as the user that enrolled the clone
```

| def.frictionless | score |
|---|---|
| no surprises | ✓ for another user — refused, with zero bytes typed into the clone |
| no unexpected error, stack trace, or stall | ✓ |
| no undiscoverable step | ✓ — names the fix (run as the clone's user) |
| visible status throughout | ✓ — the deny lands as soon as the scan settles |
| defaults match the common case | ✓ |
| failures loud and legible | ✓ for a true other user; for a same-user caller `ss` cannot attribute, this hint is false — F13 chose fail-closed, and the truthful reason is #683 |

## found and fixed

1. **F12 was stale** — it still claimed "this PR changes no cli render" and "no cli acceptance case",
   both false since i007. amended with a verdict: the acceptance half reversed, the wait-signal half
   holds with its measured cost (13.7s) and its PR (#688)

## held, with reason

1. **the silent wait on a loaded box** — real friction, scored ✗ above. it predates this PR and its
   cure is an output contract across the clone-say suites, so it ships as its own PR (#688)
