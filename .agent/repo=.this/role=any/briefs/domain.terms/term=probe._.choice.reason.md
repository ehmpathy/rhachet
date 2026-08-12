# domain.term.choice.reason: probe

## .etymology

from the instrument sense — a probe is sent out to **learn what is there**, and it returns
useful knowledge whether or not it finds a thing. that is exactly the read `fill` performs
before a set: an absent value is not a failed probe, it is a probe that answered.

the word arrived 2026-08-04 with `isKeyrackFillProbeMiss`, cut from a 15-line message-text
allowlist that four independent reviewers converged on in one round.

### the rejected alternatives

| word | why rejected |
|------|--------------|
| `check` | the repo's most overloaded verb — a lint check, a type check, a permission check. one more sense would make it useless as a signal |
| `peek` | implies a read that must not disturb, which is a *guarantee* rather than an *intent*. the probe's point is the expected-absence, not the non-disturbance |
| `lookup` | already means "find the value for a key, and it should be there" — the exact opposite expectation |
| `test` | collides head-on with the test suite. a `ProbeMiss` and a `TestMiss` would read as the same kind of noun and are not |
| `attempt` | names that a try happened, never that its failure was expected. `attemptGrantKey` already uses it in that ordinary sense |

## .evidence

### the scenario timeline that surfaced it

```
fill walks a declared key
  ├─ probe the vault  → hit?  skip, converge, done
  │                    → miss? carry on
  ├─ probe the daemon → hit?  skip
  │                    → miss? carry on
  └─ set the key
```

the two probes bracket the set. each one's **miss is the path forward**, which is what makes
them probes rather than gets.

### the defect that proved the concept needed a name

before this round, the probe's catch allowlisted by **message text**:

```ts
// the shape that rotted
if (message.includes('vault file absent')) { /* treat as miss */ }
```

`'vault file absent'` matched **no throw anywhere in `src/`**. the rot the reviewers predicted
had already happened, silently. the cure was to answer by **class** — and the moment the answer
became a named predicate, the predicate needed a name for the *question it answers*. that
question is "was this a probe miss?", and it has no other name in the domain.

so `probe` is not vocabulary invented at the keyboard. it is the word the domain was already
using without a label, which is why a text allowlist could drift for rounds without a reader
who noticed what it had lost.

### the invariant it carries

> **a probe miss is data; anything else is a defect.**

that single sentence is the whole contract of `isKeyrackFillProbeMiss`, and it is checkable:
a probe's catch may swallow a miss and must rethrow everything else
(`rule.forbid.failhide`). the term is what makes the invariant statable in one line.

## .disputes

none open. `probe` was coined and adopted in the same round, with no synonym reached for in any
contract.

⚠️ **one deferral it retires.** `miss` was deferred in the round of 2026-08-04 with a checkable
reason: *"there is no `Miss` object and no `getMiss` operation — `miss` appears only in a test
name and in prose."* that reason was correct then and **expired here**, because
`isKeyrackFillProbeMiss` is a declared dop whose name carries both words. see
`term=miss._.choice.reason.md` for the note on why an expired reason is the deferral most at
risk of outliving its own truth.
