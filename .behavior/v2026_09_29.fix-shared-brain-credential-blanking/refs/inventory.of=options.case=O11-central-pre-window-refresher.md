# option O11: a central refresher that keeps the shared file fresh ahead of the window

## .what

one process on the box refreshes `~/.claude/.credentials.json` before any clone's 5-minute window
opens, so no clone ever reaches its own refresh.

## .verdict — ⛔ a residual of the same defect

- ❌ still N locks — each actor keeps its own `_S()` locks over the symlinked file
- ❌ a clone that wakes inside the window (a slow refresher, a clock skew, a failed refresh) still
  races the others with no lock between them
- ❌ still the symlink — the first clone that does refresh detaches (`ref.claude-code.credential-store.write.md` claim 2)

⇒ it shrinks the window the race needs; it does not remove the race. `case=O3` removes it.
