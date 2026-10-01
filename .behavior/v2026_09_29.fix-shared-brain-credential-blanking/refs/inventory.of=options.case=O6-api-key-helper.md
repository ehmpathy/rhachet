# option O6: apiKeyHelper with a keyrack command

## .what

set the `apiKeyHelper` key in settings to a command such as `rhx keyrack get …`. claude-code
re-runs it on a ttl (`CLAUDE_CODE_API_KEY_HELPER_TTL_MS`, default 5 minutes) and on a 401.

## .verdict — ⛔ wrong channel

the helper feeds the **api key** resolver. its output is sent as an api key, billed per token to a
console org — never as a subscription token. it also outranks the `/login` subscription, so to set
it moves the fleet off its subscriptions.

## .citations

the api-key resolver — the helper sits beside `ANTHROPIC_API_KEY`:

```js
function u_(e={}){ ... if(d_()){ ... return{key:vDn(),source:"apiKeyHelper"}} ... }
```

the text shown to a human names it as api-key auth (verbatim from the build):

```
Your organization has disabled API key authentication · Unset the apiKeyHelper setting and run /login to sign in with your claude.ai account
```

output is validated as an api key:

```
apiKeyHelper output rejected: not a printable-ASCII token
returned output that cannot be used as an API key
```

docs: <https://code.claude.com/docs/en/authentication> — the helper outputs an api key; a
configured helper outranks the subscription login.
