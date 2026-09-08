# domain.term: refused

term.chosen   = refused
term.kind     = adj
term.boundary = pty
term.synonyms.forbidden:
- denied
- exhausted
- unavailable
- rejected

## .what

the HOST would not hand node-pty a pty device, though the addon itself loaded fine.

it names the **verdict of the host**, never the state of our install — which is the whole reason it
is a separate word from `absent` (the addon could not be loaded at all).

## .refs

- src/domain.operations/clone/asPtyDeviceRefusedError.ts
- src/domain.operations/clone/pty/isPtyDeviceRefusedError.ts
- src/domain.operations/clone/genCloneOndisk.ts

## .reason

- `term=pty.refused._.choice.reason.md`
