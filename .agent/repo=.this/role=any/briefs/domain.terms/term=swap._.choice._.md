# domain.term: swap

term.chosen   = swap
term.kind     = noun
term.synonyms.forbidden:
- stand-in
- emulator
- local backend
- test double

## .what

**a test arrangement where only the REMOTE SERVICE is replaced, and the entire client stack still
runs verbatim.**

a swap points real client code at a different address. the sdk still serializes, still signs, still
opens a socket, still parses the response and maps its errors. only the thing at the far end of the
wire is local.

## .the boundary that earns the word — swap vs mock

these are **not synonyms**. they are the two halves of one axis, and the line between them decides
whether `rule.forbid.acceptance.mocks` is violated:

| | **swap** | **mock** |
|---|---|---|
| what is replaced | the remote SERVICE | the CLIENT, tool, or module |
| client code that runs | all of it | none |
| catches a wire-shape change? | ✅ serialization, signing, error mapping all real | ❌ no client code executes |
| forbidden in an acceptance test? | no | yes, absent a documented exception |

⇒ **the test: after the substitution, does any of the real client stack still execute?**
yes → swap. no → mock.

## .the two worked cases, one of each

both live in this repo's keyrack acceptance tier, and a peer review round graded them alike until
the distinction was named:

| | `keyrack.vault.awsParams` | `keyrack.vault.githubSecrets` |
|---|---|---|
| substitution | `KEYRACK_AWS_SSM_ENDPOINT` → a local http server | `MOCK_GH_CLI_DIR` first on `PATH` |
| what still runs | the real `@aws-sdk/client-ssm` — serialize, SigV4-sign, POST | none; the `gh` BINARY itself is replaced |
| verdict | **swap** | **mock** |

⚠️ the second carries no real-dependency backstop at any tier, so it is a mock with a documented
gap rather than an exception (`.dream/2026_09_04.keyrack-github-real-integration-coverage.dream.md`).

## .why a swap is not merely a nicer mock

a swap keeps the **failure modes** a mock deletes. the sdk's retry policy, its credential chain, its
error-to-exception mapping, and its wire encoding are all under test. that is why a swap can sit in
an acceptance tier without an exception: it is the same category as a testcontainer or a local
postgres, and it is the category `rule.forbid.acceptance.mocks` was never aimed at.

⚠️ what a swap does NOT prove is the **wire hop** — the far-end service's own shape. that gap is
real, and it belongs to a tier that dials the real service, never to the swap.

## .refs

- `blackbox/cli/keyrack.vault.awsParams.acceptance.test.ts` — `.backend` (the argument), `.gap`
  (what a swap cannot prove), `.gap.bound` (the four suites that dial real SSM)
- `blackbox/.test/infra/genFakeSsmServerDetached.ts` — the swap's far end
- `src/domain.operations/keyrack/adapters/vaults/aws.params/getOneKeyrackAwsParam.emulator.integration.test.ts`
  — clamps the swap SEAM itself, so an sdk bump that drops the override cannot silently dial real aws

## .reason

see the ref-level cluster beside this choice:
- `term=swap._.choice.reason.md` — etymology, disputes, evidence

## .see also

- `term=clamp._.choice._.md` — what pins a swap's seam
- `term=scope._.choice._.md` — the tier a swap belongs to
