# ref: the write — temp + rename replaces the symlink, so the refresh winner detaches

> zoom-in of `ref.claude-code.credential-store._.md`. source: `@anthropic-ai/claude-code@2.1.280`.

## .claim 1 — the plaintext store reads through a symlink and writes over it

```sh
rhx claude.cli.strings --in .temp/claude-cli.probe --pattern 'storagePath:V\(e,' --radius 1600 --limit 2
```

```js
function i(){let e=_S(),r=".credentials.json";return{storageDir:e,storagePath:V(e,".credentials.json")}}
var Z={async read(){let{storagePath:e}=i();try{let r=await le().readFile(e,…);return J(r)}catch{return null}},…
async write(e){try{let{storageDir:r,storagePath:n}=i();return await le().mkdir(r),await Cn(n,S(e),384),await Y(n,384),{success:!0,…}}catch{return{success:!1}}…},
async remove(){let{storagePath:e}=i();try{return await le().unlink(e),!0}…}};
```

- `read` → `readFile(path)` follows a symlink → a 1.48.0 clone reads the shared file
- `write` → `Cn(path, …, 0o600)` → claim 2
- `remove` → `unlink(path)` → removes the link, not the shared file

## .claim 2 — `Cn` puts a temp beside the path and renames it onto the path

```sh
rhx claude.cli.strings --in .temp/claude-cli.probe --pattern 'function Le\(e,t\)' --radius 700 --limit 8
rhx claude.cli.strings --in .temp/claude-cli.probe --pattern 'function ZC\(|kS=new Set\(|function ZO\(|function fD\(' --radius 350 --limit 8
```

```js
async function Cn(e,t,n,r){return cQ(e,t,{mode:n,renameFn:r})}
async function Le(e,t){if(t===void 0)return e;…return Te(t,be(e))}
kS=new Set(["EXDEV","EPERM","EEXIST","EBUSY"]);function ZC(e){return`${e}.tmp.${Oe(4).toString("hex")}`}
```

- `Cn` passes no temp dir → `Le` returns the path itself → the temp is `<actor>/brain/.claude/.credentials.json.tmp.<hex8>`
- then `rename(temp, <actor>/brain/.claude/.credentials.json)`. rename(2) on a symlink replaces the
  link, never its target
- `cQ` opens with `O_NOFOLLOW` unless a caller opts in to follow links, and `Cn` does not; its
  in-place fallback (only on `EXDEV`/`EPERM`/`EEXIST`/`EBUSY`) rejects a non-regular target

⇒ **no write path in this store reaches the shared file through a symlink.** the first time a 1.48.0
clone saves a credential, its link becomes a private file:

| after | the clone's file | the shared file |
|---|---|---|
| it wins a refresh | a private file with the NEW tokens | still the OLD tokens — a refresh token the server just spent |
| it clears a dead token | a private blank | untouched |

⇒ the "2 × a real file of the actor's own" in the wish need not be the enroll's `kept` branch. a
won refresh makes one (`.incident-read.md`).

## .claim 3 — the other store rejects a symlink outright

```sh
rhx claude.cli.strings --in .temp/claude-cli.probe --pattern 'refused-symlink' --radius 900 --limit 3
```

```js
case"refused-symlink":case"read-failed":return au;
…function m(e){return N()&&e!==void 0?ee(e):Z}
```

under the handle store (`ee`), a symlinked credential reads as a failed read. the grove's clones read
their links for hours, so they ran the plaintext store (`Z`). either way: **claude-code supports no
credential file shared by symlink.**

## .claim 4 — claude-code's own precedent for a derived dir copies, and strips the refresh token

```sh
rhx claude.cli.strings --in .temp/claude-cli.probe --pattern 'claudeAiOauth\.refreshToken' --radius 600 --limit 6
```

```js
if(n?.claudeAiOauth?.refreshToken)delete n.claudeAiOauth.refreshToken,r=S(n)}catch{}await Gt(s,r,{mode:384})}
…`claude-resume-${Vs()}`…
```

when claude-code builds a temp config dir of its own (`claude-resume-*`), it copies the credential
and deletes the refresh token, so the copy can never race the source's refresh.
