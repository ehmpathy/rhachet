# evidence: SSO session shared across envs

## .version

v1 — 2026-06-22

## .what

keyrack unlock for multiple envs (test, prep, prod) shares the same SSO session. once authenticated, env switches do not require re-auth.

## .evidence

### ahbode org — test run 2026-06-22

| step | env | action | result |
|------|-----|--------|--------|
| 1 | test | `keyrack unlock` | unlocked, SSO prompted |
| 2 | test | `aws.whoami` | account 874711128849, role `everyday-power` |
| 3 | prep | `keyrack unlock` | unlocked, SSO prompted |
| 4 | prep | `aws.whoami` | account 874711128849, role `everyday-power` |
| 5 | prod | `keyrack unlock` | unlocked, no SSO prompt |
| 6 | prod | `aws.whoami` | account 398838478359, role `everyday-power` |
| 7 | test | `aws.whoami` | account 874711128849 — no re-auth |
| 8 | prep | `aws.whoami` | account 874711128849 — no re-auth |
| 9 | prod | `aws.whoami` | account 398838478359 — no re-auth |

### ehmpathy org — test run 2026-06-22

| env | AWS_PROFILE | account |
|-----|-------------|---------|
| test | `ehmpathy.demo` | 805192865516 |
| prep | `ehmpathy.demo` | 805192865516 |
| prod | `ehmpathy.demo.prod` | 805192865516 |

test and prep share profile `ehmpathy.demo`. all three share SSO session once authenticated.

## .defect found

**keyrack unlock triggers SSO re-auth even when credentials are still valid in daemon**

| scenario | current behavior | expected behavior |
|----------|------------------|-------------------|
| first unlock | SSO auth triggered | SSO auth triggered |
| second unlock (same env) | SSO auth triggered again | skip vault, use daemon cache |
| use credentials (aws.whoami) | works, no re-auth | works, no re-auth |

### root cause

`keyrack unlock` always fetches from vault, which triggers SSO auth for `aws.config` vault type. it does not check if credentials are already valid in daemon.

### expected fix

`keyrack unlock` should be idempotent:
1. check daemon for extant credentials
2. if valid (not expired), return early — no vault access
3. if absent or expired, fetch from vault (triggers SSO if needed)

## .conclusion

- initial unlock per env requires SSO auth (expected)
- subsequent access to any env reuses SSO session (no re-auth)
- different profiles can share same SSO identity
- env isolation achieved via different AWS accounts, not separate SSO sessions
- **BUG**: repeat unlock triggers unnecessary SSO re-auth

## .config

```yaml
# .agent/keyrack.yml
env.test:
  - AWS_PROFILE
env.prep:
  - AWS_PROFILE
env.prod:
  - AWS_PROFILE
```
