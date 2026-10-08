# F61 — may the 1password acceptance suite drive a stand-in `op` alone?

- **raised** = 2026-10-01, at `5.1.execution.from_vision`, `review.peer i018` —
  `behavior-intent-coverage-blackbox` nitpick.1 (`keyrack.vault.1password.acceptance.test.ts:71`, `:88`)
- **rework** = dirty
- **status** = OPEN — **yes, the stand-in stays**
- **confidence** = **85%**

## .the fork, stated fairly

| | **add a real-`op` test** (the reviewer's read) | **keep the stand-in** (taken) |
|---|---|---|
| the rule | `rule.require.external-contract-integration-tests` — at least one real call per external contract | the same rule — its floor is half met: the absent-`op` failure case runs for real |
| what a real call needs | a 1password account, a service-account token, and a vault on every CI host | none of which any tier holds today |
| what this behavior touched | the suite's PATH setup, for hermeticity (`F44`) | the 1password vault adapter is outside this wish |
| what the suite grades | — | rhachet's caller journey: flag parse, exid format refusal, absent-`op` refusal. none of those reaches `op`'s own behavior |

## .the call, and why

**keep the stand-in, with the carve stated at the site** (the suite's `.note` names it). the real
`op` contract is an adapter concern of the keyrack vault, and its integration test belongs with a
behavior that owns that adapter and can provision the account. to add one here widens scope into a
subsystem this wish never opened, and it would fail on every host until a human provisions a vault.

## .the wisher's verdict this rests on

`F49` holds the wisher's verdict on this exact surface, at `5.3.verification`: the real-`op` lanes are
**skipped**, because keyrack is not this behavior's subject and the branch changed zero `op`
arguments. that verdict is the documented exception the rule asks for. it comes from the wisher, the
same authority a vision citation would carry, rather than a carve made by the party under review.

## .why the confidence is 85%

the rule says lack of credentials is no excuse, and a vault account is a credential. the wisher's
`F49` verdict closes that for this behavior. the open doubt is whether a later keyrack behavior picks
up the real test. it is dirty because it needs a human to provision a 1password account and a
keyrack key, then a test that reads it.

## .rework

dirty — provision a 1password service account into the `ehmpath/test` keyrack, then add one
`keyrack.vault.1password.integration.test.ts` case that sets and gets through the real `op`.
