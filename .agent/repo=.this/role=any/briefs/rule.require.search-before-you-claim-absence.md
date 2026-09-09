# rule.require.search-before-you-claim-absence

## .what

a sentence of the form **"no X does Y"** — *no test dials real ssm*, *no caller uses this flag*,
*there is no narrow fix* — is a claim about an entire search space. do not write one until a
repo-wide search has backed it, and state the search that backs it.

this holds for a claim you **receive** and for a claim you **write**. the second is the one that
gets skipped.

## .why

an absence claim is uniquely expensive because it cannot be disproved by the reader who trusts it,
only by the reader who re-searches. so it propagates:

- written into a code comment, it is quoted back as evidence by everyone downstream
- written into a review, it converts a search into a verdict
- written into an escalation, it spends a human's attention on a provision that is already there

and it is uniquely cheap to check. one grep decides it. the asymmetry between the cost of the check
and the cost of the error is the whole argument.

⚠️ the failure mode is not laziness — it is **scope slippage**. the honest thought is usually
*"no row in THIS file does Y"*, and the sentence that gets written drops the *in this file*. the
claim silently widens from a survey of one file to a survey of the repo, and the author never
notices, because they know what they meant.

## .the two directions, one bar

| direction | the claim | the check |
|---|---|---|
| received | a reviewer's *"these are the only N call sites"* | re-run the search; N is a claim about their sample |
| **written** | your own *"no test covers this"* | **the same search, before you write it** |

hold the bar you hold a reviewer to. an absence claim you author is not privileged by being yours.

## .the tells

reach for a search when a sentence carries any of:

- `no <thing> does …` / `there is no …` / `not one …`
- `the only way is …` / `these are the only N …`
- `none of <set> covers …` / `<X> is uncovered`
- a **concession** to someone else's absence claim — the moment you agree, you have adopted it

⚠️ a concession is the sharpest tell. to agree with *"no test covers X"* is to assert it, and it
inherits the same burden of search — a reviewer's citation does not discharge it.

## .the contradiction check

before an absence claim ships, read the lines **immediately around it**. an absence claim that is
false very often contradicts a sentence already on the same screen — a `.scope` line, a sibling
`.note`, an import. the cheapest search is the one already in view.

## .how to write one that survives

bound it, then make it checkable in one command:

```
👎  no repo test dials real ssm today
👍  no row in THIS suite dials real ssm; four integration suites do —
    getOneKeyrackAwsParam, delKeyrackAwsParam, vaultAdapterAwsParams,
    setKeyrackAwsParamGithubApp (each passes `endpoint: null`)
```

the second names its scope, names the counterexamples, and hands the reader the grep. the first
asks to be believed.

## ⚠️ the rule binds HARDEST inside an escalation

an escalation converts your claim into **someone else's premise**. the human does not re-derive it;
they decide on it. and the reviewer who would normally catch it has been routed around by design —
that is what an escalation *is*.

so the one place a claim gets the least scrutiny is the place it does the most work. **verify an
absence claim before you escalate on it, even if you verified it nowhere else.**

⚠️ the aggravated form is an absence claim about **cost**: *"the only fix is expensive"*, *"no cheap
seam exists"*. it reads as a judgment call rather than as a search-space claim, so it slips the
tells above — but it is the same sentence with a price attached, and it decides the verdict.

⇒ **check the direction your error runs.** an error that makes the reviewer's fix look *more*
expensive biases the human toward the answer you already preferred. that is the worst direction for
a wrong premise in an escalation, and it is the direction a motivated argument naturally takes. if
your estimate happens to favor your own position, that is the estimate to go verify.

⚠️ **and the correction is not immune.** the same drive then over-corrected: it called the fix "two
env vars", which was as ungrounded as the "day of work" it replaced — and it now favored the
*reviewer's* side. the number was wrong twice, in opposite directions, and each time it matched
whichever position was under argument.

⇒ so the tell is not the direction; it is that **the estimate moved with the argument at all.** an
estimate that tracks your audience is not an estimate. the cure is not more care — it is to
**replace the judgment with quoted command output**, so the reader checks the evidence rather than
your disposition.

## .the incidents this rule is drawn from

