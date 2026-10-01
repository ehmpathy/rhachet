# ref: the locks — all keyed on `_S()`, all mkdir-based, none shareable by symlink

> zoom-in of `ref.claude-code.credential-store._.md`. source: `@anthropic-ai/claude-code@2.1.280`.

## .claim 1 — the refresh takes two locks, both derived from `_S()`

```sh
rhx claude.cli.strings --in .temp/claude-cli.probe --pattern 'oauth_refresh\.lock' --radius 700 --limit 4
```

```js
function q_r(e,n){return{lockfilePath:ad(e,".oauth_refresh.lock"),realpath:!1,stale:60000,update:5000,onCompromised:…}}
…y=`${await DM(e).catch(()=>e)}.lock`…
```

| lock | path | 1.48.0 clone | pre-1.48.0 clone, human's `claude` |
|---|---|---|---|
| refresh | `<_S()>/.oauth_refresh.lock` | `<actor>/brain/.claude/.oauth_refresh.lock` | `~/.claude/.oauth_refresh.lock` |
| legacy refresh | `realpath(<_S()>) + ".lock"` | `<actor>/brain/.claude.lock` | `~/.claude.lock` |

⇒ **two clones of different actors hold two different locks over the one shared file.** claude-code's
own guard never sees the other racer.

`stale:60000` — a crashed holder's lock is broken after 60s, so one dead process cannot wedge a shared
lock for good.

## .claim 2 — every credential write takes a third lock, also under `_S()`

```sh
rhx claude.cli.strings --in .temp/claude-cli.probe --pattern 'storagePath:V\(e,' --radius 1600 --limit 2
```

```js
…ei(F(a,".storage-write"),{realpath:!1,retries:{retries:10,minTimeout:100,maxTimeout:1000},stale:15000,…
function g(e,r,n){return Fwr(async()=>{e.invalidateCache?.();let a=await(e.readAsyncStrict?.(n)??e.readAsync(n));if(a===au)return{success:!1,transient:!0};let o=a??{},s=r(o);return s===o?{success:!0}:await e.update(s,n)})}
```

every `mutate` (the save in `.refresh.md` claim 3, the clear in `.dead-token-clear.md`) is a
read-modify-write under `<_S()>/.storage-write`. per actor, that too serializes no one across actors.

a fourth, `.design_oauth_refresh.lock`, sits under `_S()` as well:

```sh
rhx claude.cli.strings --in .temp/claude-cli.probe --pattern 'design_oauth_refresh' --radius 300 --limit 3
```

## .claim 3 — the lock is a directory made with `mkdir`, so a symlinked lock cannot work

```sh
rhx claude.cli.strings --in .temp/claude-cli.probe --pattern 'lockfilePath\|\|' --radius 900 --limit 3
```

```js
function ne(e,r){return r.lockfilePath||`${e}.lock`}
function De(e,r,n){let i=ne(e,r);r.fs.mkdir(i,(u)=>{…if(u.code!=="EEXIST")return n(u);…r.fs.stat(i,(c,p)=>{…if(!rt(p,r))return n(Object.assign(Error("Lock file is already being held"),{code:"ELOCKED",file:e}));nt(e,r,…)…
function rt(e,r){return e.mtime.getTime()<Date.now()-r.stale}function nt(e,r,n){r.fs.rmdir(ne(e,r),…
```

take = `mkdir`; release = `rmdir`. a symlink placed at `<actor>/brain/.claude/.oauth_refresh.lock`:

- `mkdir` on it → `EEXIST` (the link exists) → `stat` follows it
- target absent (no one holds the real lock) → `ENOENT` → retry with `stale:0` → `EEXIST` again → **`ELOCKED` forever**. the clone never refreshes
- target present and stale → `rmdir` on the link → fails (`ENOTDIR`). the lock never frees
- and the legacy lock path is `realpath(_S()) + ".lock"` — a path beside the actor dir, a second link to plant

⇒ **refuted: a symlinked lock wedges the clone.** only one `_S()` shares the locks.
