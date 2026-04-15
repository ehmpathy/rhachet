# self-review r3: has-all-tests-passed

## the check

did all tests pass? and do they prove real behavior, not fake pass-through?

## deeper reflection: are the tests real?

the guide warns against fake tests:
> tests that mock the system under test prove nothingness

let me examine whether vaultAdapterAwsConfig tests mock the system under test or just external dependencies.

### what is the system under test?

the system under test is `vaultAdapterAwsConfig` — the vault adapter that:
1. returns profile name (not credentials) from `get()`
2. validates sso sessions via `isUnlocked()`
3. triggers browser login via `unlock()`
4. clears sso cache via `relock()`

### what is mocked?

the mocks target **external dependencies**, not the system under test:

| mock | what it replaces | why |
|------|------------------|-----|
| `child_process.exec` | aws cli calls | aws cli requires real credentials and browser flow |
| `child_process.spawn` | aws sso login process | browser auth cannot be automated |
| `fs.existsSync` | filesystem check for ~/.aws/config | test isolation |
| `fs.readFileSync` | read ~/.aws/config content | test isolation |

the system under test (`vaultAdapterAwsConfig`) is **not mocked**.

### does [t0.5] prove the fix?

the critical test for this fix is `[t0.5] get called with exid and mech`:

```ts
then('returns the exid (profile name), not credentials', async () => {
  const result = await vaultAdapterAwsConfig.get({
    slug: 'acme.prod.AWS_PROFILE',
    exid: 'acme-prod',
    mech: 'EPHEMERAL_VIA_AWS_SSO',
  });
  expect(result).toEqual('acme-prod');
});
```

this test:
1. calls the real `vaultAdapterAwsConfig.get()` — not mocked
2. passes `exid: 'acme-prod'` and `mech: 'EPHEMERAL_VIA_AWS_SSO'`
3. asserts result equals `'acme-prod'` — the profile name, not JSON credentials

the mock for `exec` returns credentials:
```ts
execMock.mockImplementation((cmd: string, callback: any) => {
  callback(null, {
    stdout: [
      'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE',
      'AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      'AWS_SESSION_TOKEN=FwoGZXIvYXdzEBYaDK...',
      'AWS_CREDENTIAL_EXPIRATION=2026-04-14T12:00:00Z',
    ].join('\n'),
    stderr: '',
  });
  return {} as any;
});
```

**the critical insight**: even though `mech.deliverForGet()` returns credentials (via the mock), the adapter code ignores that result and returns `source` (the profile name) instead. this is exactly what the fix does.

the test proves: when the mech adapter would return credentials, the vault adapter still returns the profile name.

### test execution proof (verified)

all tests passed:

| suite | command | result |
|-------|---------|--------|
| types | `rhx git.repo.test --what types` | passed (8s) |
| lint | `rhx git.repo.test --what lint` | passed (5s) |
| format | `rhx git.repo.test --what format` | passed (0s) |
| unit | `rhx git.repo.test --what unit --scope vaultAdapterAwsConfig` | 22 passed (1s) |
| integration | `rhx git.repo.test --what integration --scope vaultAdapterAwsConfig` | 2 passed (2s) |

## why it holds

1. **the system under test is not mocked** — only external dependencies (aws cli, filesystem)
2. **the critical test proves the fix** — [t0.5] shows that even when mech returns credentials, the adapter returns profile name
3. **the mock setup is realistic** — it returns what aws cli would return (credentials), which proves the adapter correctly ignores them
4. **all tests pass with zero skips** — 24 total tests (22 unit + 2 integration)

the tests are real. they test real adapter logic. they prove the fix works.
