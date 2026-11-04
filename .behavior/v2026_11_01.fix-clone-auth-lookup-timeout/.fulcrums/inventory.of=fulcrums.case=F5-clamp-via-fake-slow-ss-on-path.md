# F5 — clamp via a fake slow `ss` on `PATH`

- **fork**: to make the lookup slow in a test — inject an exec function, inject the timeout, or put
  a fake `ss` that sleeps first on `PATH`
- **taken**: fake `ss` on `PATH` (sleep 9, then exec the real `ss`). it drives the real `exec`, the
  real timeout kill, and the real `ss` parse, with zero prod injection seams. an injected timeout
  would test the injection, not the bound
- **rework**: clean — test-only
- **confidence**: 88% — `process.env.PATH` is mutated inside one jest worker, restored after
- **where**: a new case in `genCloneSocketServer.integration.test.ts` (real server in-process, real
  gate wired, `sayClone` from the same uid)
- **verdict**: open
