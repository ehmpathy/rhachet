# domain.term.choice.reason: socket.handover

## .etymology

**handover** is the plain domain word for a duty passed from one holder to the next while both are
briefly present. that overlap is the whole concept here: the successor has bound the path and the
predecessor has not yet exited, so for a window **both daemons are alive** and only one owns the
file.

`socket` is the boundary, so the term reads unambiguously against any other handover the repo might
later name.

## 🔴 .why `handoff` is forbidden — the word is already taken, in this repo, for a different concept

this is the sharp reason the term earns a cluster rather than a shrug.

| the word | its sense here | where |
|---|---|---|
| **handoff** | a driver transfers work to the **foreman** because a wall needs human authority | `5.3.verification.stone`, and the `*.handoff.v$N.to_foreman.md` artifact it names |
| **handover** | one **daemon** takes a socket path over from another | this term |

⇒ to reach for `handoff` for the socket sense would overload one word onto two unrelated concepts —
`rule.forbid.domain-term-ambiguity`, graded a blocker. the two are not even in the same domain: one
is an escalation to a human, the other is a race between processes.

⚠️ the near-collision was **not** caught by inspection of the glossary — `handoff` has no term file
either. it surfaced only because the stone that governs this round uses the word in prose. that is
the failure mode a glossary exists to retire, and it argues for the entry rather than against it.

## .why the other candidates were rejected

| rejected | why |
|---|---|
| `takeover` | names the successor's act alone, and drops the predecessor. the concept's whole content is the **overlap** — a word that hides one party cannot carry it |
| `transfer` | implies a coordinated give-and-receive. no coordination occurs: the predecessor is never told, and learns only when its own ownership check fails |
| `failover` | implies the predecessor **failed**. it did not — it is healthy, still serving, and exits later on an ordinary idle timeout. to name a healthy overlap a failure would mislead every reader of a log line |

## .evidence

**the concept is load-bearing in production, not merely descriptive.** `unlinkOwnFiles` in
`startKeyrackDaemon.ts` reads the pid file and stands down when it names another process:

```ts
if (pidOwner !== String(process.pid)) return;
```

that guard exists for exactly one reason — a handover may have happened — and its own comment spells
the consequence out: were it to unlink by path alone, a dead predecessor would delete a **live**
successor's socket and pid, and the successor would serve on with no file on disk, unreachable to new
clients and invisible to `daemon prune` for as long as it lived.

**and the concept has a measured cost.** `[case11]` reddened twice because its poll budgeted 5000ms
for the handover against a 4000ms idle window — so the predecessor died mid-handover and correctly
removed the file it still owned. the defect is only nameable in one sentence once the window has a
word.

## .invariants

- a handover has **exactly two** parties, and both are alive for its duration; a window with one
  live daemon is not a handover
- the **pid file is the ownership record** — the socket file is not, because the successor's bind
  already replaced it
- a predecessor may exit at any point during a handover, and its exit is **ordinary**, never a fault
- during the window the pid file may be **transiently absent** — between a predecessor's unlink and a
  successor's write — so every reader of it owes an `ENOENT` retry, never a throw
