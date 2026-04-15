# self-review r6: behavior-declaration-adherance

second pass. fresh eyes. verify every detail against the spec.

---

## the wish (source of truth)

from `0.wish.md`:

> profile: '{"AWS_ACCESS_KEY_ID":"ASIA3W6J4C3WCTG6MEL4",...}'
>
> keyrack sets AWS_PROFILE to a JSON string that holds credentials instead of the
> profile name "ehmpathy.demo".
>
> The keyrack should either:
> 1. Set AWS_PROFILE=ehmpathy.demo (let SDK derive credentials)
> 2. Or set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN as separate env vars
>
> This is a keyrack mechanism bug - it derives the profile and stuffs all credentials
> into AWS_PROFILE as JSON.
>
> ----
>
> we gotta fix that bug
>
> it should just set AWS_PROFILE

**the fix chosen:** option 1 — set AWS_PROFILE to profile name, let SDK derive credentials.

---

## the change

### prod code (vaultAdapterAwsConfig.ts lines 183-188)

```ts
// validate sso session via mech (triggers browser login if expired)
const mechAdapter = getMechAdapter(input.mech);
await mechAdapter.deliverForGet({ source });

// return profile name (AWS SDK derives credentials from profile)
return source;
```

### test code (vaultAdapterAwsConfig.test.ts lines 151-176)

```ts
when('[t0.5] get called with exid and mech', () => {
  beforeEach(() => {
    // mock aws configure export-credentials output (mech.deliverForGet calls this)
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
  });

  then('returns the exid (profile name), not credentials', async () => {
    const result = await vaultAdapterAwsConfig.get({
      slug: 'acme.prod.AWS_PROFILE',
      exid: 'acme-prod',
      mech: 'EPHEMERAL_VIA_AWS_SSO',
    });
    expect(result).toEqual('acme-prod');
  });
});
```

---

## deep adherance verification

### line-by-line wish adherance

**wish:** "keyrack sets AWS_PROFILE to a JSON string that holds credentials"

**before (the bug):**
```ts
const { secret } = await mechAdapter.deliverForGet({ source });
return secret;  // secret = JSON blob of credentials
```

**after (the fix):**
```ts
await mechAdapter.deliverForGet({ source });
return source;  // source = profile name (e.g., "ehmpathy.demo")
```

the `secret` variable held the JSON credentials. the fix stops extraction of it. `source` is the profile name (exid). **wish addressed.**

---

**wish:** "it should just set AWS_PROFILE"

the wish uses "just" — implies simple, direct. the fix does exactly that:
- `return source` — one line
- source = exid = profile name
- no transformation, no parse, no wrap

**wish addressed with minimal complexity.**

---

**wish:** "let SDK derive credentials"

the comment on line 187 states: `// return profile name (AWS SDK derives credentials from profile)`

AWS SDK behavior: when `AWS_PROFILE=ehmpathy.demo` is set, the SDK looks up `~/.aws/config` for the profile, finds the SSO config, and derives credentials automatically.

by return of the profile name, we delegate credential derivation to the SDK. **wish addressed.**

---

**wish:** "triggers browser login if expired"

line 185: `await mechAdapter.deliverForGet({ source });`

the `deliverForGet` method for `EPHEMERAL_VIA_AWS_SSO` internally runs:
```
aws configure export-credentials --profile {source} --format env
```

if the SSO session is expired, this command triggers the browser login flow. the call is preserved in the fix — we just discard the result. **wish addressed.**

---

### test adherance

**test description:** "returns the exid (profile name), not credentials"

this directly states what the fix does. the parenthetical clarifies "exid = profile name". the comma clause "not credentials" documents the change.

**test assertion:** `expect(result).toEqual('acme-prod')`

- `'acme-prod'` is a string (profile name), not JSON
- `'acme-prod'` matches the `exid` passed to the get call
- assertion proves the fix works

**test mock:** mocks `aws configure export-credentials` output

- mock returns credential lines (realistic AWS CLI output)
- test proves we ignore this output and return profile name instead

---

## deviation check (thorough)

| question | analysis | verdict |
|----------|----------|---------|
| does fix match wish option 1? | returns profile name, SDK derives credentials | yes |
| does fix avoid wish option 2? | does not set individual env vars | yes |
| does fix address "JSON blob" bug? | no longer returns secret (JSON) | yes |
| is SSO validation preserved? | deliverForGet still called | yes |
| is test coverage adequate? | new test case for mech scenario | yes |
| any scope creep? | only 6 lines changed in prod | no |
| any absent cases? | no-mech case already covered by extant test | no |

---

## why it holds

**full adherance confirmed.**

1. **wish match** — the fix implements option 1 from the wish: set AWS_PROFILE to profile name, let SDK derive credentials. the wish said "it should just set AWS_PROFILE" — the fix returns the profile name for that purpose.

2. **bug address** — the bug was "JSON string that holds credentials instead of profile name". the fix removes the return of `secret` (JSON) and returns `source` (profile name) instead.

3. **validation preserved** — the SSO session validation via `deliverForGet` is preserved. if expired, browser login triggers. we just discard the credential output.

4. **test documents intent** — the test description explicitly states "returns the exid (profile name), not credentials" — documents both what the fix does and what it replaces.

5. **minimal change** — 6 lines in prod code (2 comments, 3 statements, 1 blank). no unnecessary complexity. no scope creep.

the implementation correctly adheres to the behavior declaration.

