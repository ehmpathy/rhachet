# reproduction plan

## .what

reproduce both scenarios to verify the fix handles:
1. same user, different `sso_session` → should NOT re-auth
2. different user, same domain → SHOULD re-auth (security)

## .setup

update `ehmpathy.demo.prod` profile to use a different SSO user (e.g., admin instead of ehmpath).

this mimics the behavior when:
- `--owner ehmpath` uses SSO user A
- `--owner admin` uses SSO user B

## .scenario 1: same user, different sso_session (should NOT re-auth)

```
[t0] unlock --env test (profile: ehmpathy.demo, user: ehmpath)
     → triggers SSO browser auth
     → token created for sso_session[ehmpathy.demo]

[t1] unlock --env prep (profile: ehmpathy.demo, user: ehmpath)
     → same sso_session
     → no re-auth needed ✓

[t2] unlock --env test (profile: ehmpathy.demo, user: ehmpath)
     → token still valid
     → no re-auth needed ✓
```

## .scenario 2: different user, same domain (SHOULD re-auth)

```
[t0] unlock --env test (profile: ehmpathy.demo, user: ehmpath)
     → triggers SSO browser auth
     → token created for sso_session[ehmpathy.demo]

[t1] unlock --env prod (profile: ehmpathy.demo.prod, user: admin)
     → different user wants to auth
     → MUST prompt for new auth
     → should NOT reuse ehmpath's session
```

## .scenario 3: same user, different sso_session (current bug)

```
[t0] unlock --env test (profile: ehmpathy.demo, user: ehmpath)
     → triggers SSO browser auth
     → token created for sso_session[ehmpathy.demo]

[t1] unlock --env prod (profile: ehmpathy.demo.prod, user: ehmpath)
     → different sso_session, same user, same domain
     → CURRENT: clears test's token, forces re-auth
     → DESIRED: should NOT re-auth (same user)

[t2] unlock --env test (profile: ehmpathy.demo, user: ehmpath)
     → CURRENT: re-auth needed (token was cleared at t1)
     → DESIRED: no re-auth (token should still exist)
```

## .success criteria

after fix:
- scenario 1: no re-auth (same session) ✓
- scenario 2: re-auth required (different user) ✓
- scenario 3: no re-auth (same user, different session) ✓
