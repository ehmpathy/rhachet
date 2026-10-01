# option O9: backup-and-revert of the global file

## .what

on each non-blank write of `~/.claude/.credentials.json`, keep the last 10 versions; when the file
turns blank, restore the latest non-blank one.

## .verdict — ⛔ as posed

the last non-blank version of the **global** file holds the refresh token that just died. to
restore it restores a dead token, and the next refresh blanks it again. the fresh token is not in
the global file's history at all — it sits in the winner's actor dir. `case=O10` is this idea
aimed at the right file.

## .why — proven from the clear alone, whatever the symlink does

the blank is written by `RDn`, and `RDn` blanks only while the file's refresh token **equals** the
one the server just rejected. so the last non-blank version of a blanked file is, by construction,
the rejected token. a revert of that same file always restores a dead refresh token (its access
token has at most the 5-minute refresh window left). this holds with or without the symlink
hypothesis below.

## .the variant that works — track every credential file, restore the newest live one

widen the history from one file to all of them: the global file **and** each actor's
`brain/.claude/.credentials.json`. an inotify watch (a systemd `.path` unit per dir, or one watcher)
keeps the last 10 non-blank versions across the set. when the global file stays blank past a
grace (15s), restore the newest version whose refresh token **differs** from the one just blanked
— that is the winner's, if one exists — then relink any actor file the winner broke.

this is `case=O10` with a history buffer: the buffer also covers a winner's file that a later
actor-dir write overwrote.

⚠️ the grace buys naught — no process self-heals the blank — so it should be as short as the
watcher can confirm a real blank rather than a mid-write glimpse.

## .citations — why the global file holds the dead token

the credential write refuses to follow a symlink (`O_NOFOLLOW` unless `followSymlinks`), so the
winner's write lands in its own actor dir — the symlink is replaced by a real file:

```js
async function Cn(e,t,n,r){return cQ(e,t,{mode:n,renameFn:r})}
async function cQ(e,t,n){ ... A=f===!0?0:o.O_NOFOLLOW ... }
```

the dead-token clear is a compare-and-clear — it blanks the file only while the file still holds
the dead refresh token:

```js
async function RDn(e,n){ ... mutate((g)=>{let h=g.claudeAiOauth;if(!h||h.refreshToken!==e)return g;
  return r=!0,{...g,claudeAiOauth:{...h,refreshToken:"",accessToken:"",expiresAt:0}}}) ... }
```

field corroboration, from the wish's measured topology: 18 symlinks and **2 real files** in actor
dirs — the shape this mechanism predicts.

✅ proven end to end — the store path, the temp-then-rename write, and the contrapositive live in
`define.invariant.a-blank-proves-the-winner-missed-the-global-file.md`.
