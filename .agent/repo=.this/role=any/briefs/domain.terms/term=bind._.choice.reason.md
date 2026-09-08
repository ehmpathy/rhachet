# domain.term.choice.reason: bind

## .etymology

`bind` is **adopted, never coined** — it is the posix syscall (`bind(2)`) and node's own vocabulary
for the same act. the domain expert here is the kernel, and it already had the word.

rejected alternatives, each for a stated reason:

| candidate | why rejected |
|---|---|
| `listen` | posix has BOTH `bind(2)` and `listen(2)`, and they are distinct syscalls. to reach for `listen` would name the wrong one — the address claim is `bind`; the accept-queue is `listen`. an overload of two real syscalls onto one word |
| `attach` | invented where posix supplied a word. also collides with the pty sense of attach |
| `open` | too broad; every fd is opened. says naught about an address |
| `connect` | the CLIENT half of the same pair. to use it for the server half inverts the direction |

## .evidence

**the three-outcome decomposition is what earned the term its own cluster.** it was walked at
2026-09-03/04 while a real crash path was repaired:

| outcome | libuv | who owns it |
|---|---|---|
| succeeds | emits `'listening'` | the `ready` promise resolves |
| faults | emits `'error'` + errno | `asCloneSocketBindFaultError` classifies it as OURS (a `MalfunctionError`) |
| **neither** | no event | `CLONE_SOCKET_BIND_TIMEOUT_MS` bounds it, and `ready` rejects |

the third row is the one no prior code named. it had no word, so it had no guard, so an enroll
could hang forever behind an already-spawned brain-cli. **a term absent from the glossary was a
state absent from the code.**

## .the boundary

`term.boundary = clone.socket`, never `clone` alone. the test — *"bind, of WHAT?"* — answers
**"of a socket"** in one word. a future `bind` of some other resource (a port, a device) would be a
distinct cluster under its own boundary, not an overload of this one.

⚠️ **not to be confused with `route.bind`** — the driver's act that ties a route to a branch
(`rhx route.bind.set`). that is a different concept in a different bounded context, which is
exactly why this cluster carries `clone.socket` in its boundary field rather than a flat name.
two real senses, two boundaries, no overload.

## .disputes

none raised.
