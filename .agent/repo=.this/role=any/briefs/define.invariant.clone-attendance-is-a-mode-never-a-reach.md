# define.invariant.clone-attendance-is-a-mode-never-a-reach

## .what

**a tty decides how a clone is WATCHED. it must never decide whether a clone can be REACHED.**

a clone enrolled at a terminal runs **attached** (`--watch`): its output mirrors to that terminal and
the enroller holds it in the foreground. a clone enrolled with no terminal runs **detached**
(`--async`): the caller is handed its address and exits, and the clone outlives it.

both take a pty. both take a socket. both are addressable by `say` and readable by `get`.

### 🔴 a detached clone needs a SECOND PROCESS. a `return` detaches no part of it

the mode is derived in one line; the detach is not. both halves of what a clone needs are **live
libuv handles owned by the enroller**:

| the handle | why the loop stays open |
|---|---|
| the reach socket | `server.listen(socketPath)` — a ref'd server holds the loop until it closes |
| the pty master | an open fd with a live read stream |

so an enroller that merely stops its output and returns **still does not exit** — node keeps the
loop alive for both. and the handles cannot merely be `unref`d: to drop the pty master is to close
it, which hangs up the child. **the clone must be held by SOME process**, so the only honest detach
is to make that process a different one.

⇒ an `--async` enroll therefore **re-execs itself** as a detached host (`genCloneEnrollDetached`),
reads the host's own json handoff off its stdout, reports it, and exits. the host stays and holds the
clone.

⚠️ **a `child.unref()` does NOT cover the stdio pipe.** `unref` on the child frees the PROCESS
handle; each stdio pipe is a separate libuv handle the caller owns, and while one is ref'd the
caller's loop stays open — the exact hang the detach exists to end. the pipe is **`unref`d, never
destroyed**: a `destroy()` closes the read end, and the host's next write takes an EPIPE, which kills
the clone just stood up.

⚠️ **a detached clone's pty mirror has no reader**, so the mirror is DISCARDED rather than written to
a real fd. `get` reads the clone through the screen feed, which taps the same pty data independently;
a sink pointed at an inherited stderr merely floods whoever inherited it.

## .kind

**nature.** you cannot mirror to a terminal that does not exist, and you cannot forward a keystroke
from a keyboard nobody sits at — so the mode is settled by the environment rather than by a
preference. what is *not* settled by nature is reach: a unix socket needs no terminal at all, so any
rule that ties the two was a decision, and a wrong one.

## .invariant

```
attached  ⟺  a tty is present
reach     ⊥  attendance          (reach is INDEPENDENT of attendance)
```

stated as the two the code must satisfy:

- `mode = tty ? 'watch' : 'async'` — derived, never asked for
- `socketEligible = brainCapable ∧ ¬noSocket` — **`attended` is not a term in it**

## .why

the domain depends on it because **a clone that enrolls a peer never has a tty.** that is the whole
machine-handoff path: `--output json` returns an address so a supervisor, a cron, or a peer clone can
`say` to it. tie reach to attendance and that path returns an address which by construction cannot
hear.

### the measured incident — 2026-09-16

one `rhx enroll --roles mechanic --as '@:dogcheck'`, run from inside a clone, produced:

```
😶 clone enrolled — deaf, so it cannot hear a `say`
Error: Input must be provided either through stdin or as a prompt argument when using --print
```

two failures that read as unrelated and are one defect:

```
no tty → attended:false → ¬socketEligible → PLAIN spawn, no pty
       → claude-cli sees a non-tty stdin → auto-enables --print
       → --print with no prompt argument → exit 1
```

⇒ 🔴 **the brain-cli's own tty heuristic is the second half.** we did not pass `--print`; claude
enables it when stdin is not a tty. so the plain-spawn fallback does not merely produce a *deaf*
clone — for this brain it produces **no clone at all**. the pty the socket needs is the same pty that
keeps the child interactive, so one gate governs both.

### the third failure the invariant also closes

even had the socket stood up, the enroll would have hung:

```ts
// invokeEnroll.ts
const code = await result.spawn.waitForExit;
process.exit(code);
```

a claude-cli does not exit. so an enroller with no terminal waits forever on a child nobody watches.

⇒ **the await is correct for `--watch` and wrong for `--async`**, which is why the mode must be a
first-class axis rather than an implicit consequence.

## .scope

what this invariant does **not** cover:

- **it does not claim every enroll deserves a socket.** two axes still gate it, and both are real: a
  brain that cannot carry one (`isBrainSocketCapable`), and an explicit `--no-socket`. the claim is
  narrower — **attendance is not one of the gates**
