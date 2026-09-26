# rule.forbid.sync-invoke-while-a-pty-is-live

> **while a test holds a live background pty, it never calls a child process synchronously.
> use `invokeRhachetCliBinaryAsync`, never `invokeRhachetCliBinary` (`spawnSync`).**

## .why — a sync call starves the pty it alone drains

`spawnRhachetCliBackground` reads its pty through `child.onData`, which fires only while the
test's event loop turns. a `spawnSync` freezes that loop for the whole call. meanwhile:

1. the enrolled clone mirrors its brain's screen into that pty — a claude tui animates
   constantly, so the bytes never stop
2. node's tty write is **synchronous**; once the kernel pty buffer fills, the clone's own event
   loop blocks inside that write
3. a blocked clone cannot serve its socket — so a `clone say` gets no `delivered` ack
4. the say waits out its 30s wedge window and exits **2**
5. only now does the test's loop resume, drain the pty, and unblock the clone — which then
   delivers the message it held

⇒ **a deadlock the test made, which reads as a product wedge.** the reply lands seconds after the
say reported failure, so the evidence looks contradictory: `said.status = 2`, yet `landed = true`.

🔴 it is **load-dependent**, which is what makes it a flake rather than a failure. solo, the
spawn is fast and the buffer never fills; under a full parallel suite a cold binary spawn takes
seconds and the brain's render fills the buffer first.

🟡 the circular case is a call that **needs the clone's event loop to answer** — `clone say`. a
call that does not (`clone list`, `clone get`) only delays the drain; it cannot deadlock. use the
async twin for both anyway: the rule is cheaper to hold than the distinction.

## .the measured case

`clone.joker.realbrain` [t4], 2026-09-25, full acceptance run: `✕ the piped request is delivered
and answered — Expected: 0, Received: 2`, while the round-trip itself took 34.5s — the 30s wedge
plus a normal reply. after the say and its `get` poll moved to the async twin, the suite ran
19/19 in 30s solo (was 55s), and all three real-brain suites ran 27/27 together.

## .how

```ts
// 👎 blocks the loop that drains the clone's pty
const said = invokeRhachetCliBinary({ args: ['clone', 'say', address, '--what', m], cwd, env });

// 👍 the loop keeps its turns, so the pty drains while the child runs
const said = await invokeRhachetCliBinaryAsync({ args: ['clone', 'say', address, '--what', m], cwd, env });
```

| when… | then… |
|---|---|
| a test holds a `spawnRhachetCliBackground` handle | every child call in its scope is async |
| a say exits 2 but its reply lands moments later | 🔴 suspect this rule before the product |
| a real-brain flake appears only under the full suite | suspect a starved pty before a slow brain |
| you add a helper that invokes the cli beside a live pty | it takes the async twin, never the sync one |

## .scope

blackbox test code and test infra that spawns a background pty (`spawnRhachetCliBackground`,
the enroll harnesses). a test with no live pty may keep the sync form.

## .enforcement

- a `clone say` via `spawnSync` while a background pty is live = **blocker**
- any other sync child call while a background pty is live = **nitpick**

## .see also

- `blackbox/.test/infra/invokeRhachetCliBinary.ts` — `invokeRhachetCliBinaryAsync` and its note
- `blackbox/.test/infra/enrollCloneHarness.ts` — `sayAndPollForMarker`, the first consumer
- `define.invariant.clone-say-delivery` — what `delivered` promises, and why a wedge is exit 2
