# domain.term: policy

term.chosen   = policy
term.kind     = noun
term.status   = DECLARED
term.synonyms.forbidden:
- posture
- mode
- kind
- capability
- support
- strategy
- stance
- config
- rule (for this concept — the word is spent on the `rule.*` briefs)

## .what

**a declared, exhaustive, per-member statement of how one axis treats a reach — data the code
reads, never prose it restates.**

two instances exist, one per axis, and they are deliberately parallel:

```ts
KEYRACK_MECH_REACH_POLICY : Record<KeyrackGrantMechanism, 'DERIVED' | 'DECLARED' | 'REFUSED'>
KEYRACK_VAULT_REACH_POLICY: Record<KeyrackHostVault,      'ADDRESSED' | 'UNADDRESSABLE' | 'VIA_MECH'>
```

the `Record<Union, …>` is the half that carries the weight: **a new mech or vault cannot compile
until it declares its policy.** the compiler enforces coverage; a conformance test enforces
truth.

## ⚠️ the invariant the word carries

> **the table is the authority. every guard READS it; none restates it.**

this is what separates a policy from a comment that claims one. as of 2026-08-06 both guards
self-check against their own table before they refuse:

| guard | reads | throws when the caller mis-wired it |
|-------|-------|-------------------------------------|
| `assertKeyrackReachAbsent` | `KEYRACK_MECH_REACH_POLICY` | `UnexpectedCodePathError` — *"whose reach policy is …"* |
| `assertKeyrackReachAddressable` | `KEYRACK_VAULT_REACH_POLICY` | same shape, same error class |

`UnexpectedCodePathError`, never `ConstraintError`: a mis-wire is a **wire defect**, so it must
be loud toward the maintainer. to answer it with a `ConstraintError` would refuse a reach the
human legitimately holds.

## .why a policy is not boolean

each table has **three** values, and the third is the one that earns the noun:

| axis | third value | what it means |
|------|-------------|---------------|
| mech | `DERIVED` | the mech MINTS against the reach — it reads the label |
| vault | `VIA_MECH` | the vault holds no policy of its own; it **defers** to the mech axis |

a delegation is not a capability and not a support flag. any two-valued word (`support`,
`capability`) collapses the third case into one of the other two, and the collapse is exactly
where a human gets handed a correct refusal with a false cause.

## .why not one of the forbidden words

| word | why it is forbidden |
|------|---------------------|
| `posture` | describes a stance an adapter *holds* — an observed property. a policy is **declared**, and it binds behavior. worse, `KeyrackKeyGrade`'s own doc already spends *"security posture"* on a different concept, so the word sits one overload from ambiguity. ⚠️ it appears in **comments** in `KeyrackVaultReachPolicy.ts`, which `rule.forbid.domain-term-synonyms` explicitly allows — a comment may describe a concept from an alternate perspective. it is forbidden in **contracts** |
| `mode` | a mode is one a caller switches. a policy is a fact about a member that no caller can switch |
| `kind` | `rule.prefer.kind-over-type` spends `kind` on the taxonomy of the member **itself**. a policy is about **treatment**, not identity — `os.direct` and `os.secure` are different vaults of the same policy |
| `capability` / `support` | both read boolean, and both describe what a member CAN do. `VIA_MECH` is neither — it is a delegation |
| `strategy` | GoF vocabulary; implies interchangeable algorithms picked at run time. these are fixed facts per member |
| `config` | implies human-tunable. an adapter's reach policy is a property of the adapter, never a knob a human turns |
| `rule` | spent on `rule.*` briefs — prose guidance for humans. a policy is machine-read data |

## .refs

the declarations:
- `src/domain.objects/keyrack/KeyrackMechReachPolicy.ts`
- `src/domain.objects/keyrack/KeyrackVaultReachPolicy.ts`

the guards that read them:
- `src/domain.operations/keyrack/reach/assertKeyrackReachAbsent.ts`
- `src/domain.operations/keyrack/reach/assertKeyrackReachAddressable.ts`

the sweeps that prove them true:
- `src/domain.operations/keyrack/adapters/mechanisms/mechReachPolicy.conformance.test.ts`
- `src/domain.operations/keyrack/adapters/vaults/vaultReachPolicy.conformance.test.ts`

⚠️ **counts decay; re-derive, never re-assert.** to cite a number, re-run
`grep -rn 'ReachPolicy' src` rather than trust a prior figure.

## .reason
see the ref-level cluster beside this choice:
- `term=policy._.choice.reason.md` — etymology, disputes, evidence
