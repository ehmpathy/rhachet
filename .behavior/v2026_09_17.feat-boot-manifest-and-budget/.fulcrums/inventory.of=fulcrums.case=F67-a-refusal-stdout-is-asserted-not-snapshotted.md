# F67 — must each refusal case snapshot its stdout, beside its stderr?

- **raised** = 2026-10-02, at `5.1.execution.from_vision`, `review.peer i035` —
  `enroll-impl-behavior-intent` nitpick 2 (`blackbox/cli/roles.boot.manifest.acceptance.test.ts`,
  the refusal cases)
- **rework** = clean
- **status** = OPEN — **no, an assertion serves**
- **confidence** = **80%**

## .the fork, stated fairly

| | **snapshot stdout too** (the reviewer's read) | **assert it carries no corpus** (taken) |
|---|---|---|
| the ask | the wish's requirement 6 names a snapshot of "both stdouts" on each refusal surface | the same requirement, read for its purpose: a reviewer can see what a refusal emits |
| what each case asserts | — | `expect(result.stdout).not.toContain('<brief.say')` — no corpus reached the brain |
| what a stdout snapshot would hold | an empty string, or the same `<stats>`-free shell on every case | — |
| what it costs | one more snapshot per refusal case, all near-identical | none |

## .the call, and why

**keep the assertion.** on a refusal the property that matters is that no corpus leaked to the
brain, and the assertion checks that exactly. a snapshot of a stdout that is empty by contract adds
files a reviewer must scan and no signal. the stderr snapshot, where the refusal speaks, is present
on every case. the vision catalog already records requirement 6 as understated on this point
(`1.vision.experience.case=_.md`).

## .why the confidence is 80%

requirement 6 says "both stdouts" in words. a wisher may read it literally.

## .rework

clean — add `expect(asSnapshotSafe(result.stdout)).toMatchSnapshot('stdout-…')` beside each
refusal case's stderr snapshot, then resnap that one file.
