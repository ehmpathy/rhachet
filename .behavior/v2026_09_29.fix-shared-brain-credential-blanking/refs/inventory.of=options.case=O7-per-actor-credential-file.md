# option O7: per-actor credential file that rhachet writes

## .what

each actor dir holds a **real** `.credentials.json` — no symlink. rhachet writes into it the
reach's setup token (S2's waterfall, from keyrack) with a far `expiresAt` and no `refreshToken`.
to rotate (S3), rhachet rewrites the file; claude-code sees the new mtime and re-reads it on its
next request.

## .verdict — 🟢 lead candidate for S2 + S3

- ✅ no clone ever refreshes, so no race and no blank
- ✅ live rotation: a rewrite reaches a live clone on its next read — inside the 15-minute ttl
- ✅ normal auth path: claude-code talks straight to anthropic under its stored-login code path
- ✅ per-actor file fits `rule.forbid.per-clone-config` — the credential derives from the reach,
  so it is the actor's
- ⚠️ the usage-limit trigger (S3, S4) is rhachet's to detect; claude-code has no swap hook
- ❓ the unverified shape — see below

## .citations

the store re-reads when the file's mtime moves:

```js
async function fD(e,n){ ... let{mtimeMs:r}=await od(ad(_S(),".credentials.json"));if(r!==e.lastCredentialsMtimeMs)e.lastCredentialsMtimeMs=r,Gk() ... }
```

a save of a token with no `refreshToken` is short-circuited (a hint the shape is tolerated, and a
reason claude-code will not overwrite rhachet's file):

```js
if(!e.refreshToken||!e.expiresAt)return i("tengu_oauth_tokens_inference_only",{}),{success:!0};
```

the refresh window opens 5 minutes before `expiresAt`, so a far `expiresAt` never opens it:

```js
function ZO(e,n=Date.now()){return n+300000>=e}
```

community precedent for a file swap: <https://github.com/rayistern/claude-usage-swap> — it swaps
the same `.credentials.json` claude-code reads.

## .unverified

- does a live clone accept a stored credential with `refreshToken` absent and inference scope only?
- what does a live clone do when the token is revoked mid-session — re-read, or stall on
  `Login expired`?
- is a far `expiresAt` honored, or clamped?
