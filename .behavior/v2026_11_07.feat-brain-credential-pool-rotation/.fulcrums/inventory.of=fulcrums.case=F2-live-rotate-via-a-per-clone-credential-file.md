# F2 — live rotation via a per-clone credential file

- **the fork:** O7 at the clone grain (rhachet writes a credential file; claude-code re-reads on mtime) · the api-key helper of the 09-29 per-reach dream · O5 env only (no live rotation) · O8 proxy
- **taken:** O7 at the clone grain. the helper bills the console, not a subscription (O6), and does not re-run on 429 (#324); O5 fails the 09-29 seed S3; O8 puts a daemon in every request path
- **rework:** dirty — the spawn env, the clone host, and the verify all build on the channel
- **confidence:** 65% — O7's shape is unverified on today's claude-code build (inference-only token, far `expiresAt`, mtime re-read at a per-clone secure-storage dir)
- **where:** `1.vision.yield.md` §4, specs table
- **verdict:** —
