# rule.require.check-the-precondition-before-you-escalate

## .what

before you escalate that a thing is unreachable, **check the precondition your escalation rests
on.** two incidents, one shape:

| # | the halt | the precondition I skipped |
|---|---|---|
| 1 | a test run stops on a credential prompt | *does the code under test read that credential?* |
| 2 | a reviewer blocks on a rule I judged unsatisfiable | *what does the rule say satisfies it?* |

a halt raised by a runner's blanket precondition is not a blocker on the work — it is a blocker
on the runner, and it is yours to route around. and a rule you cannot satisfy **as you remember
it** may be trivially satisfiable **as written**.

## .why

`rhx git.repo.test --what acceptance` unlocks the whole `test` env as a precondition for
**any** acceptance shard, whatever that shard consults. one of those keys is
`ehmpathy.test.AWS_PROFILE`, an aws-sso key whose refresh needs a browser login. when the sso
window has expired, the run halts **before a single test executes** — with a render that
reads like a hard credential wall:

```
✋ some keys were not granted, yet are strictly required
   └─ ask a human to set the keys, then try again
```

that render is honest about the unlock and silent about the scope. it does not say *"the
tests you asked for need none of this."*

**this cost two full escalations on one branch.** the acceptance rows under test spawned the
cli against temp dirs and touched no aws at all. the wall was one layer above them.

## .the routes

| runner | precondition | when to reach for it |
|---|---|---|
| `rhx git.repo.test --what acceptance` | unlocks the whole `test` env | the shard genuinely reads a credential |
| `npm run test:acceptance -- <pattern>` | none — jest direct | the shard needs no credential |

⚠️ **integration is different.** `npm run test:integration` still needs the keys —
`jest.integration.env.ts` sources every one strictly at setup — so there is no bypass there,
and a genuine sso expiry IS a human escalation for that shard.

## incident 2 — a rule's exception clause, argued against three times unread

`rule.forbid.acceptance.mocks` blocked a vault suite for three review rounds. its exception needs
a `.real` pointer to a real-dependency test. I judged that unreachable (a credentialed ci lane is
a repo-admin act), conceded the letter each round, and escalated to the foreman.

**the rule's own worked example resolves `.real` like this:**

```
.real = manual acceptance test run quarterly with test card
        documented in docs/acceptance-tests.md
```

⚠️ **that is not an automated test — it is a documented manual run.** the cure was landable the
whole time, in a paragraph I had skimmed. three review rounds and one foreman escalation were
spent on it. the fix took under an hour once read: a procedure that dials the real service,
asserts each shape the stand-in serves, and is proven to bite in both directions.

⇒ **the escalation's precondition was never checked.** to say *"this rule cannot be satisfied"*
is a claim about the rule's text, and it is cheap to verify against the text.

## incident 3 — ⚠️ THE SAME HALT, ESCALATED AGAIN, BY THE AUTHOR OF THIS RULE

**incident 1 above IS `ehmpathy.test.AWS_PROFILE`.** it is named at `:20`, its render is quoted at
`:25-28`, and the route around it is tabled at `:41`. this file was written from that incident.

then, on the next stone of the same branch, the same halt appeared and **I escalated it a third
time** — three unlock attempts, a daemon status check, a re-check after a precondition change, and
a foreman escalation. not one of those probes asked the question at `:74`.

what closed it took one command:

```sh
npm run test:acceptance:locally -- 'keyrack\.vault\.awsParams\.acceptance'
#  → 38 passed / 38 total, zero AWS credentials
```

the aws.params suites drive the real client stack against a **local SSM stand-in**
(`genFakeSsmServerDetached.ts`). ci does not unlock that key either — it assumes an oidc role via
`aws-actions/configure-aws-credentials`. **no code in the tier ever wanted the credential.**

⇒ **a rule you wrote does not fire on its own.** the halt renders identically each time, and each
time it *looks like* a wall. the recall must be keyed to the **symptom**, never to the lesson: when
a credential prompt stops a test run, this file is the first artifact to open.

⚠️ and the failure is worse than a skipped probe — it is an **inference from an outcome to a
mechanism** (`rule.forbid.mechanism-inferred-from-outcome`). *"the gate faulted"* and *"the tier
needs this credential"* are different propositions. I never separated them, three times.

## .the test

before you escalate a halt, answer the one question its class asks:

| the halt | the question |
|---|---|
| a credential prompt | does the code under test read this credential? |
| a rule you judge unsatisfiable | what does the rule's own exception clause accept? |
| any *"only a human can do this"* claim | which command would show that, and have I run it? |

- **checked, and it holds** → escalate, and name the exact fix (`rule.require.errors-name-the-fix`)
- **checked, and it does not** → the halt is yours to route around. do the work
- **unchecked** → you have not earned the escalation yet

## .the deeper rule

this is `rule.always.diagnose-reviewer-malfunctions` applied to a test runner: a halt is a
symptom, and the escalation you owe a human is the **cause**, never the symptom. an escalation
that names a credential the code never wanted spends the scarcest resource in the loop on a
diagnosis you could have done.

## .enforcement

- an escalation on a credential the code under test never reads = **blocker**
- an escalation that a rule cannot be satisfied, filed without a read of the rule's own
  exception clause = **blocker**
- an *"only a foreman can do this"* claim whose precondition is checkable by one command that was
  never run = **blocker**
- a progress report that records a precondition halt as a passed gate = **blocker**
  (`rule.forbid.failhide`, applied to the report rather than the code)

## .see also

- `howto.run-jest-tiers-locally.[lesson].md` — the tiers and their runners
- `rule.always.spend-own-levers-before-escalation.md` — the general form
- `rule.forbid.faked-or-quarantined-acceptance.md` — what you must NOT do instead
