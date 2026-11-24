# F31 — the sso portal boundary is proven live, never in ci

## .the fork

5.3 i001 r002, r003, r004 and r009 each block on one point: the renew's success path, from real portal creds to a real renewed role, has no committed test. the integration and acceptance renew suites put a mock aws cli on `PATH` and set `AWS_SDK_MOCK`.

- **a** — commit a real-sso renew case, gated on a keyrack credential, which fails loud when the credential is absent
- **b** — mark the aws sso portal boundary as a vision-level mock exception (`rule.require.external-contract-integration-tests` `.note`), cite it inline at each mock seam (`.mock / .why / .real`), and keep the real proof where it can run: the live two-expiry proof, plus the real-cli absent-session suite

## .taken

b, inline now; the vision line awaits the wisher. an sso portal session exists only after a human finishes a browser login, and it ends within hours. ci authenticates by oidc (`.github/workflows/test.yml`, `creds-aws-role-arn`), which yields role creds and never a portal session. so (a) is red in every ci run, and a gate that is always red stops to grade. the renew acceptance journey also has to end and restore the portal at will (lapse, cure, lapse behind a halt), which no real portal permits.

what is real today:
- `getOneAwsSsoSessionProof.integration.test.ts` drives the real aws cli and sdk through the absent-session case
- the 5.1 yield's live proof: a real portal and a real role past two expiries, `renewedCount: 2`, no hand unlock

## .rework

clean: one line in the vision's exceptions, and three inline doc blocks (already landed in `daemonSsoRenew.integration.test.ts` and `keyrack.status.renew.acceptance.test.ts`).

## .confidence — 80%, why not higher

the rule names the exception's home as the vision, and the vision is the wisher's to amend. the inline blocks cite the exception, but the vision line is not yet written.

## .where

- `src/domain.operations/keyrack/daemon/daemonSsoRenew.integration.test.ts`
- `blackbox/cli/keyrack.status.renew.acceptance.test.ts`
- `1.vision.yield.md` (the exception line, owed to the wisher)

## .verdict

open — to the commander at the pr: approve the vision exception, or name a host that holds a portal session for a gated case.
