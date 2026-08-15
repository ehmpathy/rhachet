# domain.term.choice.reason: deaf

## .etymology

why `deaf`: the clone domain describes reach as a conversation — you `say` to a clone, you `get`
its replies. a clone with no dispatch socket can still be observed (`get`) but cannot receive a
`say`: it **cannot hear you**. `deaf` names exactly that — a participant present in the
conversation but unable to receive input. deafness is the inability to HEAR (to take input); that
is precisely the property, because a socketless clone still SPEAKS (its transcript is readable via
`get`) — only its ear (the `say` channel) is absent. `deaf` composes into the reach-state ladder
LIVE | DEAF | DEAD as one crisp word.

chosen over `mute`, its runner-up. `mute` names the inability to SPEAK (to produce output) — the
exact OPPOSITE of the real property: a socketless clone is not silent, it still appends to its
transcript and `get` reads it. to call it `mute` would say "it cannot talk" when in truth it
cannot LISTEN. `deaf` is the accurate half of the deaf/mute pair.

rejected alternatives:
- **mute** — the runner-up, and the term first shipped; names can't-SPEAK, which is backwards (a
  socketless clone still produces observable output via `get`). the accurate property is
  can't-HEAR = `deaf`. recorded as a forbidden synonym; the dispute below settled the swap.
- **not-reachable** — overstates the fault (implies `get` fails too); a socketless clone IS
  reachable for `get` (observe-only), so a blanket "unreachable" is false. the incumbent this pair
  of renames replaced.
- **silent / offline** — describe output or presence, not the input-deafness that is the actual
  property; a deaf clone may be a live process that still appends to its transcript.
- **socketless** — a mechanism word (names the cause, not the domain state); the state is about
  say-ability, not the socket's presence per se.

the one con of `deaf`: it sits one letter from `dead`, so the two read close in a dense `list`.
mitigated by the footer legend (`DEAF = get only, cannot hear a say · DEAD = finished/gone`) and
by the two states never confusable in fix (deaf → observe or re-enroll; dead → re-enroll/wake).

## .disputes

### dispute: not-reachable  —  raised 2026-08-13  —  status: RESOLVED (rename away from `not-reachable`)
- raised.by  = the human wisher
- claim      = "noninteractive clones ... cant hear you" — the state is about input-deafness, and
               a clone with no socket is still observable via `get`, so "not-reachable" is wrong
- counter    = "not-reachable" was the incumbent; it read as a blanket "cannot reach", which
               conflated the absent `say` channel with a (false) absent `get` channel
- resolution = rename away from `not-reachable` (a clone can't hear a say, but is observable);
               record `not-reachable` + `unreachable` as forbidden synonyms.

### dispute: deaf-is-permanent  —  raised 2026-08-13  —  status: RESOLVED (the state is transient)
- raised.by  = the human wisher
- claim      = "obviously mute clones should be marked dead once they're done" — a socketless
               clone must NOT read this state forever; once its process exits it is finished (DEAD)
- counter    = the first-cut classifier keyed the state purely on the spawn-time
               `socketEligible=false` fact, so a socketless clone stayed active-but-deaf after its
               process had long exited — a finished clone mis-labeled as merely-deaf
- resolution = the state gains a second condition (process still alive); reach-state becomes a
               3-fact function `{socketEligible, socketLive, processLive}`. DEAF = socketless ∧
               alive; DEAD = finished/gone for EVERY clone. only the scope narrows (transient, not
               permanent).

### dispute: mute-vs-deaf  —  raised 2026-08-13  —  status: RESOLVED (rename `mute` → `deaf`)
- raised.by  = the human wisher
- claim      = "should we call it DEAF instead of MUTE?" — mute names the inability to SPEAK, but
               the clone's property is the inability to HEAR (it still produces output via `get`)
- counter    = `mute` was already shipped in the tri-state LIVE | MUTE | DEAD and read cleanly
               beside LIVE/DEAD; the swap touches the type, the classifier, the hint, the list
               render, the acceptance snapshots, and the term cluster
- resolution = rename `mute` → `deaf`. deaf = can't-HEAR = can't-receive-a-`say`, which matches
               the property exactly; mute = can't-SPEAK is the opposite and is recorded as a
               forbidden synonym. the tri-state is now LIVE | DEAF | DEAD. wisher: "and yeah obvi
               use DEAF". the one accepted cost is the deaf/dead visual proximity, mitigated by the
               legend.

## .evidence

- **the state model** — `define.clone-reach-states.md` (LIVE | DEAF | DEAD, with say/get
  allowances per state; DEAF transient, DEAD terminal).
- **the classifier** — `src/domain.operations/clone/computeCloneReachState.ts`: 3-fact —
  `socketEligible ? (socketLive ? LIVE : DEAD) : (processLive ? DEAF : DEAD)`. the
  `get`-still-works property is why DEAF is observe-only; the `processLive` fact is why DEAF
  flips to DEAD once the process exits.
- **the pid probe** — `src/domain.operations/clone/isCloneProcessLive.ts`: host-match ∧
  `process.kill(pid, 0)` — the DEAF↔DEAD hinge for a socketless clone.
- **the security tie-in** — `define.invariant.clone-socket-brain-cli-only.md`: a DEAF clone has
  no socket, so a `say` is refused by construction — part of the "no shell access via a dead/deaf
  clone's socket" guarantee.
- **settled by** — the human wisher (2026-08-13), in the same council that set the brain-cli
  invariant.
