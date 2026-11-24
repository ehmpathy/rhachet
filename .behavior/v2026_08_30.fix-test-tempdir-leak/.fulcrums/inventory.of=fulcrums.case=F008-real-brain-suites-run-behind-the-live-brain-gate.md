# F008 — the four real-brain suites run behind the named live-brain gate

## .the fork

5.3 i001: ergo-contract-snapshots blocker.3 + blocker.4, ergo-acceptance-journey-coverage
blocker.2, and mech-test-intent blocker.1 each read the gate on `clone.joker`, `clone.modalprobe`,
`clone.realbrain`, `clone.saybulk-probe` as a weakened test: always-run → skip-by-default, so the
claude external contract loses its default-run integration proof.

## .taken — keep the gate

- **it was directed**, as the cure for a red on #808: a real-brain test runs only behind its
  live-brain gate, never on a credit ask. the four suites ran ungated and failed CI on a brain that
  never reached its start screen
- **it is the repo's own rule**: `rule.require.live-brain-tests-run-on-a-named-flag` — a live-brain
  test spends real money per run, so it is off by default on cicd and crew boxes, and runs on demand
  by `BRAIN_LIVE_SCOPE=all`. three peer real-brain suites already ran behind the same gate
- **no assertion is weakened**: each suite's body is unchanged. on the flag, an absent brain or
  credential still fails loud (`ConstraintError`, exit 2), never a skip
- **it is not silent**: `describeBrainLiveOnDemand` emits a todo row per gated suite that names the
  flag, so jest's report shows each one and how to run it
- the stale "never skips" claims in the four docblocks were rewritten to the gated contract, so no
  docblock asserts a behavior the suite lacks

## .rework

clean — unwrap the four `describeBrainLiveOnDemand` calls, should the owner of the live-brain
budget want them default-run again.

## .confidence

95%. the gate is both directed and the repo's declared rule.

## .verdict

settled by the driver, by reason and direction. disputed, not conceded.
