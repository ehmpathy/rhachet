# F5 — the fleet gate sits at a clone's first say, not at its spawn

## .the fork
F4 (ruled yes) holds the rest of a cold fleet until the first clone's first response begins. where the hold
sits is open:

- **at spawn** — the async enroll waits before it starts the brain-cli. the F4 entry assumed this
- **at the first say** — a `clone say` to a clone with no request sent yet waits, before delivery, while
  another clone of the same boot has a first request in flight and no response
- **in the host** — the clone's host process holds its first input until the boot is warm

## .taken, why
the first say. measured 2026-11-02 (`rhx boot.compact.probe`, the spawn row): an `--async` clone sends no
request in the 15s after spawn; its first request rides its first say. a hold at spawn delays no request,
and a driver that awaits all six enrolls before it says would hold the followers until the bound and then
start them cold anyway. the host gate would sit inside the say delivery path, whose `delivered` contract
and wedge window are clamped (`define.invariant.clone-say-delivery`). a wait in the say client, before it
connects, touches neither: `delivered` still means delivered, and the say only takes longer.

the release signal is the lead clone's first assistant row in its transcript, read from its clone dir.
that row lands once the first response is under way, so the cache entry the api makes at response start
is readable by then.

## .rework
clean: the gate is one wait in the say client, before delivery. to move it to the spawn or the host is to
move that one call; no contract, flag, or file layout depends on where it sits.

## .confidence, why low
75%. the assistant row lands at the end of the first content block, a little later than the response
start the api names, so the gate holds a follower slightly longer than it must. a spawn with a prompt
(`enroll -p`) sends its first request at spawn, so a say gate does not cover it.

## .where
`5.1.execution.from_vision.yield.md` · the say client · `1.vision.experience.case=9.a-fleet-starts-at-once.md`

## .verdict
ruled yes by the wisher, 2026-11-02 (S2): the wait sits at the first say, as built.
