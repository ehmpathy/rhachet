# F27 — the leaf refusal's text serves two readers in one hint, and `via` / `why` share "repl brain"

**the fork:** (a) keep one `hint` that speaks to both of its readers (a reviewer clone, and a human
in a shell a reviewer opened), and let `via` (the door the caller used) and `why` (what spawned this
process) both say "a repl brain" · (b) split the hint per reader, and reword `why` so the phrase
appears once.

**taken:** (a).

- the refusal fires in one place for every door, with no way to tell which reader holds the shell.
  a clone and a human see the same stderr, so one hint has to name the move for each. the two
  clauses are labelled in the text (*"a reviewer clone, …: do not retry"* · *"a human in a shell a
  reviewer opened: run the same command from a fresh terminal"*). the human's clause names no
  command, so it holds at every door; a refused `rhachet ask` is never told to run `rhx enroll`
- in both keys "a repl brain" means one sense: a brain reached through `rhx review`, `rhachet ask`
  or `rhachet act`. `via` says the caller is one, and `why` says one spawned this process. one
  sense, read from two sides
- (b) splits a contract string that seven snapshot files pin (the enroll and pty acceptance
  suites among them) into per-reader text the refusal cannot choose between. the misreads a
  reviewer did report — a bare "one" in `why`, and `rhx enroll` named at the repl doors — were
  repaired in place, within (a)

**rework:** clean — a string change plus a whole-file resnap of each pinned suite.

**confidence:** 75%. a split hint would scan faster for a human; the council may prefer it.

**where:** `src/domain.operations/spawn/assertCloneSpawnAllowed.ts`.

**verdict:** —
