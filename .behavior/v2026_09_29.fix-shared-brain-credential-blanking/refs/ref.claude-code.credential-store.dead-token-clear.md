# ref: the blank is claude-code's deliberate dead-token clear

> zoom-in of `ref.claude-code.credential-store._.md`. source: `@anthropic-ai/claude-code@2.1.280`.
> resolves the wish's first unproven item: *"the precise failure mechanism inside claude-code"*.

## .claim 1 — on `invalid_grant`, claude-code blanks the secrets and keeps the rest

```sh
rhx claude.cli.strings --in .temp/claude-cli.probe --pattern 'RDn\(' --radius 900 --limit 5
```

```js
async function RDn(e,n){Eo.add(e),i("tengu_oauth_refresh_token_marked_dead_invalid_grant",{});try{let r=!1,s=await Fn().mutate((g)=>{let h=g.claudeAiOauth;if(!h||h.refreshToken!==e)return g;return r=!0,{...g,claudeAiOauth:{...h,refreshToken:"",accessToken:"",expiresAt:0}}},n);if(r&&s.success)i("tengu_oauth_refresh_token_cleared_on_disk",{});…}
```

| the measured blank (wish §3) | `RDn`'s output |
|---|---|
| `accessToken: ""` · `refreshToken: ""` · `expiresAt: 0` | `refreshToken:"",accessToken:"",expiresAt:0` |
| `refreshTokenExpiresAt`, `rateLimitTier`, `scopes`, `subscriptionType` survived | `{...h, …}` — every other field spread through |

⇒ **not a default object — a deliberate clear.** field for field, the shape is `RDn`'s.

the guard `h.refreshToken!==e` clears only if disk still holds the token that failed.

## .claim 2 — `invalid_grant` is the only error that triggers it

```sh
rhx claude.cli.strings --in .temp/claude-cli.probe --pattern 'function goe\(|function hDn\(' --radius 500 --limit 4
```

```js
function goe(e){if(!ut.isAxiosError(e)||!e.response)return!1;let n=e.response.status;if(n!==400&&n!==401)return!1;return Us(e.response.data).code==="invalid_grant"&&kxt(e.response.data)===null}
```

a network error, a timeout, a 5xx: no clear. only the token endpoint's `invalid_grant` — the server
says this refresh token is spent or revoked.

## .claim 3 — the refresh calls it after one last re-read

same command as claim 1:

```js
Gk();let G=await Ha(y);if(G&&G.accessToken!==P)return Wt(),i("tengu_oauth_token_refresh_race_recovered",{}),"refreshed";if(goe(X)&&L)await RDn(L,y);
```

## .claim 4 — every process on that store then sees a dead login

same command as claim 1:

```js
function db(e){if(e){let n=e.refreshToken;return n===""||!!n&&Eo.has(n)}…}function cb(e){return e?.claudeAiOauth?.refreshToken===""}
```

an empty refresh token reads as dead, to every process on that store. 18 clones that read one file
through links become 18 dead clones — the wish's "same instant" (the mtime check in `.refresh.md`
claim 2 makes each notice on its next request).

## .what this means for the fix

- the clear is correct behavior for a token the server truly revoked. **the defect is the
  `invalid_grant`**: a refresh token posted after another process already spent it.
- claude-code prevents the second post with its lock (`.refresh.md`), inside one store. rhachet's
  topology split the store's locks while it shared the store's file.
- ⇒ restore one store per box, and the double post cannot happen. no change to the clear is needed.
