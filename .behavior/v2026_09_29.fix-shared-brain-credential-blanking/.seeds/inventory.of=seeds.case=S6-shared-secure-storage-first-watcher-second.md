# seed S6: shared secure storage first, the symlink watcher second

## .said

> ok so we could then precommend CLAUDE_SECURESTORAGE_CONFIG_DIR='' prefered as the lowest effort, the ninotify symlink as the second option?

> in order of preference second that is

> dont build the fallback if the preferred is proven to work

## .settled

- preferred cure: spawn each clone with `CLAUDE_SECURESTORAGE_CONFIG_DIR=''`, so the credential file
  and its locks live in `~/.claude` while the config dir stays per actor. it is the lowest effort
- second, in order of preference: an inotify watch that catches an actor's credential symlink
  swapped for a real file, adopts it into the global file, and relinks
- the fallback is documented, not built. it is built only if the preferred cure is proven not to work

## .landed

- `refs/inventory.of=options._.md` — `.recommendation`
- `refs/inventory.of=options.case=O3-relocate-the-secure-storage-dir.md`
- `refs/inventory.of=options.case=O10-adopt-the-winner.md`
