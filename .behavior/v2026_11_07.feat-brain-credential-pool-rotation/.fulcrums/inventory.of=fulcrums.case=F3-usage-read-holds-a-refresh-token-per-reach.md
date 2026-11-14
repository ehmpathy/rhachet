# F3 — the capacity read holds a refresh token per reach

- **the fork:** the usage endpoint via a usage-scoped refresh token per reach, as dev-env-setup `brains.auth.usage` does · the unified rate-limit headers off a one-token probe with the setup-token · the clone status line alone
- **taken:** the usage endpoint as primary (the commander asked for the `brains.auth.usage` read), with headers and status line as fallback and free reads
- **rework:** dirty — a second credential per reach, with a single-holder discipline, is a keyrack contract
- **confidence:** 60% — the endpoint is undocumented and throttled; a refresh token in a fleet's keyrack is a lockout hazard if a second holder ever appears
- **where:** `1.vision.yield.md` §3
- **verdict:** —
