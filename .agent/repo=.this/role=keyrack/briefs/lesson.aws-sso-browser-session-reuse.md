# lesson.aws-sso-browser-session-reuse

## .what

`aws sso login --profile X` reuses the browser's authenticated SSO session to generate per-profile credentials — even when the SDK's `fromSSO` validation fails.

## .the architecture

```
browser SSO session (domain-level)
    │
    │  ← user authenticates once via browser
    │
    └─ sso_start_url = https://d-906617ed8b.awsapps.com/start
       │
       ├─ profile: ehmpathy.demo.test (sso_session: ehmpathy.demo.test)
       ├─ profile: ehmpathy.demo.prep (sso_session: ehmpathy.demo.prep)
       └─ profile: ehmpathy.demo.prod (sso_session: ehmpathy.demo.prod)
           │
           └─ each profile has its own cached credentials in ~/.aws/cli/cache/
```

## .the gap

| layer | what it validates | cache location |
|-------|-------------------|----------------|
| browser SSO session | domain-level auth (sso_start_url) | browser cookies |
| `fromSSO` SDK | per-profile credentials | `~/.aws/cli/cache/` |

**the gap**: a profile may not have cached credentials even though the browser session is valid.

## .the fix: login before validate

```ts
// wrong order — validates per-profile, fails if cache absent
const sessionResult = await validateSsoSession(profileName);  // fails!
await triggerSsoLogin(profileName);  // browser pops up (unnecessary)

// correct order — login reuses browser session
await triggerSsoLogin(profileName);  // no browser popup if same user
const sessionResult = await validateSsoSession(profileName);  // works!
```

## .why this matters

when user unlocks profile A then profile B on same domain:
- **old flow**: validate B → fails (no cache) → clear domain → login (browser popup!)
- **new flow**: login B → reuses browser session (no popup) → validate B → works

the browser session is already authenticated for the user. `aws sso login` doesn't need the browser if the domain session is valid.

## .when browser popup IS required

| scenario | browser popup? |
|----------|---------------|
| first auth on domain | yes |
| same domain, same user | no |
| same domain, different user | yes (after clear) |
| different domain | yes |
| domain session expired | yes |

## .see also

- `define.aws-sso-vs-sts-credentials.md` — the two credential layers
- `.behavior/v2026_06_22.fix-keyrack-sso-overauth/0.wish.md` — the full fix
