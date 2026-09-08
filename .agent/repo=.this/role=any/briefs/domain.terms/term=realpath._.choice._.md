# domain.term: realpath

term.chosen   = realpath
term.kind     = noun
term.synonyms.forbidden:
- resolvedpath
- canonicalpath
- truepath
- actualpath

## .what
a filesystem path with every symlink followed — where a module ACTUALLY lives, not how it was reached.

## .refs
- src/domain.operations/clone/getRhachetRealpathFromProcess.ts   # the read
- src/domain.operations/clone/asCloneSocketOmissionReasonError.ts      # the `rhachetRealpath` field

## .reason
see the ref-level cluster beside this choice:
- `term=realpath._.choice.reason.md` — etymology, the nullability rule, evidence
