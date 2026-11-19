# F29 · a revision's files trust the actor dir, with no re-hash on findsert and no read-only mode

## .the fork

- **a.** `genActorBootRevision` keeps an extant `boot.md` as is: the dir name is the hash of the
  bytes it was cut from, and the actor dir is the trust boundary
- **b.** re-hash an extant `boot.md` on each findsert, or write both revision files `0444`, so a
  clone that edits a shared revision cannot poison the other clones on it

## .taken = a

- the actor dir sits at `<repo>/.agent/.actors/…`, inside the repo every clone already runs in.
  a clone with a write tool reaches the revision files from its cwd, with or without `--add-dir`.
  so `--add-dir` grants no write reach the clone lacked; it only names the dir as memory
- the same clone can already edit the actor's `boot.md`, `settings.of.repo.json`, and every brief
  under `.agent/`, each of which reaches every peer clone on its next spawn. a guard on the
  revision files alone would close one door of many in the one trust domain
- a re-hash costs a full read and a hash of the boot on each spawn; `0444` is undone by any writer
  that owns the dir. neither bounds a writer that the repo already trusts

## .rework = clean

one `asBootContentHash` compare in `genActorBootRevision`, and a rewrite on mismatch; or a mode
on the two `setFileAtomic` calls. no caller moves.

## .confidence = 80%, why

the argument rests on the clone's cwd above the actor dir, which holds for every enroll today. an
actor dir moved out of the repo (a grove-level actor store) would reopen it.

## .where

`src/domain.operations/boot/genActorBootRevision.ts`. answers r11 item 5 (level 3, i007).

## .verdict

owed — a council rules at the close.
