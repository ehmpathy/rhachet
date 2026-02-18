# pkce vs device code flow for aws sso

## summary

aws cli v2.22+ defaults to **pkce (authorization code with proof key)** for sso login. keyrack uses `--use-device-code` to force the **device code flow** instead, for familiarity and headless support.

**important**: both flows produce the same clean "Allow access to your data?" prompt when used with sso-session config. the choice is purely about authentication UX.

## the two flows

### pkce authorization code flow (default since v2.22)

```
user runs: aws sso login --sso-session my-sso
browser opens: "Allow access to your data?"
user clicks: "Allow"
cli receives: authorization code → exchanges for tokens
```

**what user sees**: browser opens automatically, clean authorization prompt, one click to approve.

### device code flow (opt-in via --use-device-code)

```
user runs: aws sso login --sso-session my-sso --use-device-code
cli shows: "enter this code: ABCD-EFGH at https://device.sso..."
browser opens: device authorization page
user enters: code, approves
cli receives: tokens via poll loop
```

**what user sees**: familiar "enter this code" prompt like github cli, azure cli, etc.

## why aws made pkce the default

### 1. security: pkce is more secure than device code

| aspect | device code | pkce |
|--------|-------------|------|
| code interception | vulnerable to shoulder surf | code is never displayed |
| token bind | weak (code can be used from any device) | strong (code bound to original session) |
| phish risk | user might enter code on fake site | no code to phish |
| mitm protection | none beyond tls | cryptographic proof of origin |

pkce adds a `code_verifier` that proves the token request comes from the same client that initiated the flow. device code has no such bind.

### 2. ux: pkce is faster (one click vs code entry)

- pkce: click "allow" → done
- device code: copy code → paste code → click approve → done

### 3. industry trend: oauth 2.1 recommends pkce

aws aligns with [oauth 2.1 best practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-07) which recommend pkce for all public clients.

## why keyrack uses device code anyway

### 1. familiarity: users expect device code for cli tools

- github cli uses device code
- azure cli uses device code
- gcloud uses device code (similar browser-based)
- many sso providers use device code

the "enter this code" experience is recognizable and feels intentional.

### 2. transparency: device code shows what occurs

device code flow:
```
The SSO authorization page will open in your default browser.
If the browser does not open or you wish to use a different device to authorize this request,
open this URL:

https://device.sso.us-east-1.amazonaws.com/

Then enter the code:

ABCD-EFGH
```

pkce flow:
```
[browser opens silently]
[user clicks allow]
```

device code is more observable — the user sees exactly what to do.

### 3. headless support: device code works when cli and browser are separate

device code was designed for devices without browsers (tvs, iot, servers). user can complete auth on a different device.

pkce requires the browser to redirect back to localhost, which fails if:
- cli runs on remote server (ssh)
- cli runs in container
- firewall blocks localhost redirects

## the tradeoff

| consideration | pkce | device code |
|--------------|------|-------------|
| security | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| ux familiarity | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| transparency | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| headless support | ⭐⭐ | ⭐⭐⭐⭐⭐ |

keyrack prioritizes **familiarity** and **transparency** for local dev workflows. the security difference is minimal for interactive cli usage.

## implementation

```ts
// keyrack uses --sso-session with --use-device-code
await spawn('aws', ['sso', 'login', '--sso-session', ssoSessionName, '--use-device-code']);
```

note: we use `--sso-session` (not `--profile`) because:
1. it directly targets the session that needs refresh
2. profiles may share sso-sessions — only need one login
3. aligns with sso-session config (which keyrack requires)

## references

- [aws cli adds pkce-based authorization](https://aws.amazon.com/blogs/developer/aws-cli-adds-pkce-based-authorization-for-sso/) — official aws blog
- [aws sso login docs](https://docs.aws.amazon.com/cli/latest/reference/sso/login.html) — --use-device-code flag
- [oauth 2.0 device authorization grant (rfc 8628)](https://datatracker.ietf.org/doc/html/rfc8628)
- [oauth 2.0 pkce (rfc 7636)](https://datatracker.ietf.org/doc/html/rfc7636)
- [oauth 2.1 draft](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-07)
