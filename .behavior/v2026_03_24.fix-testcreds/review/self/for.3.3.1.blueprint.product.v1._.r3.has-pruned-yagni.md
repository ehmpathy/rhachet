# self-review: has-pruned-yagni

## component.1 = getAllAvailableIdentities extension

| question | answer |
|----------|--------|
| explicitly requested? | yes — vision says "auto-discover prikey from ~/.ssh/$owner" |
| minimum viable? | yes — adds owner param and one path check |
| abstraction for future? | no — owner param is used immediately |
| features "while we're here"? | no — only owner discovery added |
| premature optimization? | no — single path lookup is trivial |

**holds**: this is the core enabler for eliminate `--prikey ~/.ssh/ehmpath` from unlock commands.

---

## component.2 = jest.integration.env.ts changes

| question | answer |
|----------|--------|
| explicitly requested? | yes — vision says "replace jest.integration.env.ts apikeys check" |
| minimum viable? | yes — CI passthrough + keyrack spawn + error handle |
| abstraction for future? | no — inline logic |
| features "while we're here"? | no — only the apikeys section changes |
| premature optimization? | no — CI passthrough is efficiency, not optimization |

**holds**: directly implements the "tests fetch keys from keyrack automatically" outcome.

---

## component.3 = jest.acceptance.env.ts changes

| question | answer |
|----------|--------|
| explicitly requested? | yes — vision says "jest.acceptance.env.ts — same changes as jest.integration.env.ts" |
| minimum viable? | yes — same pattern as integration |
| abstraction for future? | no — inline logic |
| features "while we're here"? | no — only the apikeys section changes |
| premature optimization? | no |

**holds**: acceptance tests need the same credential flow.

---

## component.4 = delete use.apikeys.sh

| question | answer |
|----------|--------|
| explicitly requested? | yes — vision says "files to eliminate: .agent/.../use.apikeys.sh" |
| minimum viable? | yes — delete is minimal |
| abstraction for future? | n/a |
| features "while we're here"? | n/a |
| premature optimization? | n/a |

**holds**: legacy pattern elimination is core requirement.

---

## component.5 = delete use.apikeys.json

| question | answer |
|----------|--------|
| explicitly requested? | yes — vision says "files to eliminate: .agent/.../use.apikeys.json" |
| minimum viable? | yes — delete is minimal |
| abstraction for future? | n/a |
| features "while we're here"? | n/a |
| premature optimization? | n/a |

**holds**: legacy config file elimination is core requirement.

---

## component.6 = integration test for prikey discovery

| question | answer |
|----------|--------|
| explicitly requested? | no — vision doesn't mention tests for prikey discovery |
| minimum viable? | no — manual verification is sufficient per vision |
| abstraction for future? | no |
| features "while we're here"? | **yes** — test not in vision scope |
| premature optimization? | no |

**YAGNI identified**: the blueprint includes an integration test for `~/.ssh/$owner` discovery. the vision doesn't request this.

**analysis**:
- the vision's manual verification table already covers this scenario:
  - "keyrack unlocked | npm run test:integration | tests run"
- the prikey discovery is tested implicitly when unlock works
- an explicit unit test for getAllAvailableIdentities adds scope

**decision**: prune the integration test from the blueprint. the behavior is verified via manual test + the extant unlock flow.

**fix applied**: remove integration test from blueprint test coverage section. update to:
- unit tests: none required
- integration tests: none required (prikey discovery tested via unlock flow)
- acceptance tests: none required
- manual verification: as specified

---

## component.7 = keyrack.yml (already pruned)

this was identified in the deletables review and removed from the blueprint.

**lesson learned**: keyrack.yml was added for configuration but the keys are hardcoded in jest.*.env.ts anyway. configuration file was unnecessary indirection.

---

## summary

| component | verdict |
|-----------|---------|
| getAllAvailableIdentities extension | holds — core requirement |
| jest.integration.env.ts changes | holds — core requirement |
| jest.acceptance.env.ts changes | holds — core requirement |
| delete use.apikeys.sh | holds — core requirement |
| delete use.apikeys.json | holds — core requirement |
| integration test | **pruned** — manual verification suffices |
| keyrack.yml | already pruned — unnecessary indirection |

**YAGNI fix applied**: pruned integration test for prikey discovery. the blueprint test coverage section was updated to remove this component.

---

## lesson learned

### when tests become YAGNI

the integration test for prikey discovery seemed like good practice — test the new code path. but it violates YAGNI principles:

1. **the vision already specified verification**: manual verification via `npm run test:integration` with keyrack unlocked proves the feature works end-to-end.

2. **the test adds scope without adding confidence**: if prikey discovery fails, the unlock command fails, which fails the manual verification. the additional test adds code to maintain without adding new information.

3. **coverage for coverage's sake is YAGNI**: writing tests because "we should have tests" is a feature addition. tests should be requested, not assumed.

### the discipline

when tempted to add tests for new code:
- check if the vision or criteria requested tests
- check if extant verification paths already cover the behavior
- if not explicitly requested and implicitly covered, it's YAGNI

### application to this blueprint

the blueprint now correctly has:
- unit tests: none required
- integration tests: none required
- acceptance tests: none required
- manual verification: as specified in vision

the behavior is proven by the manual verification table in the vision. no additional test infrastructure is needed.
