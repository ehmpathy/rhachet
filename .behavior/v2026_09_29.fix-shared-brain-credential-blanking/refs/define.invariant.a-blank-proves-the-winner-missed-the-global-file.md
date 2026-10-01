# define.invariant: a blank proves the refresh winner missed the global file

## .what

when `~/.claude/.credentials.json` is blanked, the refresh winner's fresh token is **not** in it,
and never was. it sits in the winner's own actor dir, where the write replaced the actor's symlink
with a real file.

## .kind — nature

it follows from the code of claude-code `2.1.280` (build `80abbfe7`) and from posix `rename(2)`.
no decision of ours could make it otherwise. a claude-code release that changes the write or the
clear can change it — re-read the code below on each claude-code bump.

## .invariant

```
global file blanked  ⟹  the winner's write did not land in the global file
                     ⟹  every non-blank version the global file ever held predates the winner
```

## .the proof, in four steps

**1. the store path is the config dir's own path — no realpath.**

```js
function i(){let e=_S(),r=".credentials.json";return{storageDir:e,storagePath:V(e,".credentials.json")}}
... async write(e){ ... let{storageDir:r,storagePath:n}=i(); ... await Cn(n,S(e),384) ... }
```

`_S()` is `CLAUDE_CONFIG_DIR`. under #553 that is `<actorDir>/brain/.claude`, so the path handed to
the write is `<actorDir>/brain/.claude/.credentials.json` — the symlink itself.

**2. the write puts a temp file beside that path, then renames it over the path.**

```js
async function Cn(e,t,n,r){return cQ(e,t,{mode:n,renameFn:r})}      // no followSymlinks
function ZC(e){return`${e}.tmp.${Oe(4).toString("hex")}`}            // temp = <path>.tmp.<hex>
async function cQ(e,t,n){ ... g=await Le(e,y) ...                     // no stagingDir → g = e
  ... else m=await TM(g,t,P),W=!0 ...                                 // write temp, flag "wx"
  ... let l=w??ne; await zo(p,e,(h,u)=>(x(),l(h,u))) ... }            // ne = fs.promises.rename
```

the in-place fallback (`H`) runs only when the rename throws `EXDEV|EPERM|EEXIST|EBUSY` (`kS`), and
it opens with `O_NOFOLLOW` (`A=f===!0?0:o.O_NOFOLLOW`), so it cannot write through a symlink either.

**3. `rename(temp, path)` replaces the directory entry at `path`.** posix: when `path` is a symlink,
the symlink is replaced; its target is not touched. so the winner's actor dir now holds a real file
with the fresh token R2, and the global file still holds R1.

**4. the loser's clear is compare-and-clear, against the file on disk.**

```js
async function RDn(e,n){ ... mutate((g)=>{let h=g.claudeAiOauth;if(!h||h.refreshToken!==e)return g;
  return r=!0,{...g,claudeAiOauth:{...h,refreshToken:"",accessToken:"",expiresAt:0}}}) ... }
```

a loser refreshes with R1, is rejected, and runs `RDn(R1)`. `mutate` reads the file fresh; it holds
R1, so it blanks — **the file under the loser's own `_S()`**. for a 1.48.0 clone that write replaces
its own link (step 3), so the global file is blanked only by a loser whose `_S()` is `~/.claude`.
measured: `rhx claude.cli.secstore.trial` — a linked actor's clear left a blank real file in the
actor dir and the global file planted (`inventory.of=options.case=O3-…md`, `.the run`).

## .the contrapositive — why the blank itself is the proof

suppose the winner's write **had** landed in the global file. the global file would hold R2. the
loser's `RDn(R1)` would compare R2 against R1, find them unequal, and return the file unchanged.
**no blank.** so every observed blank is evidence that the winner's write missed the global file.

⇒ "the winner wrote successfully, the peers failed and blanked" is true. what the winner wrote
successfully is its **own** actor file, not the shared one.

## .what follows

| claim | holds? | why |
|---|---|---|
| revert the global file to its last non-blank version | ⛔ restores R1, the dead token | the global file never held R2 (step 3) |
| revert to the newest non-blank version across **all** credential files | 🟢 restores R2, if R2 survives | R2 is in the winner's actor file (steps 2–3) |
| on the symlink→file swap, adopt that file into the global file and relink | 🟢 same, and before any loser blanks | `case=O10` |

## .scope — what this does not cover

- whether R2 **survives** — that is a fact about the server, not the code. first-party: it does,
  and a blanked clone recovers once R2 is back in its file (`../.seeds/…case=S7`)
- a winner with no actor (an unenrolled `claude` on `~/.claude`) writes the global file directly;
  that race blanks no one, per the contrapositive
- a second store module in the same build opens the credential with `O_NOFOLLOW` on **read** and
  returns `refused-symlink` on `ELOOP`. which builds route through it was not traced; if a future
  build does, a symlinked actor credential reads as refused, not as the global file

## .field corroboration

the wish's topology on `grove-ahbode-v20260901`: 18 actor credentials are symlinks, **2 are real
files** — the actor dirs where a refresh won.

## .the litigation

argued: the winner writes the fresh token through its symlink into the shared file, so the shared
file's history holds the good token and a revert to the last non-blank version restores it.

settled by the four steps above: the write path is the symlink's own path, the rename replaces the
symlink, and the compare-and-clear could not blank a file that held the winner's token. so the
shared file's history never held it; the winner's actor file does.

## .what would overturn it

a claude-code build that realpaths the store path, passes `followSymlinks`, or blanks without the
compare. re-read `i()`, `Cn`, `cQ`, and `RDn` via
`rhx claude.cli.strings --in .temp/claude-cli.probe --pattern '<fn>'` on each bump.
