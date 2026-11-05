# F7 — the wish moves the real brain to the acceptance tier

## .the fork

- (a) keep a real-brain call in the src integration tier, per the general rules
  `rule.forbid.integration.mocks` and `rule.require.external-contract-integration-tests`, and add
  the mocked suites beside them
- (b) the six src suites run on a mocked brain; the real anthropic brain is proven only by the
  acceptance smoketests, on haiku

## .taken

(b). this is the wish's whole ask, word for word: every non-essential anthropic api test runs on a
mock of the claude cli, and only the essential smoketest acceptance tests call the api, on haiku.
the approved `1.vision` names the barred cell `integration × real` and the six suites by name.
(a) would keep the live gate on the very suites the wish frees.

the real-call contract test the general rules require still exists, one tier up:
`blackbox/sdk/replDoorRealSupplier.realnode.acceptance.test.ts` boots a live haiku brain through the
real anthropic repl supplier and the built `rhachet/brains` contract. it calls the real spawn; the
spawn-stop probe is the separate `.integration` file of the same name. it asserts the live reply
(`expect(live.content?.toLowerCase()).toContain('ok')`, line 68) and refuses loud on an absent build.
the `*.realbrain` acceptance suites prove the real cli reach. the six suites prove rhachet's own call
path, which a mock proves fully: which brain is chosen, what it is handed, and what flows back.

the intent shift in the six suites (a real answer's length → the mock's exact answer, and the
`--brain` proof by which mock recorded the call) is the requirement change the vision declares
(`.what is awkward`). it is declared, not quiet; the real-answer truth now lives in the smoketests.

## .rework

clean. a live-gated real-brain case can be added beside any of the six suites with no change to
the mocked cases.

## .confidence

95%. the wish states it outright, and the director approved the vision. the residue: the general
rules read as if they bind every tier, so each round's reviewer re-raises it until a repo rule
names this exception.

## .where

5.3 i001: repo-rules r001 b1 (in part); ergo-contract-snapshots r002 b2; mech-external-contracts r003
b1/b2/n1/n2; ergo-acceptance-journey-coverage r004 b1/b2; mech-test-intent r008 b1/b2/n1;
mech-test-scope-purity r009 b1.

## .verdict

(open)
