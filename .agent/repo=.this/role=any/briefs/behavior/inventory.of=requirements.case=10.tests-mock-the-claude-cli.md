# requirement: only the essential smoketests call anthropic; every other test runs on a mock claude cli

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

- every test whose subject is not the real anthropic contract runs on a mock of the `claude` cli,
  and spends no anthropic tokens
- the only tests that reach the anthropic api are the essential smoketest acceptance tests, and each
  one runs on haiku

## .why

a real-claude test costs tokens, seconds, and flakes on every run. most tests prove rhachet's own
mechanism (enroll, the pty, the socket, the dispatch, the transcript read). a mock claude proves that
mechanism just as well. only the integration with a real claude needs a real claude.

## .clamp

owed — a fence that refuses a real brain off the smoketest registry, planned as its own pr in
`.dream/v2026_11_03.followup.fence-the-real-brain-to-the-smoketests.md`.

until the fence lands, the requirement holds by absence, bounded to what was searched (2026-11-03):

- `src/` (the unit and integration tiers): `from 'rhachet-brains-` hits one file,
  `genContextBrain.integration.test.ts`. it builds supplier brains to prove discovery, and every
  `ask` / `act` it makes goes to a local fake. no src test calls a real brain
- `blackbox/sdk/replDoorRealSupplier.realnode.integration.test.ts` loads the real anthropic
  supplier, but its probe intercepts `child_process.spawn`, so no brain boots and no token is spent
- the acceptance tier (`blackbox/**/*.acceptance.test.ts`), by name and by gate:
  - behind `describeBrainLiveOnDemand` (grepsafe `describeBrainLiveOnDemand(` over `blackbox/`):
    `cli/brain-dir-boot.journey`, `cli/clone.screen-dogfood.realbrain`,
    `cli/clone.transcript-lag.realbrain`, `sdk/replDoorRealSupplier.realnode`
  - real, with no live gate: `cli/clone.joker.realbrain`, `cli/clone.modalprobe.realbrain`,
    `cli/clone.realbrain`, `cli/clone.saybulk-probe.realbrain`

## .proof

partial — the src sdk suites that drove an actor through a real haiku (and a real xai atom and
openai codex) run on `genMockedBrainRepl` / `genMockedBrainAtom` on every run, with no key:

- `src/domain.operations/actor/actorAsk.integration.test.ts`
- `src/domain.operations/actor/actorAct.integration.test.ts`
- `src/contract/cli/invokeAct.integration.test.ts`
- `src/contract/sdk/genActor.brain.case{Askable,Collocated,Published}.integration.test.ts`

owed — the mechanism cases inside the `clone.*.realbrain` acceptance suites move onto the mock cli
in the fence's dedicated pr: which case stays real is what the fence's smoketest registry decides,
so the move and the registry land together (the dream above holds the pr's title and bounded diff).

## .source

the wisher, 2026-11-01 (`v2026_11_01.fix-tests-mock-the-claude-cli` wish); delivered in part by
`.behavior/v2026_11_03.fix-tests-mock-the-claude-cli.nano/`.