| the claim | what was true | what it cost |
|---|---|---|
| *"the only cure is a repo-wide masker change"* | the capture-side helper already stripped the bytes, and the author's own diff held a snapshot that proved it | one wrong refute of a valid blocker |
| *"no repo test dials real ssm today"* | four pre-branch integration suites dial real ssm; the sentence contradicted a `.scope` line six lines above it | a foreman escalation for a provision that already existed |
| *"the seam is cross-vault — a day of work across two vaults"* (**inside an escalation**) | the vault shells to the `gh` binary; `gh` honors `GH_HOST` + `SSL_CERT_FILE`, so most rows swap with **zero prod change**. only one row touches the shared adapter | a foreman decision filed on an inflated price, in the direction that favored the author |
| *"…so it is just two env vars and a local HTTPS fake"* (**the correction to the row above**) | `gh` refuses a scheme in `GH_HOST` and ignores `GITHUB_API_URL`, so the fake needs real TLS; `gh secret set` also encrypts via libsodium — and the repo has **neither dependency** | nearly a second wrong premise, this one biased toward the reviewer |

all four were minutes from disproof. all four were authored, not received. rows 3 and 4 were caught
only because the escalation was re-read before the verdict landed — and row 4 is the reminder that
**the re-read has to survive your own correction**, not just your original claim.

## ⚠️ a search that CAN find is the precondition — control your tool before you trust its zero

a search you ran is not the same as a search that worked. a tool can return `0 matches` because
the fact is absent, **or** because the query never reached the corpus — and those two are
indistinguishable in the output. so a bare zero is not evidence of absence; it is evidence of
either absence or a broken query, and the rule cannot be satisfied by the ambiguous one.

⇒ **before a zero becomes a claim, run a control: search for a fact you KNOW is present, with the
same tool and the same flags.** if the control also returns zero, the tool is what you found, not
the fact.

### the incident that earned this clause — 2026-09-05

`rhx grepsafe --pattern 'ConstraintError' --glob '**/*.snap'` → **0 matches**, on a repo with
**31 occurrences across 10 files**. the same tool, same pattern, with `--glob '*.snap'` → matches
correctly and recursively. so `**/` silently matched no file at all, rather than every file:

| invocation | result | truth |
|---|---|---|
| `grepsafe --pattern 'ConstraintError' --glob '**/*.snap'` | `0 matches` | ❌ false negative |
| `grepsafe --pattern 'ConstraintError' --glob '*.snap'` | matches, recursive | ✅ |
| the `Grep` tool, `glob: '**/*.snap'` | 31 across 10 files | ✅ |

⚠️ **a conclusion was drawn from that zero and then written down** — *"0 `✋ blocked:` remain
repo-wide"* — and the same zero nearly certified that a renderer change touched no acceptance
snapshot. both turned out TRUE, confirmed afterward with a second tool. that is luck, not method:
the evidence offered was worthless either way.

### why the false negative is the dangerous direction

a false POSITIVE announces itself — you open the file and the match is not there. a false NEGATIVE
is **silent, and it agrees with whatever you hoped**: you set out to show a thing is absent, and
the tool concurs. it produces exactly the sentence this rule exists to forbid, with a command to
cite behind it — which reads as rigor.

⇒ so what must be cited is a search **proven able to find**, never merely a search run.

## .enforcement

- an absence claim in a comment, yield, review, or escalation with no search behind it = **blocker**
- an absence claim that rests on a `0 matches` with **no control** proving the query can find a
  known-present fact = **blocker** — an uncontrolled zero is not evidence
- an absence claim whose scope is unbounded (*"no test"* rather than *"no row here"*) = **blocker**
- a concession to another party's absence claim, with no independent search = **blocker**

## .see also

- `rule.require.trust-but-verify` — the parent discipline; this is its absence-claim case
- `rule.forbid.mechanism-inferred-from-outcome` — the peer case, with the **opposite** counter-move:
  an absence claim is cured by a **wider** search, a mechanism claim by a **narrower** read. keep
  the two apart, or the merged lesson teaches the wrong reflex
- `rule.require.check-the-precondition-before-you-escalate` — the sibling that guards escalations
- `rule.require.solve-at-cause` — a false absence claim is fixed at the sentence, not at the reader
- `rule.always.trust-the-self-review-process` — where a self-authored claim gets its second look
