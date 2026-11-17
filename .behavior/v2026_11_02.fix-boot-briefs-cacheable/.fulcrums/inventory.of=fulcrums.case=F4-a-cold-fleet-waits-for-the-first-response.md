# F4 — a cold fleet waits for the first clone's first response

## .the fork
let N clones of one role set start at once, each cold, each a boot write; or have rhachet hold all but the
first until the first clone's brain-cli has begun its first response, so the rest read the boot it wrote.

## .taken, why
the stagger, keyed by the actor's `boot.md` hash. the api's prompt cache docs state an entry becomes
available only after the first response starts, and advise parallel requests to wait for it. a fleet of
one role set is the wish's core load (PR #398), so six cold writes per fan-out is the bulk of the cost the
system-prompt door alone leaves on the table. a warm entry, a lone enroll, or two role sets never wait.

## .rework
clean: the stagger is one wait inside the async enroll path; to drop it is to delete that wait. no contract,
flag, or file layout depends on it.

## .confidence, why low
70%. the first-response signal rhachet would watch is unread (open question 18); the wait adds latency to
a fan-out the driver may value over cost; and it may sit outside the wish's "the boot lands in a
cache-eligible prefix", which this fork goes past — it is about when, not where.

## .where
`1.vision.experience.case=9.a-fleet-starts-at-once.md` · `1.vision.yield.md` edgecases

## .verdict
ruled yes by the wisher at the `1.vision` approval, 2026-11-02 (seed S1): a cold fleet waits for the first
response. built in `5.1.execution`.
