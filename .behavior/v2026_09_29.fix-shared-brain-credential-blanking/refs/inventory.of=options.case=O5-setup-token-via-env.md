# option O5: setup token per reach, injected as CLAUDE_CODE_OAUTH_TOKEN

## .what

a human mints one long-lived token per subscription (`claude setup-token`) and sets it into
keyrack, one per reach (S2). enroll resolves the reach's token by waterfall — the org's key, else
the machine default, else the `/login` file — and injects it as `CLAUDE_CODE_OAUTH_TOKEN`.

## .verdict — 🟡 kills the race, fails S3

- ✅ a clone on an env token never refreshes and never writes the credential file: no race
- ✅ S2's waterfall fits keyrack's org scope
- ❌ the env is read at spawn. a swap reaches new spawns only — live clones keep the old token until
  respawn. S3 names live rotation the top requirement
- ⚠️ each token is re-minted by a human in a browser, about once a year

## .citations

the env token enters as a credential with no refresh token:

```js
if(a.CLAUDE_CODE_OAUTH_TOKEN)return{accessToken:a.CLAUDE_CODE_OAUTH_TOKEN,refreshToken:null,expiresAt:null,scopes:zy(),...}
```

and its refresh strategy is `none`:

```js
function buo(){return Boolean(a.CLAUDE_CODE_OAUTH_TOKEN)&&!Vs()&&!a.ANTHROPIC_UNIX_SOCKET}
```

docs: <https://code.claude.com/docs/en/authentication> — `claude setup-token`, subscription use in
scripts and ci.
