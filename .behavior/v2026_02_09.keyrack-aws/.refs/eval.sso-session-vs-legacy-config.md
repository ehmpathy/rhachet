# sso-session vs legacy profile config

## summary

aws cli supports two ways to configure sso profiles. keyrack only supports **sso-session config** (the recommended approach). legacy config is rejected.

## the two config approaches

### sso-session config (recommended, supported)

```ini
[sso-session my-sso]
sso_start_url = https://acme.awsapps.com/start
sso_region = us-east-1

[profile acme-prod]
sso_session = my-sso
sso_account_id = 123456789012
sso_role_name = AdministratorAccess
region = us-east-1
```

**what user sees on login**: clean "Allow access to your data?" prompt

**benefits**:
- shared session across multiple profiles (login once, use many)
- automatic token refresh (sessions can extend beyond 8 hours)
- clean authorization prompt (no sketchy "botocore-client-X" name)
- recommended by aws since cli v2.10

### legacy config (deprecated, rejected by keyrack)

```ini
[profile acme-prod]
sso_start_url = https://acme.awsapps.com/start
sso_region = us-east-1
sso_account_id = 123456789012
sso_role_name = AdministratorAccess
region = us-east-1
```

**what user sees on login**: sketchy "Allow botocore-client-acme-prod to access your data?" prompt

**problems**:
- each profile registers its own OIDC client named "botocore-client-{profile}"
- no automatic token refresh (fixed 8-hour session)
- suspicious authorization prompt that looks untrustworthy
- deprecated in favor of sso-session

## why the prompts differ

### sso-session flow

1. sso-session registers a shared OIDC client with a generic name
2. all profiles that reference the session share this client
3. authorization prompt shows clean "Allow access to your data?"

### legacy flow

1. each profile registers its own OIDC client
2. client name is "botocore-client-{profile-name}"
3. authorization prompt shows "Allow botocore-client-X to access your data?"

the "botocore-client" name comes from the aws cli (built on botocore python sdk). it's technically accurate but looks sketchy to users who don't know this.

## keyrack's stance

keyrack rejects legacy config for three reasons:

1. **ux**: the "botocore-client" prompt is suspicious and looks untrustworthy
2. **functionality**: no automatic token refresh limits session duration
3. **aws guidance**: aws recommends sso-session for all new configurations

when a profile uses legacy config, keyrack will fail with a clear error message that explains how to migrate.

## how to migrate from legacy to sso-session

1. add sso-session section to `~/.aws/config`:
```ini
[sso-session my-sso]
sso_start_url = https://acme.awsapps.com/start
sso_region = us-east-1
```

2. update profile to reference the session:
```ini
[profile acme-prod]
sso_session = my-sso
sso_account_id = 123456789012
sso_role_name = AdministratorAccess
region = us-east-1
```

3. remove redundant `sso_start_url` and `sso_region` from profile (now in session)

4. run `aws sso login --sso-session my-sso` to authenticate

## references

- [aws cli sso configuration](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html)
- [sso token provider configuration](https://docs.aws.amazon.com/cli/latest/userguide/sso-configure-profile-token.html)
- [ben kehoe: you only need to call aws sso login once](https://ben11kehoe.medium.com/you-only-need-to-call-aws-sso-login-once-for-all-your-profiles-41a334e1b37e)
