# F6 — the tick runs from the box's cron

- **the fork:** a cron line that calls `rhx brains pool rotate` every 15 minutes · a rhachet daemon with its own timer · the clone host of each clone on its own timer
- **taken:** the box's cron. rhachet has no scheduler, and `invokeEnroll.ts:726-730` already assumes an outer supervisor; the limit-banner trigger lives in the clone host, which already mirrors the screen
- **rework:** clean — the verb is the same under either host
- **confidence:** 80%
- **where:** `1.vision.yield.md` §4
- **verdict:** —
