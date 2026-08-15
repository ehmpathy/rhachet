# define.clone-reach-states

## .what

a clone has exactly one **reach-state** — the single word that answers "can a caller talk to
it, and how?". there are three, and they form a say-ability ladder:

| state | means | `say` | `get` | socket |
|-------|-------|-------|-------|--------|
| **LIVE** | a dispatch socket answers, and a brain-cli is the verified-live peer | ✅ lands | ✅ observes | bound + answers |
| **DEAF** | never had a dispatch socket AND its process is **still alive** — "active but cannot hear you" | ❌ refused (fail loud) | ✅ observe-only (reads the transcript) | none, by design |
| **DEAD** | **finished / gone** — a socket clone whose socket is gone, OR a socketless clone whose process has **exited** | ❌ refused (fail loud) | ✅ if a transcript remains | gone (`ENOENT`) / stale orphan (`ECONNREFUSED`) / socketless + pid dead |

the type is `CloneReachState = 'LIVE' | 'DEAD' | 'DEAF'`
(`src/domain.operations/clone/computeCloneReachState.ts`); it is shared so no caller invents a
fourth.

reach-state is a function of **three facts** — `{ socketEligible, socketLive, processLive }`:

```
socketEligible ? (socketLive ? LIVE : DEAD)
               : (processLive ? DEAF : DEAD)
```

so **DEAF is transient**: a socketless clone reads DEAF only while its recorded process is
alive, and flips to DEAD the moment that process exits. DEAD means *finished / gone* for
**every** clone, not only socket clones. (this corrected the earlier model, which read a
socketless clone as active-but-deaf forever; the wisher, 2026-08-13: "obviously mute clones
should be marked dead once they're done".)

## .the three, precisely

### LIVE

a socket was stood up (the clone is socket-eligible) AND it is connectable now AND — at
dispatch time — a brain-cli is verified the live peer behind it. only a LIVE clone can receive
a `say`. this is the everyday state of an interactive `rhx enroll` on a POSIX host.

### DEAF — "active but cannot hear you"

the clone **never had a dispatch socket** AND its recorded process is **still alive**. it cannot
receive a `say` — it has no channel to hear you on — but it is genuinely active, so `get` still
reads its transcript from disk. DEAF is **observe-only, and transient**: it holds only while the
process lives.

a clone reads DEAF when its socket was not eligible at spawn — any of:

- `--no-socket` (explicit opt-out)
- a brain that is not socket-capable
- a non-POSIX host (the native pty addon cannot allocate a device)
- a **non-interactive / headless** spawn (a plain-pipe cron/supervisor, no tty to mirror)

— **and** its recorded `hostPid` is alive on its own host (probed by `isCloneProcessLive`:
host-match ∧ `process.kill(pid, 0)`). a cross-host socketless clone whose pid cannot be probed
from here reads DEAD, conservatively.

DEAF replaces the earlier names `NOT-REACHABLE` (too broad — a DEAF clone IS reachable for
`get`) and `MUTE` (backwards — mute means can't-SPEAK, but a socketless clone still produces
output; the true property is can't-HEAR). the rename was settled by the wisher (2026-08-13):
"should we call it DEAF instead of MUTE? ... and yeah obvi use DEAF."

### DEAD — "finished / gone"

DEAD is the **terminal** state for every clone, by either path:

- a **socket** clone whose brain-cli has exited — a clean exit unlinks the socket file (a later
  connect gets `ENOENT`); a host crash leaves a stale orphan that refuses connections
  (`ECONNREFUSED`)
- a **socketless** clone whose recorded process has exited (`isCloneProcessLive` → false) — the
  DEAF→DEAD flip the wisher mandated

either way, no live peer answers, so a `say` cannot land. (this is the state `rhx clone prune`
removes, and the state the future `rhx clone wake` revives.)

DEAF = *active but cannot hear you*; DEAD = *finished / gone*. the distinction means a caller
never mistakes "this one is at work but deaf" for "this one is done".

## .why three, not two

the say-side and the observe-side are separable, and the two failure kinds have **different
fixes**:

- DEAF → re-enroll interactively (a socket-capable brain, a POSIX host, no `--no-socket`) to
  make it say-able; or just `get` it while it is active
- DEAD → re-enroll for a fresh clone (or `wake` it, once the clone dream ships); a DEAD clone is
  also what `rhx clone prune` reaps

one word per case lets `list` render the truth and lets a fail-loud `say` name the right fix
(`computeCloneUnreachableHint`).

## .see also

- `define.invariant.clone-socket-brain-cli-only.md` — the security invariant that guards a LIVE
  say (a socket carries input only to a verified brain-cli)
- `domain.terms/term=deaf._.choice._.md` — the DEAF term
- `src/domain.operations/clone/computeCloneReachState.ts` — the 3-fact classifier
- `src/domain.operations/clone/isCloneProcessLive.ts` — the socketless pid-liveness probe (the
  DEAF↔DEAD hinge)
- `src/domain.operations/clone/computeCloneUnreachableHint.ts` — the per-cause fix selector
