# keyrack SSO overauth diagnosis

## .what

does keyrack unlock trigger unnecessary SSO re-auth when env switch uses the same SSO?

## .findings

### AWS_PROFILE values by env

| env | AWS_PROFILE | SSO role |
|-----|-------------|----------|
| test | `ehmpathy.demo` | `AWSReservedSSO_ehmpathy-demo-sso` |
| prep | `ehmpathy.demo` | `AWSReservedSSO_ehmpathy-demo-sso` |
| prod | `ehmpathy.demo.prod` | `AWSReservedSSO_ehmpathy-demo-sso` |

### observed behavior

1. **test → prep**: no SSO re-auth required (same profile `ehmpathy.demo`)
2. **test → prod**: SSO re-auth required on first use (different profile `ehmpathy.demo.prod`)
3. **prod after keyrack unlock**: SSO session was triggered by keyrack unlock

### current state

- added `AWS_PROFILE` to `.agent/keyrack.yml` for all three envs (test, prep, prod)
- created `aws.whoami` skill to test AWS identity without permission prompts
- all three envs now unlock and authenticate correctly

## .changes made

1. `.agent/keyrack.yml`: added AWS_PROFILE to env.test, env.prep, env.prod
2. `.agent/repo=.this/role=any/skills/aws.whoami.sh`: new skill to check AWS identity

## .defect identified

**keyrack unlock triggers SSO re-auth on every call, even when credentials are still valid in daemon**

### current behavior
1. `keyrack unlock --env test` → SSO auth triggered
2. `aws.whoami --env test` → works (credentials cached in daemon)
3. `keyrack unlock --env test` again → SSO auth triggered again (unnecessary)

### expected behavior
1. `keyrack unlock --env test` → SSO auth triggered (first time)
2. `aws.whoami --env test` → works
3. `keyrack unlock --env test` again → skip vault, credentials still valid in daemon

### fix needed

`keyrack unlock` should be idempotent:
- check daemon for extant, unexpired credentials first
- only fetch from vault if absent or expired
- this avoids unnecessary SSO prompts

## .code diagnosis

### location

`src/domain.operations/keyrack/session/unlockKeyrackKeys.ts`

### root cause in code

lines 200-234 show the problem:

```ts
// unlock vault if needed
const isUnlocked = await adapter.isUnlocked({...});
if (!isUnlocked) {
  await adapter.unlock({...});
}

// get grant from vault  <-- ALWAYS CALLED
const grant = await adapter.get({...});
```

**the bug**: `adapter.get()` is ALWAYS called, even when daemon already has valid credentials. there's no check to see if daemon has the key before vault access.

### why profile switch triggers re-auth

when AWS_PROFILE value changes (e.g., `ehmpathy.demo` → `ehmpathy.demo.prod`):
1. different slug is processed (e.g., `ehmpathy.prod.AWS_PROFILE`)
2. code goes to vault for that slug
3. aws.config adapter calls `aws sso login --profile $profile`
4. SSO auth triggered for that profile

### deeper issue: isUnlocked checks SSO, not daemon

`vaultAdapterAwsConfig.isUnlocked()` (lines 225-230) calls `validateSsoSession()` which makes AWS API calls:

```ts
isUnlocked: async (input) => {
  const profileName = input?.exid;
  if (!profileName) return true;
  const result = await validateSsoSession(profileName);  // AWS API calls
  return result.valid;
}
```

**the real bug**: `isUnlocked` answers "is SSO session valid?" but the question should be "do we need to fetch from vault?"

if daemon already has the key, the answer is "no" — regardless of SSO session state.

### proposed fix

in `unlockKeyrackKeys.ts`, before line 200, add daemon lookup:

```ts
// check if daemon already has valid key — skip vault entirely if so
const daemonGrant = await daemonAccessGet({ socketPath, slug: effectiveSlug });
if (daemonGrant && daemonGrant.expiresAt > Date.now()) {
  keysToUnlock.push(daemonGrant);
  continue; // skip vault access, skip SSO check
}

// only reach here if daemon lacks key — now check vault
```

this makes `keyrack unlock` truly idempotent: daemon is the cache, vault is the source of truth, SSO is only triggered when needed.

## .defect timeline

```
[t0] unlock --env test (profile: ehmpathy.demo)
     └─ sso_session[ehmpathy.demo].get() => null
     └─ triggers SSO browser auth
     └─ creates token for sso_session[ehmpathy.demo]

[t1] aws.whoami --env test → works

[t2] unlock --env prep (profile: ehmpathy.demo)
     └─ sso_session[ehmpathy.demo].get() => valid
     └─ no SSO needed (same profile as t0)

[t3] aws.whoami --env prep → works

[t4] aws.whoami --env test → works

[t5] unlock --env prod (profile: ehmpathy.demo.prod)
     ├─ isUnlocked({ exid: 'ehmpathy.demo.prod' })
     │    └─ fromSSO({ profile: 'ehmpathy.demo.prod' })
     │         └─ sso_session[ehmpathy.demo.prod].get() => null
     │    └─ returns false
     │
     └─ unlock({ exid: 'ehmpathy.demo.prod' })
          ├─ validateSsoSession() → { valid: false }
          ├─ previewAwsSsoCacheForDomain({ ssoStartUrl: 'd-906617ed8b...' })
          │    └─ FINDS sso_session[ehmpathy.demo] token (same sso_start_url)
          ├─ clearAwsSsoCacheForDomain()  ← BUG HERE
          │    └─ DELETES sso_session[ehmpathy.demo] token!
          └─ triggerSsoLogin('ehmpathy.demo.prod') → browser auth
               └─ creates token for sso_session[ehmpathy.demo.prod]

[t6] unlock --env test (profile: ehmpathy.demo)
     └─ sso_session[ehmpathy.demo].get() => null (was deleted at t5!)
     └─ triggers SSO browser auth AGAIN
```

