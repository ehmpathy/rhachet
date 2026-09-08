# domain.term.choice.reason: orphan

## .etymology

from the unix sense of an **orphan process** — a child whose parent exited before it did, so it is
re-parented to `init` and no longer has anyone who awaits it. the repo generalizes that one step:
the parent need not be a process, and the child need not be alive. what carries over is the part
that matters — **the thing responsible for this resource's end of life is gone, and the resource
is still here.**

the word was already in use across five subsystems before it was itemized, and used consistently,
which is the strongest evidence a term is discovered rather than invented.

## .why not the alternatives

| rejected | why |
|----------|-----|
| `stray` | names no owner. a stray was never owned; an orphan **was**, and that history is the whole point — it says a teardown route failed |
| `dangler` | names a broken *reference* — a pointer whose referent is absent. an orphan is the opposite polarity: the referent survives and the referrer is gone |
| `leftover` | too weak. it reads as harmless residue, where an orphan holds a lock, a socket address, or a pty |
| `zombie` | in unix this is a **precise and different** state — a process that has exited and whose parent has NOT yet collected it. an orphan's parent is gone entirely. to borrow it would collide with a term the host os already owns |
| `abandoned` | implies intent. a leak is a defect, not a decision |
| `leaked` | names the **mechanism**, not the artifact — see below, this is the confusion worth guarding |

## ⚠️ .the leak / orphan split, and the measurement that earned it

**measured 2026-09-04**, on this host, while a flake in the pty integration suite was chased.

`.behavior/v2026_07_31.fix-keyrack-daemon-leak` had shipped, so the daemon leak was taken as
closed. the runtime dir said something more precise:

| what | state |
|------|-------|
| daemon **processes** — `case1..case4`, `ownerA`, `ownerB` | **6 of 6 dead** ✅ the leak is closed |
| daemon **files** — their `.sock` + `.pid` | **12 still on disk** ❌ the orphans remain |
| the one live daemon — `ehmpath` | alive, correctly |

the shipped fix works by an `exit` handler that unlinks both files. an `exit` handler cannot run
under `SIGKILL`, which is what a `--forceExit` test teardown delivers — so the route that produces
the most orphans is the one route the fix cannot reach.

⇒ **the fix was correct and the orphans persisted.** that is only expressible with two words. with
one, the sentence "the leak is fixed" is simultaneously true and misleading, which is exactly how
the state came to be assumed rather than checked.

⚠️ **the same round produced a second, larger instance:** ~400 orphan `clone.<uuid>.<hash>.sock`
files, all from one day's test runs. same shape, different subsystem — which is what promoted this
from a local note to a repo-boundary term.

## ⚠️ .a corollary worth keeping — an orphan can read as its own cure

`prune --owner @all` over a set of orphaned files reports a kill per file. those reports are
**phantom kills**: the processes were already dead, and what left disk was the file.

`startKeyrackDaemon`'s own comment predicted this before it was observed. it still misled a reader
in the moment (this one), who took the prune's report as evidence that live processes had been
killed. ⇒ **a prune's output counts artifacts removed, never owners killed**, and the two are only
the same number when there is no orphan.

## .evidence

- discovery: the term was found in use across `clone`, `keyrack`, `brains`, `role`, and `upgrade`
  before itemization — including a declared dop (`pruneOrphanedRoleHooksFromAllBrains`) and an
  internal contract field (`getRoleFileCosts` → `{ refs, orphans }`)
- measurement: 2026-09-04, `/run/user/<uid>` on the dispatcher's host, pid liveness read from
  `/proc/<pid>` per the pid files
- invariant it serves: `define.invariant.clone-prune-safety`, and the "no orphan socket" guarantee
  stated in `genCloneSocketServer`
