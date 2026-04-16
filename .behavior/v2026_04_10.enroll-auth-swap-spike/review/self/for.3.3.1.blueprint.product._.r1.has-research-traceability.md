# self-review r1: has-research-traceability

## the question

did we leverage research recommendations or explicitly omit them with rationale?

---

## issue found

### issue 1: BrainAuthAdapterDao lacked findsert method

**prior state**: BrainAuthAdapterDao.set only had `upsert` method
**reference**: BrainHooksAdapterDao.set has `{ findsert, upsert }`
**fix**: added `findsert` to BrainAuthAdapterDao.set in both vision and blueprint
**why this matters**: architectural symmetry ensures adapter contracts are consistent across the codebase

---

## why it holds: external research (claude-cli)

traced 3.1.1.research.external.product.claude-cli._.yield.md recommendations:

| # | recommendation | blueprint location | why it holds |
|---|---------------|-------------------|--------------|
| 1 | apiKeyHelper for dynamic tokens | genApiKeyHelperCommand.ts | core mechanism for token rotation; blueprint explicitly generates command string |
| 2 | 5-min TTL, 401 trigger | notes section | documents latency tradeoff; user can tune via env var |
| 3 | 429 rate limit code | research blockers resolved | clarifies that 429 fails immediately, rotation on next apiKeyHelper call |
| 4 | CLAUDE_CODE_API_KEY_HELPER_TTL_MS | notes section | env var to tune rotation latency documented |
| 5 | claude setup-token for 1-year OAuth | token generation section | documented how to generate long-lived tokens |

**all 5 external research recommendations leveraged.**

---

## why it holds: internal research (prod code)

traced 3.1.3.research.internal.product.code.prod._.yield.md recommendations:

| # | recommendation | blueprint location | why it holds |
|---|---------------|-------------------|--------------|
| 1 | BrainHooksAdapter pattern | BrainAuthAdapter.ts | blueprint mirrors pattern with { slug, dao, capacity } |
| 2 | dao + adapter separation | BrainAuthAdapterDao + BrainAuthCapacityDao | two DAO interfaces, same pattern as BrainHooksAdapterDao |
| 3 | inversion of control | adapter contract | brain suppliers implement adapters, rhachet consumes them |
| 4 | input-context pattern | all operations | every signature follows `(input, context?)` |
| 5 | DomainLiteral for value objects | BrainAuthCapacity | `extends DomainLiteral<BrainAuthCapacity>` declared |
| 6 | transformer name pattern | asBrainAuthSpecShape, asBrainAuthTokenSlugs | follows as* pattern for parse/cast operations |
| 7 | orchestrator composition | getOneBrainAuthCredentialBySpec | composes transformers + adapter calls, reads as narrative |
| 8 | CLI contract pattern | invokeBrainsAuth.ts | mirrors extant invokeEnroll, invokeKeyrack patterns |
| 9 | SDK extension pattern | scope decisions | **omitted: deferred to post-spike** - CLI sufficient for POC |

**8 leveraged, 1 explicitly omitted with rationale.**

---

## why it holds: internal research (test code)

traced 3.1.3.research.internal.product.code.test._.yield.md recommendations:

| # | recommendation | blueprint location | why it holds |
|---|---------------|-------------------|--------------|
| 1 | unit tests for transformers | test tree | asBrainAuthSpecShape.test.ts, asBrainAuthTokenSlugs.test.ts declared |
| 2 | integration tests for orchestrators | test tree | getOneBrainAuthCredentialBySpec.integration.test.ts declared |
| 3 | acceptance tests for contracts | test tree | brains-auth.get.acceptance.test.ts declared |
| 4 | test-fns given/when/then | test tree | pattern used in test declarations |
| 5 | useBeforeAll for fixtures | test infrastructure | noted fixture requirement with pre-configured tokens |
| 6 | snapshot for CLI output | acceptance tests | declares snapshots for success and exhaustion outputs |
| 7 | isolated HOME pattern | test infrastructure | noted reuse of daemon cleanup and isolated HOME from keyrack |

**all 7 internal test research recommendations leveraged.**

---

## summary

- **21 recommendations** total from 3 research artifacts
- **20 leveraged** in blueprint with clear traceability
- **1 explicitly omitted** (SDK extension) with documented rationale: "deferred to post-spike"
- **1 issue found and fixed**: added `findsert` to BrainAuthAdapterDao for architectural symmetry

**result**: research traceability verified. no silent omissions.