## .root cause

`clearAwsSsoCacheForDomain` clears ALL tokens for a given `sso_start_url`, but different `sso_session` names create separate token files for the same domain.

the code assumes "found a token but can't use it = wrong user" — but the real reason is "different sso_session name, same user".

### why the preemptive clear was added

the original intent: handle multi-user scenarios where User A is cached but User B wants to auth.

without the clear, if User A's browser session is cached and User B tries to auth:
- `aws sso login` might reuse User A's browser session
- User B ends up with User A's credentials (security issue)

so the code clears preemptively to force a fresh browser auth.

### why it causes this bug

the clear triggers whenever `validateSsoSession(profileName)` returns `{ valid: false }`. but that happens in TWO cases:

1. **different user** — intended case, should clear
2. **same user, different `sso_session` name** — bug case, should NOT clear

we can't distinguish these cases BEFORE auth. the code assumes case 1, but case 2 is common (multiple profiles for same user/domain).

### the dilemma

- clear before auth → destroys valid tokens from same user (current bug)
- don't clear before auth → risk User B gets User A's session
- clear after auth → requires a way to detect which user just authenticated vs cached

## .root question

**How do we know BEFORE auth if the requested unlock is for the same SSO user or a different one?**

### timeline: same user, different sso_session (BUG — should NOT clear)

```
state: browser has UserA session, cache has sso_session[X] token for UserA

[t0] unlock --env prod (sso_session[Y], expects UserA)
     ├─ validateSsoSession(Y) → false (no token for Y yet)
     ├─ previewAwsSsoCacheForDomain() → finds sso_session[X] token
     ├─ Q: is this UserA or UserB?
     │    └─ we don't know! host manifest lacks expected username
     ├─ current code assumes "different user" → clears
     │    └─ WRONG — destroys UserA's valid token for X
     └─ triggers SSO → UserA re-auths (unnecessary)
```

### timeline: different user (SECURITY — MUST clear)

```
state: browser has UserA session, cache has sso_session[X] token for UserA

[t0] unlock --env prod (sso_session[Y], expects UserB)
     ├─ validateSsoSession(Y) → false (no token for Y yet)
     ├─ previewAwsSsoCacheForDomain() → finds sso_session[X] token
     ├─ Q: is this UserA or UserB?
     │    └─ we don't know! host manifest lacks expected username
     ├─ if we DON'T clear:
     │    └─ aws sso login → silently uses UserA's browser session
     │    └─ UserB gets UserA's credentials (SECURITY ISSUE)
     └─ MUST clear → logout UserA → browser prompts UserB to sign in
```

### the identical fork

both timelines are identical up to the question "is this UserA or UserB?"

we need to answer that question BEFORE we decide to clear or not.

### what we lacked

the host manifest stores `exid` (profile name), `vault`, `mech` — but NOT "which SSO user should authenticate for this key".

**resolution**: add `KeyrackKeyHost.meta` field for vault-specific metadata; for `aws.config`, store expected SSO username.

### solution

**add `meta.awsSsoUsername` to `KeyrackKeyHost`**

```ts
interface KeyrackKeyHostMetaAwsConfig {
  awsSsoUsername: string; // ARN from sts get-caller-identity
}
```

### implementation

1. **on `keyrack set`** (for `aws.config`): after SSO auth, call `sts get-caller-identity`, store ARN in `meta.awsSsoUsername`
2. **on `keyrack unlock`**: if cached token exists for domain, call `sts get-caller-identity` with that token
   - if ARN matches `meta.awsSsoUsername` → reuse session, skip re-auth
   - if ARN differs → clear session, trigger fresh auth
3. **if `meta.awsSsoUsername` absent** → failfast: re-set the key

### ruled out

- ~~use `--owner` as proxy~~ — different owners may reuse same SSO user
- ~~prompt human~~ — adds friction, solution above is deterministic
- ~~overload `vaultRecipient`~~ — that field has specific role for age encryption

## .bisection signals

### what triggers re-auth

| variable | same | different | re-auth? |
|----------|------|-----------|----------|
| profile name | `ehmpathy.demo` → `ehmpathy.demo` | `ehmpathy.demo` → `ehmpathy.demo.prod` | **only when different** |
| sso domain | `d-906617ed8b.awsapps.com` | same | no effect |
| account/role | `805192865516` / `ehmpathy-demo-sso` | same | no effect |

### key observation

- test → prep: NO re-auth (same profile `ehmpathy.demo`)
- test → prod: RE-AUTH (different profile `ehmpathy.demo.prod`)
- both profiles use **same SSO domain**, **same account**, **same role**

### conclusion

the defect is triggered by **profile name change**, not by actual SSO domain or credential differences.

the SSO token cached for `ehmpathy.demo` should be valid for `ehmpathy.demo.prod` (same domain), but `fromSSO({ profile: 'ehmpathy.demo.prod' })` fails anyway.

### hypothesis

when `validateSsoSession('ehmpathy.demo.prod')` fails, the unlock code:
1. sees a cached session for the domain
2. assumes "access denied = different user"
3. **clears the valid SSO token** via `clearAwsSsoCacheForDomain`
4. triggers fresh SSO login

the bug is the assumption in step 2 — failure doesn't mean wrong user.

## .open questions

- should test and prep use different profiles for isolation?
- currently both use `ehmpathy.demo` which means same IAM permissions
