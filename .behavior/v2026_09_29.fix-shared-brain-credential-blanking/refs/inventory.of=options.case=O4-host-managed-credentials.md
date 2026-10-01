# option O4: host-managed credentials

## .what

let a host process own the credential, and have each clone read it from the host:
`CLAUDE_CODE_HOST_CREDS_FILE`, `CLAUDE_CODE_SDK_HAS_OAUTH_REFRESH`,
`CLAUDE_CODE_SDK_HAS_HOST_AUTH_REFRESH`, `CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST`.

## .verdict — ⛔ gated

- the sdk oauth refresh is gated to the claude-desktop, local-agent, and claude-vscode entrypoints
  (`SDK_OAUTH_REFRESH_ENTRYPOINTS`, `Rnt()`)
- `CLAUDE_CODE_HOST_CREDS_FILE` must be owner-only; otherwise it is ignored with "is set but no
  usable host credentials were read"
- to spoof an entrypoint to unlock these is off the normal path

## .citations

the refresh strategy selector:

```js
function z_r(){if(Ese()!==null||Rnt())return"sdk_host_refresh";if(Vs())return"runner_rotation";return buo()?"none":void 0}
```

`runner_rotation` — a 401 waits up to 60s for a new token to appear — is for anthropic's remote
runners only (`CLAUDE_CODE_REMOTE_SESSION_ID`):

```js
function pD(){let e=a.CLAUDE_CODE_OAUTH_401_WAIT_MS;if(e!==void 0)return e;return Vs()?60000:0}
```
