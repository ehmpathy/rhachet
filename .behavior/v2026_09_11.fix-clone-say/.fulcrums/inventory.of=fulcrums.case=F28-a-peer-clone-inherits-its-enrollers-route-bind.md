# case=F28 — the peer-clone route-bind inheritance is CAUGHT as a dream, over a bind-scope fix landed here

| | |
|---|---|
| **rework** | dirty |
| **status** | OPEN |
| **confidence** | 85% |
| **arose** | 2026-09-17, in `5.3.verification` — a live loop-directive dogfood |
| **family** | the clone-spawn inherit-by-default set (with F26) |

## .the fork

a live dogfood enrolled a fresh peer, said to it, and read a reply. the read then showed a **third**
turn nobody dispatched: the peer's `hook.onStop` fired `route.drive`, found this route's bind in the
shared worktree, and injected the whole `5.3.verification` stone into the peer's own context.

| option | what it does |
|---|---|
| **A — a peer is unbound by default** | the enroll spawn clears the bind for the child; the Stop hook reads an env opt-out |
| **B — the bind carries an ACTOR** | `route.drive` emits the stone only to the actor the bind names |
| **C — an enroll flag** | `enroll --route inherit\|none` names it at the call site |
| **D — catch it, rule it elsewhere** ✅ **taken** | a dream plus this fulcrum; the fix lands in its own PR |

## .taken, and why at the time

**D.** the buttonup mandate says *"if you detect it, you fix it"*, and the SAFE/CLEAN test
(`rule.always.fix-forward-under-scouts-honor`) refuses this one on both legs:

- **SAFE — no.** it changes when `route.drive` emits at all, and that mechanism is what every route on
  every branch depends on for its own progress. a wrong read there silently stops a human's drive with
  no error to read
- **CLEAN — no.** it ripples across three subsystems this wish never opens: the bind file shape
  (`route.bind.*`), the Stop hook contract (`route.drive --when hook.onStop`), and the enroll env
  handoff (the spawn env, `asCloneDetachHostArgv`)

⇒ and the option choice is itself a **wisher call**, because B amends a contract (`route.bind`) that
sits outside this wish's declared scope. so a best-guess here would settle by side effect a question
the wisher never saw.

## .the rework, and why it is DIRTY

a bind is read by the Stop hook on **every** clone and every human session, so an actor field added to
it is a format change with live readers. an A-shaped stopgap is cheaper and would then have to be
un-picked when B lands — which is the definition of a rework that is not clean.

## .the harm the deferral carries

stated plainly, since a deferral that hides its cost is the defect this record exists to prevent:

| cost | what it does |
|---|---|
| context | ~300 lines per Stop, every turn, for the peer's whole life |
| steer | the stone instructs the peer to run `--as passed` on a route it never joined |
| 🔴 collision | two clones on one bind can each signal the same stone, so a **passage record** gains entries from a party that did no work |

⇒ **the third row is the one that writes to shared state**, and it is why this is a fulcrum rather than
a tidiness note.

## .what it does NOT block

the loop directive's own goal is **met and measured** with the inheritance live: a fresh detached peer
enrolled `socketEligible: true`, a say returned `verdict: released` / `probe: capable`, and the peer
answered exactly. so the deferral costs the peer's budget and the passage record's purity — and it
costs the wish's deliverable not one part.

## .the demos that RENDER this call

**NONE.** the inheritance is a property of the route/enroll seam, and no `case=N` demo renders a Stop
hook or a bind. `case=9` renders a detached enroll's reachability, which is settled before any hook
fires. ⇒ a verdict on this entry changes no demo.

## .see also

- `.dream/2026_09_17.a-peer-clone-inherits-its-enrollers-route-bind.dream.md` — the caught work, with
  the A/B/C shapes priced
- `case=F26` — the same call, one subsystem over (a plain clone inherits its parent's socket path).
  🟡 **it went the other way**: F26's clamp proved writable, so the fix landed there and no dream was
  owed. that precedent argues option B here, and this entry must answer it
- 🔴 the family: `case=F26` (the socket path) ·
  `.dream/2026_09_16.a-clone-adopts-its-parents-live-transcript-via-mtime.dream.md` (the transcript) —
  **three inherit-by-default defects in two days is a pattern**: a clone spawn hands every ambient
  signal down undifferentiated, and each subsystem discovers its own leak separately