- **it does not govern the accrual budget.** a detached clone that outlives its enroller is exactly
  the shape that accrues; the live-count warn and the depth budget remain the bound, untouched here
- **it does not make the two modes equal in cost.** an `--async` clone is billed until pruned. the
  invariant says it is *reachable*, never that it is *free*
- **it does not apply to a one-shot pipe.** `rhx enroll claude --print 'hi'` passes a prompt through
  and exits; that is a passthrough, not a clone anyone will address

## .the litigation

two claims were on the table, and they part on ONE question: **is a tty a fact about how a clone is
watched, or a fact about what a clone can do?**

| the claim | its consequence |
|---|---|
| a tty gates the socket | a clone with no terminal is deaf — so the machine-handoff path returns an address that cannot hear |
| a tty gates only the MODE | a clone with no terminal is detached and reachable — so the handoff path works |

the second holds, and the first was refuted by the measured incident above: the deaf clone was not
merely degraded, it was never born (the brain-cli's own `--print` heuristic finished it off).

🔴 **a wider gate is still a gate, and that is the sharp part.** the axis reads `attended` rather than
`interactive` precisely so a clone enrolled BY a clone satisfies it — a real widening, and one that
leaves attendance IN the reach decision. so a residue remains, and it is the case this invariant
closes: **a clone enrolled by a cron, a hook, or a supervisor is attended by no one and must still be
reachable.**

⇒ the residue is the tell. where a gate is made wider rather than moved, the next caller that cannot
satisfy it re-opens the same defect — so the cure is to take attendance OUT of the reach decision.

## .the counter-argument, stated fairly

**"a socket for a clone nobody attends is waste."** it is the argument the original `interactive`
gate rested on, and it is not silly: a pty, an emulator, and a listen socket cost real memory, and a
headless one-shot that exits in seconds pays all three for no benefit.

the answer is that it **misidentifies the wasteful case**. the waste is a clone nobody will ever
*address* — and attendance is a poor proxy for that, because the single most deliberate address-me
caller (a peer clone, a supervisor, a cron) has no tty by construction. the honest gate for waste is
`--no-socket`, which the caller states outright, plus the accrual budget that bounds what survives.

⇒ and the measured cost of the proxy was not a wasted socket. it was an **address that could not
hear**, which is worse than either outcome the argument weighs.

## .what would overturn it

it is **nature**, so the admissible refutation is that the domain was misread:

- show a terminal can be mirrored where none exists, or a keystroke forwarded from a keyboard nobody
  sits at ⇒ the mode derivation is wrong
- show reach genuinely requires a terminal — that a unix socket cannot carry a dispatch into a pty
  without one ⇒ the independence claim is wrong

**not admissible:** *"a detached clone is inconvenient to reason about"*, or *"it costs memory"*. the
first is taste; the second is the counter-argument above, already weighed and answered by
`--no-socket`.

## .enforcement

- `attended` (or any tty read) as a term in the socket-eligibility gate = **blocker**
- an enroll with no tty that spawns without a pty = **blocker** — the brain-cli's own tty heuristic
  turns that into a dead child, not merely a deaf one
- an enroll with no tty that awaits its child's exit = **blocker** — it hangs on a cli that never
  exits
- a detached clone whose reported address is not reachable by `say` = **blocker** — the handoff lies
- an acceptance suite that spawns clones only through a pty harness, and so cannot observe this
  = **blocker** (see below)

### 🔴 the coverage gap that let it ship

the acceptance suite could not have caught this, and the reason is worth the record: the blackbox
harness spawns `rhx enroll` **through a real pty** (`spawnRhachetCliBackground`), because that is what
an attached enroll needs. so every acceptance case ran on the `tty: true` leg, and **the non-tty leg
had no case at all.**

⇒ the suite was not lax. it was *complete over the wrong cube* — one axis it never varied.

the clamp on that row is `enroll.acceptance.test.ts` → `describe('rhx enroll with no tty')`. it
reaches the absent leg through `invokeRhachetCliBinary`, a `spawnSync` with **piped** stdio, so the
child reads `process.stdout.isTTY` as undefined. the instrument already existed and had never been
aimed at this axis.

it is proven to bite: restore a tty read to the socket gate and it goes red on
`socketEligible` — expected `true`, received `false` — never red by absence
(`rule.require.clamp-edge-cases`).

## .see also

- `define.brain-cli-input-states` — what a detached clone's screen must still report
- `define.invariant.clone-socket-brain-cli-only` — the capability axis that legitimately remains
- `define.clone-reach-states` — the states a reach read reports
- `rule.require.clamp-edge-cases` — why the `tty: false` row owes a test proven red
