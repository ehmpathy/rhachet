# F6 · the live proof runs in a private daemon

- **the fork:**
  - (a) restart the box's shared daemon on the new build, then unlock and watch there
  - (b) spawn a private daemon from the new build under its own `XDG_RUNTIME_DIR`, and leave the shared one be
- **taken:** (b). the shared daemon holds keys other groves lean on (prep, prod, test). a restart drops them all, and some may need a human to unlock again. the socket path keys on `XDG_RUNTIME_DIR`, so a private runtime dir yields a private daemon on the same code path. paved as `rhx keyrack.private`.
- **rework:** clean — the proof is one unlock and a status watch; either daemon serves.
- **confidence:** 85%. a private daemon proves the daemon code. it does not prove that the grove 0901 tunnel, which reads the shared daemon, stays up. that part waits for a release, when every daemon runs the new build.
- **where:** `5.1.execution.from_vision.yield.md` · live proof; `.agent/repo=.this/role=any/skills/keyrack.private.sh`.
- **verdict:** awaited from the council.
