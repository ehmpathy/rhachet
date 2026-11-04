# F13 — a same-user caller that `ss` cannot attribute is denied

## .the fork

the peer-line parser (F8) reads the caller's pid from the line whose peer column holds our inode.
where `ss` shows no process tuple there, the pid is null and the gate denies.

a level-3 reviewer (i006, enroll-impl-behavior-intent, item 2) named same-user callers that land
here: a caller in a pid namespace the clone's `/proc` cannot see (a sandboxed tool with the socket
bind-mounted), and a non-dumpable process. it asked whether such a say is supported, and if so for
a caller-visibility axis and catalog cell.

the choices:

- fail closed: an unattributable caller is denied, the same as another user's process
- fail open, or fall back to a weaker check (socket file mode, the kernel's own path permission)

## .taken

fail closed.

- the gate exists to keep another user's process out. a non-root `ss` shows another user's process
  with no tuple, so "no tuple" is exactly how an intruder looks; a pass on null is the defect F8
  closed
- before this PR the gate passed every caller (it read its own pid), so no supported flow ever
  rested on an unattributable caller that cleared a real check. the 72 `enroll.reach` acceptance
  cases (plain same-host callers) pass
- a weaker fallback is the issue's kernel-permission cure, already held out of scope (F4)
- the deny is named: the clone traces `could not read peer pid from ss`, and a distinct reply
  reason for a lookup fault is #683, which would also give this caller a truthful hint in place of
  the other-user copy

## .rework

clean. a namespace-aware read (SO_PEERCRED via a native module, or `/proc/<pid>/ns` checks) adds a
path beside this one; no caller depends on the deny's exact copy.

## .confidence

80% — no in-repo flow reaches a sandboxed same-user caller, but a supervisor tool might.

## .where

- `src/infra/socket/asSocketPeerPidFromSsPeerLine.ts` (null on no tuple)
- `src/domain.operations/clone/socket/genCloneSocketServer.integration.test.ts [case20]`
- ehmpathy/rhachet#683 (the lookup-fault reason)
