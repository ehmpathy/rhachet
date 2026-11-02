# F2 — mock-backed blackbox suites keep the acceptance tier

## .the fork

- (a) a blackbox suite that drives the built `rhx` against the mock claude keeps `.acceptance.test.ts`
- (b) it moves to `.integration.test.ts`, per a strict read of `rule.forbid.faked-or-quarantined-acceptance`

## .taken

(a). the subject of such a suite is rhachet's cli contract, driven as a blackbox. claude is a
dependency behind it, and each real claude contract seam keeps its real test in the default gate
(the smoketests). the repo already does this: 10 blackbox acceptance suites run on the stub today.

## .rework

clean — a rename of files and a move between jest configs.

## .confidence — 85%

raised from 65%. the wish's own words settle it: "only the essential smoketest **acceptance** tests
call the api" presumes acceptance tests that do not. the rule's letter still says otherwise, so a
note in the rule that names this sense is owed in the blueprint.

## .where

`1.vision.yield.md` — A3, Q3

## .verdict

answered from the wish (Q3).
