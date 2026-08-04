# domain.term: replica

term.chosen   = replica
term.kind     = noun            # a mech translation-method qualifier (PERMANENT_VIA_REPLICA)
term.synonyms.forbidden:
- copy
- mirror
- stored-secret

## .what

a keyrack grant mechanism where keyrack ITSELF acquires the secret and writes a copy into a vault
it owns — so the stored value is keyrack's replica of the secret.

## .refs

- src/domain.operations/keyrack/adapters/mechanisms/mechAdapterReplica.ts
- src/domain.operations/keyrack/adapters/mechanisms/getOneKeyrackMechAdapter.ts  (PERMANENT_VIA_REPLICA)

## .reason

see the ref-level cluster beside this choice:
- `term=replica._.choice.reason.md` — etymology, the replica-vs-reference axis, evidence
