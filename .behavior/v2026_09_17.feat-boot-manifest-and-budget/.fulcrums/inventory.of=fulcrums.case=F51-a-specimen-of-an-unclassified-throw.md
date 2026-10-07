# F51 — a specimen that must raise an UNCLASSIFIED error: a bare `Error`, or a classified leaf?

- **raised** = 2026-09-28, at `5.1.execution.from_vision`, `review.peer i006` — `repo-rules`
  blocker.1 and `arch-opport-decomposition` blocker.1
- **rework** = clean
- **status** = OPEN — **bare `Error`**
- **confidence** = **93%**

## .the fork, stated fairly

`src/.test/example.use.repo/example.rhachet.use.plainThrow.ts` throws `new Error(...)`.
`rule.forbid.helpful-error-parents` forbids a bare `Error` and asks for a classified leaf.

| | **bare `Error`** (taken) | **a `ConstraintError` / `MalfunctionError` leaf** |
|---|---|---|
| what the specimen raises | an error the cli cannot classify | an error the cli classifies |
| what `invoke.unclassifiedThrow` `[case1]` proves | the unclassified exit path | 🔴 naught — that path never runs |

## .the call, and why

**bare `Error`.** the specimen's whole purpose is the one class the rule forbids elsewhere. a leaf
would make the test pass on the classified path and leave the unclassified path unproven. the
carve-out is named in the file's own `.note`, so a reader of the file meets the reason at the site.

## .why the confidence is 93%

the one open question is whether the rule should state this carve-out in its own text. that is a
rule edit, not a code edit, and the code is correct either way.

## .rework

clean — swap the throw for a leaf and delete the test case it would no longer prove.
