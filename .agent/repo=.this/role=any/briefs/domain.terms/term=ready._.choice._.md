# domain.term: ready

term.chosen   = ready
term.kind     = adj
term.boundary = clone.socket
term.synonyms.forbidden:
- started
- up
- live
- awaitServerReady

## .what

the promise a clone socket server hands back that settles once its **bind** has an answer —
resolved on success, rejected on a fault, rejected on a stall.

⚠️ it is **settle-once**, and the whole point is WHERE it lives: inside the module that owns the
server. so the fault's owner is a fact of that closure rather than a claim about a caller.

## .refs

- src/domain.operations/clone/socket/genCloneSocketServer.ts (the `ready` member)
- src/domain.operations/clone/pty/genBrainCliPtyClone.ts (awaits it, kills the child on reject)
- src/domain.operations/clone/socket/genCloneSocketServer.integration.test.ts ([case13], [case14])

## .reason

- `term=ready._.choice.reason.md`
