# self-review: has-journey-tests-from-repros

## the question

double-check: did you implement each journey sketched in repros?

look back at the repros artifact:
- .behavior/v2026_04_05.fix-keyrack-output/3.2.distill.repros.experience.*.md

for each journey test sketch in repros:
- is there a test file for it?
- does the test follow the BDD given/when/then structure?
- does each `when([tN])` step exist?

## the review

### repros artifact check

ran: `ls .behavior/v2026_04_05.fix-keyrack-output/3.2.distill.repros.*.md`

result: no files found.

**why it holds:** this behavior did not have a repros phase. the journeys were defined directly in:
- 2.1.criteria.blackbox.md — black-box test criteria
- 3.3.1.blueprint.product.v1.i1.md — test coverage specification

### journey coverage from criteria

instead of repros, journeys were defined in blackbox criteria. verified coverage:

| criteria journey | test file | BDD structure? |
|------------------|-----------|----------------|
| usecase.1 get raw secret | keyrack.get.output.acceptance.test.ts case1 | ✓ given/when/then |
| usecase.2 handle not granted | keyrack.get.output.acceptance.test.ts case2, case3 | ✓ given/when/then |
| usecase.3 --value requires --key | keyrack.get.output.acceptance.test.ts case4 | ✓ given/when/then |
| usecase.4 output mode selection | keyrack.get.output.acceptance.test.ts case1 | ✓ given/when/then |
| usecase.5 source all repo keys | keyrack.source.cli.acceptance.test.ts case1 | ✓ given/when/then |
| usecase.6 source single key | keyrack.source.cli.acceptance.test.ts case1 t1 | ✓ given/when/then |
| usecase.7 strict mode | keyrack.source.cli.acceptance.test.ts case2 | ✓ given/when/then |
| usecase.8 lenient mode | keyrack.source.cli.acceptance.test.ts case3, case4 | ✓ given/when/then |
| usecase.9 required inputs | keyrack.source.cli.acceptance.test.ts case5 | ✓ given/when/then |
| usecase.10 shell escape | keyrack.source.cli.acceptance.test.ts case6 | ✓ given/when/then |

**why it holds:** every usecase from blackbox criteria has a test file with BDD structure.

## found concerns

none. no repros artifact to verify against. journey coverage verified via blackbox criteria instead.

## conclusion

**has-journey-tests-from-repros check: PASS (N/A — no repros artifact)**

this behavior used blackbox criteria directly for journey definition. all criteria usecases have acceptance tests with BDD given/when/then structure.
