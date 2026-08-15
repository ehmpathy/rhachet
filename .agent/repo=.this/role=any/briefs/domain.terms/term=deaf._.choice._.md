# domain.term: deaf

term.chosen   = deaf
term.kind     = adj             # a clone reach-state: [...noun][state]?
term.synonyms.forbidden:
- mute
- not-reachable
- unreachable
- socketless
- silent
- offline

## .what

a **deaf** clone is one that **never had a dispatch socket** AND whose process is **still
alive**, so it cannot hear a `say` — it is input-deaf by construction, yet genuinely active. it
is still observable: `get` reads its transcript from disk (not the socket), so a deaf clone is
**observe-only**. deaf means *active but cannot hear you*.

a clone reads deaf when its socket was not eligible at spawn — `--no-socket`, a non-socket-capable
brain, a non-POSIX host, or a **non-interactive / headless** spawn (a plain-pipe cron/supervisor
with no tty to mirror) — **and** its recorded pid is alive on its own host. the wisher put it
(2026-08-13): "we should treat 'noninteractive' clones as 'deaf' clones, in that they cant hear
you."

crucially, **deaf is transient**: once a deaf clone's process exits, it flips to `dead` — the
wisher (2026-08-13): "obviously mute clones should be marked dead once they're done". so deaf is
not a permanent label but a live-only verdict; `getCloneReachState` probes the pid
(`isCloneProcessLive`) to decide deaf-vs-dead each time.

`deaf` is one of the three clone REACH-STATES (`CloneReachState = 'LIVE' | 'DEAD' | 'DEAF'`) and
the paired REACH-CAUSE in `computeCloneUnreachableHint` (`DEAF / DEAD-same-host /
DEAD-cross-host / exited-mid-dispatch / wedged`). a `say` to a deaf clone fails loud with a hint
that names the fix (observe with `get`, or re-enroll interactively) — never a silent drop.

distinct from `dead`: a DEAF clone is socketless AND active; a DEAD clone is *finished / gone* by
either path — a socket clone whose brain-cli exited (socket gone or a stale orphan that refuses),
OR a socketless clone whose process has exited. deaf = *active but cannot hear you*, dead =
*finished / gone* — two states, two fixes, two words.

## .refs

where the term is declared / used:
- src/domain.operations/clone/computeCloneReachState.ts                (the `DEAF` reach-state value + classifier)
- src/domain.operations/clone/computeCloneUnreachableHint.ts           (`cause: 'DEAF'` → the hint that names the fix)
- src/domain.operations/clone/asCloneReachError.ts                     (maps reachState `DEAF` → cause `DEAF`)
- src/domain.operations/clone/cli/asCloneListView.ts                   (the `state=DEAF` render + the legend)
- src/contract/cli/asCliErrorJson.ts                                   (the reachState field a machine reads)

## .reason

see the ref-level cluster beside this choice:
- `term=deaf._.choice.reason.md` — etymology, why deaf-not-mute, the deaf-vs-dead split
