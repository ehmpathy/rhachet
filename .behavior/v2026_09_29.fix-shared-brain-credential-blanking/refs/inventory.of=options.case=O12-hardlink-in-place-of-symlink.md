# option O12: a hardlink in place of the credential symlink

## .what

link each actor's `.credentials.json` to `~/.claude/.credentials.json` by hardlink, not symlink, so
the store's `O_NOFOLLOW` and refused-symlink paths see a regular file.

## .verdict — ⛔ detaches on the first write

- the write stages a temp beside the path and renames it over the path
  (`ref.claude-code.credential-store.write.md` claim 2). rename replaces the directory entry, so a
  hardlink detaches exactly as a symlink does
- ❌ still N locks — the locks key on `_S()`, which stays per actor
