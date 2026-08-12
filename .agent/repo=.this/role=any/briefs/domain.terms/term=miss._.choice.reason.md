# domain.term.choice.reason: miss

## .etymology

from the cache sense — **hit** and **miss** are the two answers a lookup can give, and neither
is a fault. that pair is exactly what the domain needed: a word for "not there" that carries no
blame, so a reader does not reach for a log line or a retry on the normal path.

the word had been in this repo's prose for rounds. it became a **contract** word on 2026-08-04,
in `isKeyrackFillProbeMiss`.

### the rejected alternatives

| word | why rejected |
|------|--------------|
| `absent` | true but wider — it names any not-there, and drops the *expectation* that is the whole point. `absent` stays the plain-english word; `miss` is the asked-for kind |
| `notfound` | reads as an http status, and drags a client/server frame into a local vault read |
| `empty` | describes a container with no contents, not a read with no answer. a vault that holds an empty string is not a miss |
| `failure` / `error` | true of the *mechanism*, false of the *sense*. the probe did throw — but a throw the design expects and routes around is not a failure. to name it one invites a warn, a retry, or a log on the happy path |

## .evidence

### the invariant, in one line

> **a probe miss is data; a defect is not.**

that is the entire contract of `isKeyrackFillProbeMiss`, and the word `miss` is what makes it
statable at all. before the word, the same rule had to be written as a 15-line list of message
substrings — and it had already rotted:

```ts
// the shape that rotted: 'vault file absent' matched NO throw anywhere in src/
if (message.includes('vault file absent')) { /* treat as a miss */ }
```

a class-first predicate replaced it. **the term is what let the predicate have an honest name**
— `isKeyrackFillProbeMiss` says what it answers; a `isKeyrackFillErrorAllowed` would not.

### the dimensional split it draws

at one `catch` block, two axes cross:

| | the read answered "absent" | the read broke |
|---|---|---|
| **expected by design** | **miss** → carry on | (impossible) |
| **not expected** | (impossible) | **defect** → rethrow |

the diagonal is empty, which is why one word per corner suffices — and why a single vague word
(`error`) across both corners is exactly how the prior allowlist drifted.

## .disputes

none open.

## ⚠️ .the deferral this term retires — and the lesson in it

`miss` was **explicitly deferred** one round earlier, on 2026-08-04, with a reason that was
checkable and correct at the time:

> *"it does not qualify. `rule.require.domain-term-itemization` scopes a term to a word that
> composes a **declared** dobj or dop, and there is no `Miss` object and no `getMiss` operation
> — `miss` appears only in a test name and in prose."*

that reason **expired the moment `isKeyrackFillProbeMiss` was declared.** the deferral did not
expire with it; it sat in `progress.md` and read as settled.

this is the same shape as the vision's `q10`, whose conclusion ("`fill` sits outside reach
provision") was sound until `q8` pass 2 changed its input. and the same shape as the
`5.3.verification` credential excuse, which a reviewer corrected at i024 and which stayed on
the deferral list until it came back as a blocker at i026.

three times now, in one behavior:

> **a deferral is a claim with an expiry date, and the date is never written on it.** a
> *reasoned* deferral is more dangerous than a lazy one, because the reason reads as evidence
> long after the fact it rested on has moved.

the practice that follows: when a round declares a new dobj/dop, **re-read the deferral list
against the new declarations** before the round's entry is written. the deferral list is not a
backlog to append to — it is a set of live claims to re-check.
