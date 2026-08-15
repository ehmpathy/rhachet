# rule.require.test-claude-cli-against-haiku

## .what

any test that spawns a REAL `claude` brain-cli MUST enroll it with `--model haiku` (unless
the test's very purpose is to exercise a smarter model's capability). haiku is the default
brain for every real-claude reach/integration/acceptance test.

```bash
# good — the real-brain reach proof runs on haiku
rhx enroll claude --model haiku --as @:joker

# bad — a real-brain test on the default (smart, slow, costly) model
rhx enroll claude --as @:joker
```

## .why

a real-claude test proves the MECHANISM — that a live brain boots under our pty, `submit`s a
dispatched message off its input buffer, and its reply reads back through `get`. it does NOT
need a smart brain; it needs a FAST, CHEAP one:

- **rapid response** — haiku answers + writes its transcript in ~1-5s, so the reach round-trip
  is quick and a tight poll deadline (30s) fails a genuinely-broken `submit` ~5x faster than a
  slow model would. a smart model can take 10-30s per turn, dragging a 5-turn conversation to
  many minutes of dead wait.
- **token conservation** — a real-brain test burns real tokens on every run. haiku is the
  cheapest model, so a suite that re-runs on every acceptance pass costs a fraction of what the
  default model would. the test proves reach, not reasoning quality — paying for a smart model
  is pure waste.
- **determinism of the CLAMP, not the prose** — a real brain's reply text is never snapshotted
  (it cannot be); the clamp is a deterministic MARKER the prompt asks the brain to echo. haiku
  emits the marker just as reliably as any model, so no fidelity is lost by the cheaper brain.

## .how

- pass `--model haiku` on the enroll of every real-claude test. the shared real-brain fixture
  `enrollRealClaudeAndWaitReach` (in `blackbox/.test/infra/enrollCloneHarness.ts`) defaults its
  `model` to `haiku`, so a test that uses the fixture inherits this for free.
- `--model` is a claude passthrough arg — `rhx enroll` consumes only its own flags (`--as`,
  `--brain`, `--output`, `--no-socket`, `--reason`, `--roles`) and passes the rest to the brain.
- keep the poll deadline tight (haiku's real latency is seconds, so 30s is ample headroom): a
  marker that has not appeared well within the cap means `submit` did not land — the bug — not a
  slow brain.

## .the one exception

a test whose SUBJECT is a capability only a smarter model has (a genuine reasoning/quality
assertion, not a reach proof) may name a larger model — but it must say WHY in a `.note`, since
it pays the speed + token cost deliberately. reach/dispatch/observe tests are NEVER that case.

## .enforcement

- a real-claude test that enrolls the default (smart) model instead of `--model haiku`, with no
  documented capability reason = **blocker** (it wastes tokens + time on every run)
- a real-claude poll deadline sized for a slow model (e.g. 150s) where haiku replies in seconds
  = **nitpick** (it makes a broken `submit` fail slowly)

## .see also

- `rule.allow.acceptance-spawns-real-brain-cli` — acceptance tests ARE authorized to spawn real claude
- `rule.forbid.faked-or-quarantined-acceptance` — the real-brain proof lives in the one acceptance suite
- `term=submit._.choice._.md` — the concept the real-claude reach test proves
