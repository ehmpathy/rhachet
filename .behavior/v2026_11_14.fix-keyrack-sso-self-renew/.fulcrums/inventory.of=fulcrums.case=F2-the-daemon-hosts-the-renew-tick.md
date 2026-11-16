# F2 · the daemon hosts the renew tick and calls aws

- **the fork:** (a) the daemon runs a renew tick and calls the aws.config vault's silent proof itself · (b) some other process (a cron, a hook, the consumer) fires `keyrack unlock` before expiry
- **taken:** (a). the daemon is the one process alive across the expiry, and it already holds the grant. (b) needs a second scheduler on every host, and fails exactly when no human session is open, which is the overnight case that broke 0901.
- **rework:** dirty — once the daemon imports vault code and the tick exists, tests and status depend on it.
- **confidence:** 90%. the cost: the daemon stops to be pure memory and gains an aws dependency.
- **where:** `1.vision.yield.md` · after, awkward.
- **verdict:** awaited from the council.
