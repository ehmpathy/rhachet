# ref: the refresh — a double-checked lock that works only if every racer shares one `_S()`

> zoom-in of `ref.claude-code.credential-store._.md`. source: `@anthropic-ai/claude-code@2.1.280`.

## .claim 1 — the window opens 5 minutes before expiry

```sh
rhx claude.cli.strings --in .temp/claude-cli.probe --pattern 'function ZC\(|kS=new Set\(|function ZO\(|function fD\(' --radius 350 --limit 8
```

```js
function ZO(e,n=Date.now()){if(e===null)return!1;return n+300000>=e}
```

the measured blank at 21h26m56s sat inside the window of an expiry at 21h30m20s (opened 21h25m20s).
every clone on the box shares that expiry, so every clone enters the window together — the race is
built in, and claude-code's protocol below exists to absorb it.

## .claim 2 — every refresher first stats the file, then re-reads under a lock

```sh
rhx claude.cli.strings --in .temp/claude-cli.probe --pattern 'lastCredentialsMtimeMs' --radius 600 --limit 4
```

```js
async function fD(e,n){…try{let{mtimeMs:r}=await od(ad(_S(),".credentials.json"));if(r!==e.lastCredentialsMtimeMs)e.lastCredentialsMtimeMs=r,Gk()}catch{await jy(e,n)}}
```

a changed mtime drops the in-memory copy (`Gk()`), so the next read hits disk. a stat follows a
symlink, so a symlinked clone sees the shared file's writes — which is also how one blank reached
all 18 clones at once.

```sh
rhx claude.cli.strings --in .temp/claude-cli.probe --pattern 'lock_busy' --radius 1200 --limit 3
```

```js
if(X.code==="ELOCKED"){let G=s??await Qu(X,D);if(n<5){i("tengu_oauth_token_refresh_lock_retry",{retryCount:n+1});let fe=1000+Math.random()*1000;return await ee(fe),td(e,n+1,r+fe,G,g,P,y,E,A)}…return se?"lock_busy":"lock_timeout"}
…let G=await Ha(y);if(!G?.refreshToken)return"no_refresh_token";if(L=G.refreshToken,G.accessToken!==P)return Wt(),i("tengu_oauth_token_refresh_race_resolved",{}),"refreshed";if(!g&&!ZO(G.expiresAt))return"not_needed";if(Eo.has(G.refreshToken))return"known_dead_refresh_token";…ne=await moe(G.refreshToken,{…})
```

the protocol, in order:

1. read the credential. not in the window → `not_needed`
2. re-read. the access token changed since step 1 → a peer refreshed → **adopt it** (`race_resolved`)
3. take the lock on `_S()`. held → wait 1–2s and start over, up to 5 times, then give up for now
4. re-read **under the lock**. changed → adopt. still the same → POST the refresh token

⇒ **step 4 is the whole guarantee: the loser waits on the lock, then finds the winner's tokens on
disk and adopts them.** a loser is never meant to fail. it holds only if both racers lock the same
path AND read the same file.

## .claim 3 — the save is a compare-and-swap on the refresh token that was posted

```sh
rhx claude.cli.strings --in .temp/claude-cli.probe --pattern 'adopted_sibling' --radius 1400 --limit 3
```

```js
async function ADn({isCompromised:e,postedRefreshToken:n,refreshedTokens:r,credentials:s}){…for(let M=0;M<3;M++){…w=await Fn().mutate((D)=>{let F=D.claudeAiOauth?.refreshToken;if(!(D.claudeAiOauth!==void 0&&D.claudeAiOauth!==null&&(F===""||F===n)))return E=!0,D;return{...D,claudeAiOauth:lb(D.claudeAiOauth,y)}},s)…}
…else if(E)i("tengu_oauth_refresh_save_adopted_newer_write",{});if(E)return Wt(),"adopted_sibling";return w.success?"saved":"save_failed"}
```

the new tokens land only if disk still holds the refresh token that was posted; else the peer's
newer write wins. claude-code expects concurrent refreshers — **within one store**.

## .claim 4 — a failed refresh re-reads once more, then may clear the token

```sh
rhx claude.cli.strings --in .temp/claude-cli.probe --pattern 'RDn\(' --radius 900 --limit 5
```

```js
Gk();let G=await Ha(y);if(G&&G.accessToken!==P)return Wt(),i("tengu_oauth_token_refresh_race_recovered",{}),"refreshed";if(goe(X)&&L)await RDn(L,y);
```

a peer's write seen now → recover. none seen and the server said `invalid_grant` → `RDn`, the
dead-token clear (`.dead-token-clear.md`).

## .what 1.48.0 did to this protocol

| step | one `_S()` for the box (pre-1.48.0) | `_S()` per actor + symlink (1.48.0) |
|---|---|---|
| 3. lock | one lock; racers queue | N locks; racers of different actors never meet |
| 4. re-read under lock | finds the winner's tokens → adopt | reads the shared file, which the winner **did not write** (`.write.md`) → POSTs the spent token |
| catch re-read | finds the winner's tokens → recover | same miss → `invalid_grant` → clear |
