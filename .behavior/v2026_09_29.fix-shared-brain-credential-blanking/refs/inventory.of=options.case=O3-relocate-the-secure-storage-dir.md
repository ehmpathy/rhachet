# option O3: relocate the credential store via CLAUDE_SECURESTORAGE_CONFIG_DIR

## .what

keep a per-actor `CLAUDE_CONFIG_DIR`, and spawn every clone with `CLAUDE_SECURESTORAGE_CONFIG_DIR=""`.
stop the credential symlink. the credential file **and every lock that guards it** move back to
`~/.claude`, while settings and boot stay per actor.

## .verdict — 🟢 verified from the code and by a run; the root cure for S1

the run (`.the run`, below) proves the read and the write land in `~/.claude` while the config stays
per actor. what no run has shown yet: two live processes that contend for the one lock.

- ✅ one file, one write lock, one refresh lock for every process on the box — the pre-1.48.0
  topology. a loser waits on the lock, re-reads, and finds the winner's token
- ✅ no symlink, so no rename can replace one (`define.invariant.a-blank-proves-the-winner-missed-the-global-file.md`)
- ✅ shared with a bare `claude` and with trees on older rhachet, since they already use `~/.claude`
- ✅ same oauth login, same refresh — S1's "no new auth scheme" holds
- ✅ precedent: claude-code spawns its own agent-team teammates with `CLAUDE_SECURESTORAGE_CONFIG_DIR=`
- ✅ makes the adopt watcher (`case=O10`) unnecessary as a cure

## .citations — claude-code 2.1.280, build 80abbfe7

`_S()` reads the variable first. set but empty → `~/.claude`; unset → the config dir:

```js
function _S(){let n=process.env.CLAUDE_SECURESTORAGE_CONFIG_DIR;
  if(n!==void 0)return(n||l(o(),".claude")).normalize("NFC");return we()}
```

every credential path and lock keys on `_S()`:

| what | code |
|---|---|
| the file | `function i(){let e=_S(),r=".credentials.json";return{storageDir:e,storagePath:V(e,".credentials.json")}}` |
| the store write lock | `let a=_S();await le().mkdir(a);let o=await ei(F(a,".storage-write"),{realpath:!1,...})` |
| the oauth refresh lock (both refresh paths) | `let D=_S();await le().mkdir(D);... F=await wuo(D)` · `let r=_S();... s=await wuo(r)` |
| the mtime re-read | `await od(ad(_S(),".credentials.json"))` |
| the second store module | `function f(){let e=_S();return{storeDir:e,storePath:D(e,".credentials.json")}}` |

the teammate spawn precedent: the literal `CLAUDE_SECURESTORAGE_CONFIG_DIR=` sits beside
`CLAUDECODE=1` and `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in the teammate launch env.

⇒ why today's topology races: under #553 the variable is unset, so `_S()` = `we()` = the per-actor
config dir, and each actor gets its own locks over one symlinked file.

the full mechanism, claim by claim, is the `ref.claude-code.credential-store._.md` cluster.

## .why `""` and not a path

`""` is the one value that means the default store on linux and macos alike. on macos the keychain
entry name gains a `-sha256(dir)[0:8]` suffix whenever the var holds a path — even `~/.claude`
spelled out — so only `""` reaches the human's login (`ref.claude-code.credential-store.dir.md`
claim 4). it is also the idiom other tools use (claim 6).

## .the risks

| risk | answer |
|---|---|
| the var is undocumented ([anthropics/claude-code#79223](https://github.com/anthropics/claude-code/issues/79223)) | claude-code's own teammate spawn depends on it; it has held 2.1.206 → 2.1.280. a clamp on its effect catches a regression |
| a real `invalid_grant` (the server revoked the login) still blanks the one file | correct — that login is dead for every clone. enroll names the cure (vision case 3) |

## .the run

`rhx claude.cli.secstore.trial --in .temp/claude-cli.probe` — claude-code 2.1.280, a fake `HOME` under
`.temp/`, an env built from empty, fake tokens only. run 2026-09-29:

| scenario | `CLAUDE_SECURESTORAGE_CONFIG_DIR` | result |
|---|---|---|
| read, actor dir empty, login in `~/.claude` | unset | `loggedIn: false` — reads the actor dir |
| same | `""` | `loggedIn: true` — reads `~/.claude` |
| read, actor links to `~/.claude` (1.48.0) | unset | `loggedIn: true` — the read follows the link |
| expired login, actor links to it (1.48.0) → refresh fails → the dead-token clear | unset | the blank lands in the **actor** dir as a new real file; the link is gone; `~/.claude` stays **planted** |
| same expired login, no link | `""` | the blank lands in **`~/.claude`**; no credential in the actor dir; `.claude.json`, `projects`, `sessions` stay in the actor dir |

⇒ with `""` the credential read and write go to `~/.claude` and all else stays per actor — O3's
whole premise, observed. and row 4 settles the dispute in the summary's gaps: a 1.48.0 clone cannot
blank the shared file; its write replaces its own link.

the same trial, run through rhachet's spawn instead of a bare env, is the red/green clamp: before the
fix the clear lands in the actor dir, after it in `~/.claude`.

## .migration owed

- the actor dirs that already hold a **real** `.credentials.json` may hold the only live token
  (the last refresh winner). before those files are removed, adopt the one with the latest
  `expiresAt` into `~/.claude/.credentials.json` if it is later than the global file's. compare
  `expiresAt` only; never print a token
- live clones spawned before the fix keep the old env until respawn. the race stays open for them
  until then

## .scope

- `CLAUDE_SECURESTORAGE_CONFIG_DIR` is dropped from a project's `settings.json` env, so it must be
  set in the spawn env — which is where rhachet sets `CLAUDE_CONFIG_DIR` today
- children of a clone (nested `claude`, subagents) inherit the env, so they share the file too
- S2 composes with it: a per-subscription secure-storage dir (`CLAUDE_SECURESTORAGE_CONFIG_DIR=<dir
  of subscription X>`) gives every clone of that subscription one file and one lock, and a write
  to that file reaches live clones via the mtime re-read
