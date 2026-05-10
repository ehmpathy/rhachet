# define.aws-sso-vs-sts-credentials

## .what

AWS SSO authentication involves two separate credential layers with independent lifetimes and caches.

## .the two layers

| layer | cache location | typical lifetime | validated by |
|-------|----------------|------------------|--------------|
| SSO access token | `~/.aws/sso/cache/` | 8 hours | `aws sso list-accounts --access-token` |
| STS credentials | `~/.aws/cli/cache/` | 1 hour (configurable) | `aws configure export-credentials` |

## .how they relate

```
SSO access token (8 hours)
    │
    ├─ used for: list accounts, request role credentials
    │
    └─ derives → STS credentials (1 hour)
                     │
                     └─ used for: actual AWS API calls
```

## .the validation gap

`aws sts get-caller-identity` uses cached STS credentials. if the cache file exists with a valid-format timestamp, AWS CLI uses it WITHOUT verifyied:
- the credentials actually work
- the SSO session can issue fresh credentials

this causes the "keyrack says valid but aws says expired" bug.

## .the fix

use `export-credentials` as primary validator:

1. `aws configure export-credentials` → validates both SSO and STS (forces refresh, returns actual expiration)
2. `aws sts get-caller-identity` → extract username for display

`export-credentials` validates both layers in one call:
- if SSO token is expired → command fails (can't refresh STS without valid SSO)
- if SSO is valid but STS cache is stale → command refreshes STS automatically
- check `AWS_CREDENTIAL_EXPIRATION` timestamp to ensure > 5 minutes left

## .why get-caller-identity lies

from [aws-cli issue #9845](https://github.com/aws/aws-cli/issues/9845):
- `get-caller-identity` uses cached STS credentials
- cache can contain credentials that "look valid" locally but are rejected by AWS
- AWS CLI does not always trigger refresh before it uses cached creds

## .5-minute buffer

we treat credentials as expired if they have < 5 minutes left. this prevents:
- credentials that expire mid-operation
- race conditions between validation and use

## .see also

- [export-credentials AWS CLI docs](https://docs.aws.amazon.com/cli/latest/reference/configure/export-credentials.html)
- [aws-cli issue #9845](https://github.com/aws/aws-cli/issues/9845)
