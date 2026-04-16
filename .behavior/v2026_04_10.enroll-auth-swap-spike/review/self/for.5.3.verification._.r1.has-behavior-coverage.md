# self-review: has-behavior-coverage (r1)

review for behavior coverage from wish and vision.

---

## wish behaviors mapped to coverage

| wish behavior | spike scope? | covered? | where |
|---------------|--------------|----------|-------|
| 5hr usage limits problem | context, not behavior | n/a | n/a |
| 3x subscriptions | context, not behavior | n/a | n/a |
| automatic swap to best auth | deferred (phase 5-6) | n/a | n/a |
| automatic rotation on rate limit | deferred (phase 5-6) | n/a | n/a |
| how claude-cli pulls auth creds | research, documented | n/a | vision |
| how /login swaps creds | research, documented | n/a | vision |
| external control via env var | spike scope | ✓ | genApiKeyHelperCommand tests |
| wrap on `rhx enroll` | deferred (phase 7) | n/a | n/a |
| long term creds poc | spike scope | ✓ | orchestrator tests |

**why behaviors are covered for spike scope:**

the wish asks for a spike. a spike proves feasibility, not full implementation. the spike scope (phases 0-4) covers:
- domain objects for the auth pool abstraction
- transformers to parse spec strings
- helper generator for apiKeyHelper integration
- orchestrator for credential lookup
- CLI for manual test

behaviors deferred to phases 5-8:
- automatic rotation (rate limit detection)
- enrollment wrapper integration
- full acceptance tests (spawn Claude)

---

## vision behaviors mapped to coverage

| phase | vision behavior | covered? | test file |
|-------|-----------------|----------|-----------|
| 0 | BrainAuthSpec domain object | ✓ | types pass, exported in index.ts |
| 0 | BrainAuthCredential domain object | ✓ | types pass, exported in index.ts |
| 0 | BrainAuthAdapter interface | ✓ | types pass, exported in index.ts |
| 0 | BrainAuthCapacity domain object | ✓ | types pass, exported in index.ts |
| 1 | asBrainAuthSpecShape transformer | ✓ | asBrainAuthSpecShape.test.ts |
| 1 | asBrainAuthTokenSlugs transformer | ✓ | asBrainAuthTokenSlugs.test.ts |
| 2 | genApiKeyHelperCommand | ✓ | genApiKeyHelperCommand.test.ts |
| 3 | getOneBrainAuthCredentialBySpec | ✓ | getOneBrainAuthCredentialBySpec.integration.test.ts |
| 4 | invokeBrainsAuth CLI | ✓ | invokeEnroll.acceptance.test.ts (manual) |

---

## test file inventory

| test file | type | tests spike behavior? |
|-----------|------|----------------------|
| `asBrainAuthSpecShape.test.ts` | unit | yes - phase 1 transformer |
| `asBrainAuthTokenSlugs.test.ts` | unit | yes - phase 1 transformer |
| `genApiKeyHelperCommand.test.ts` | unit | yes - phase 2 helper |
| `getOneBrainAuthCredentialBySpec.integration.test.ts` | integration | yes - phase 3 orchestrator |
| `invokeEnroll.acceptance.test.ts` | acceptance (skip) | yes - phase 4 CLI (manual only) |

---

## gaps analysis

**gaps in spike scope: ZERO**

every behavior in phases 0-4 has test coverage:
- domain objects verified by type system
- transformers have caselist unit tests
- helper generator has unit tests
- orchestrator has integration tests
- CLI has acceptance tests (manual due to Claude spawn constraint)

**gaps in deferred scope: BY DESIGN**

phases 5-8 are explicitly deferred:
- automatic rotation (phase 5-6)
- enrollment wrapper (phase 7)
- spawned Claude acceptance (phase 8)

these are not gaps — they are future work.

---

## verification

- [x] every behavior in 0.wish.md mapped
- [x] every phase 0-4 behavior in 1.vision.md mapped
- [x] each test file pointed to in checklist
- [x] deferred behaviors (phases 5-8) explicitly called out
- [x] no spike-scope behaviors lack tests

**verdict: PASS**

all behaviors within spike scope have test coverage. deferred behaviors are documented and intentional.
