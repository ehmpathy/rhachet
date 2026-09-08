# domain.term.choice.reason: ready

## .etymology

`ready` names the **state a caller waits for**, never the mechanism that reaches it. that is the
whole reason it beat its alternatives:

| candidate | why rejected |
|---|---|
| `awaitServerReady` | the extant shape — a local operation **duplicated at four call sites**. a verb phrase names an act; the contract needed a value a caller can hold. deleted this round |
| `started` | ambiguous — the server object exists the moment it is constructed. `started` reads as "the constructor ran" |
| `up` | says naught about whether the bind faulted. a faulted server is not up, and `up` gives no way to say so |
| `live` | already spoken for — `getOneCloneLiveCountForActor` uses `live` for a clone that answers |

## .evidence — the term was born from a REGRESSION i shipped

this cluster exists because of a defect, and the defect is the argument.

**the first cure** for an uncaught bind fault kept a fault counter inside the server and returned
early on the first fault, on the premise that *"the caller races the fault and owns it."*

only `genBrainCliPtyClone` did. **three test callers awaited the bind's success alone**, each
through its own copy of the same local await. so the guard converted a **loud uncaught crash** into
a **silent hang** at three sites it never touched.

⇒ 🔴 **an unenforced calling convention is a contract no compiler checks.** the premise was true of
one caller and false of three, and the signature carried no way to say which.

**the cure is decomposition, never discipline.** `ready` lives in the module that owns the server,
so no signature carries an unstated promise, and the four duplicate awaits are one value.

## .what it settles, and what it cannot

| the bind | `ready` |
|---|---|
| succeeds | resolves |
| faults (`EADDRINUSE`, `EACCES`, …) | rejects with the errno |
| neither, past `CLONE_SOCKET_BIND_TIMEOUT_MS` | rejects as stalled |

⚠️ **the clamp's reach is stated with its limit.** the third row cannot be provoked hermetically:
node emits its success event on `process.nextTick`, which runs before the timers phase, so a timer
short enough to win would win by luck. **a clamp that reds by luck is worse than an absent one.**
`[case14]` clamps the guard's own hazard instead — a healthy bind is never torn down by its bound.

## .disputes

none raised.
