# domain.term: human

term.chosen   = human
term.kind     = adj
term.synonyms.forbidden:
- short
- abbreviated
- display
- pretty
- friendly

## .what
a suffix qualifier that names the lossy, read-only, human-legible representation-variant of a
domain value. `CloneSerialHuman` = a clone's serial in human form (the first uuid segment) — kept
for a person to read + type, never the stored value. adopted from the iso-price precedent, where
`IsoPriceHuman` ('$50.37') is the lossy display view beside the canonical `IsoPriceWords`.

## .refs
where the term is declared / used, plus notable examples:
- src/domain.operations/clone/asCloneSerialHuman.ts       # the cast + the branded type
- src/domain.operations/clone/getOneCloneByRef.ts         # the prefix-reach that keeps the human form addressable
- iso-price (IsoPriceHuman)                                # the precedent this term mirrors

## .reason
see the ref-level cluster beside this choice:
- `term=human._.choice.reason.md` — etymology, disputes, evidence
