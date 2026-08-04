# howto: source AWS creds from keyrack (and never escalate `aws sso login`)

## .what

how to obtain a live AWS identity in this repo, sourced from keyrack — for shell skills, and for the AWS SDK under jest.

## .why

an expired AWS SSO session is NOT a human wall. `rhx keyrack unlock --owner ehmpath --env <env>` re-vends the session (the aws.config vault adapter refreshes the SSO token on unlock). it ALWAYS fixes an expired-session error — do NOT surface `aws sso login` as a blocker for the human.

the proof is already in the repo: `aws.whoami` (`.agent/repo=.this/role=any/skills/aws.whoami.sh`) unlocks, exports the profile, and runs `sts get-caller-identity`.

## the shell pattern

`keyrack unlock` runs in a subprocess, so its env does NOT propagate back — you must `get` the profile explicitly and export it:

```bash
rhx keyrack unlock --owner ehmpath --env "$ENV"
export AWS_PROFILE=$(rhx keyrack get --owner ehmpath --env "$ENV" --key AWS_PROFILE --value)
aws sts get-caller-identity   # works
```

- `keyrack source --lenient` alone leaves a STALE profile — it does not re-vend. use the unlock + explicit `get` above.
- region is NOT ambient for AWS SDK v3 — supply `AWS_REGION` (or a `--region` flag) explicitly.

## the AWS-SDK-under-jest gotcha

the AWS SDK v3, given an SSO profile, lazily `import()`s its SSO credential provider — which jest's default (non-vm-modules) runtime rejects:

```
TypeError: A dynamic import callback was invoked without --experimental-vm-modules
```

this is why the extant `aws.config` tests shell out to the `aws` CLI instead of the SDK. for a test that DRIVES the SDK, export the SSO session to STATIC env creds first so the SDK uses the synchronous env provider.

the canonical way is the shared `useKeyrack` test util (`src/.test/infra/useKeyrack.ts`), which mirrors the `useKeyrack` util in ahbode/svc-jobs + ahbode/svc-notifications. call it from a `beforeAll`:

```ts
import { useKeyrack } from '@src/.test/infra/useKeyrack';

describe('...', () => {
  beforeAll(() => useKeyrack({ env: 'test' })); // sources creds, exports static keys, drops AWS_PROFILE
  // ... real-SSM assertions
});
```

`useKeyrack` sources the profile via the programmatic `keyrack.source({ env, owner, mode: 'lenient' })` (from `@src/contract/sdk.keyrack` — NOT an execSync of the CLI), then runs `aws configure export-credentials --format env` for the live profile and drops `AWS_PROFILE` so the SDK uses the synchronous env provider. it guards CI (creds arrive from a role) and an absent `.agent/keyrack.yml`.

CRUCIAL: the SSO session must be LIVE before `useKeyrack` runs. the `git.repo.test` runner unlocks keyrack first (its output shows `keyrack: unlocked ehmpath/test`), so `keyrack.source` reads the live daemon; a bare `aws configure export-credentials` against a stale SSO cache would fail "session expired". this is a real backend, no mock. reference: `getOneKeyrackAwsParam.integration.test.ts` in ehmpathy/rhachet.

## the rule

on ANY expired-SSO error: re-run `rhx keyrack unlock --owner ehmpath --env <env>` and retry. never escalate `aws sso login` to the human.
