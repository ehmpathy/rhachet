# domain.term: reference

term.chosen   = reference
term.kind     = noun            # a mech translation-method qualifier (PERMANENT_VIA_REFERENCE)
term.synonyms.forbidden:
- pointer
- link
- alias

## .what

a keyrack grant mechanism where keyrack writes NO value — it holds a pointer (the exid) at a secret
placed out-of-band in an external store, and reads it live on unlock.

## .refs

- src/domain.operations/keyrack/adapters/mechanisms/getOneKeyrackMechAdapter.ts  (PERMANENT_VIA_REFERENCE)
- src/domain.operations/keyrack/adapters/vaults/aws.params/  (the point-at-an-SSM-param mode)

## .reason

see the ref-level cluster beside this choice:
- `term=reference._.choice.reason.md` — etymology, the reference-vs-replica axis, evidence
