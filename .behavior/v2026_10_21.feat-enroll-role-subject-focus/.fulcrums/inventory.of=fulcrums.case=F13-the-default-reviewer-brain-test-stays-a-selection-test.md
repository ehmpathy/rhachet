# F13 — the default reviewer brain test stays a selection test, with no real openrouter call

- **the fork:** (a) `src/.test/defaultPeerReviewerBrain.integration.test.ts` asserts the brain
  rhachet SELECTS, read off the installed `rhachet-brains-openrouter` package; (b) add a real call
  to `openrouter/deepseek/flash` in this repo, plus an absent-credential case
- **taken:** (a). the file is extant (`inventory.of=requirements.case=5`); this pr only re-pointed
  its import at the package's renamed constant (`BRAIN_DEFAULT_OF_REVIEW`), same value
- **why (b) does not belong here:** rhachet never calls this brain. the contract under test is "which
  brain does a peer review default to", and that is the selection, which (a) proves against the
  real installed package (no mock). the real-call contract — that openrouter answers and its
  response parses — is owned by `rhachet-brains-openrouter`, the package that makes the call. a
  real call here would test a supplier's integration from a framework that holds no code on that
  path (`rule.forbid.supplier-assumptions-in-the-framework`)
- **rework:** clean if the council rules otherwise — one more `then` with a real call, gated on the
  openrouter key
- **confidence:** 75%
- **where:** 5.3 i001 r003 blocker.1 · `.dream/2026_10_23.reseed.openrouter-brain-real-call-contract-test.dream.md`
- **verdict:** —
