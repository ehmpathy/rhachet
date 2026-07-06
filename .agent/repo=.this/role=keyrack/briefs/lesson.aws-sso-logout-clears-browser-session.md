# lesson: logoutAwsSsoSession clears browser session

## .what

`logoutAwsSsoSession({ ssoStartUrl })` clears both the local SSO cache AND the browser session for a specific domain.

keyrack `set` uses this exact function at `setupAwsSsoWithGuide.ts:159-161`.

## .why this matters

when a user completes SSO auth as the wrong user:
1. local cache has token for wrong user
2. browser session has active session for wrong user
3. delete local cache alone is NOT enough — browser will auto-complete as same user
4. `logoutAwsSsoSession` is required to force a fresh login prompt

## .the mechanism

`logoutAwsSsoSession` (via `clearAwsSsoCacheForDomain`) does two things:
1. **calls SDK LogoutCommand** - invalidates server-side session (kills browser session)
2. **deletes local cache** - removes `~/.aws/sso/cache/*.json` files for this domain only

the server-side logout is what clears the browser session. the browser's SSO cookie becomes invalid, and the next login requires fresh credentials.

## .why not `aws sso logout` CLI?

`aws sso logout` CLI is GLOBAL — it logs out ALL SSO domains, not just the target.

`logoutAwsSsoSession` is domain-scoped — preserves other SSO domains.

## .when to use

use `logoutAwsSsoSession({ ssoStartUrl })` when:
- cross-username detected after login attempt
- need to force user to sign in as different account
- want to preserve other SSO domain sessions

## .keyrack set pattern

keyrack `set` pre-logouts BEFORE browser auth:
```ts
// setupAwsSsoWithGuide.ts:159-161
await logoutAwsSsoSession({ ssoStartUrl });
console.log('   │  └─ ✓ cleared, to prevent collisions');
```

this exact pattern should be reused for unlock retry.
