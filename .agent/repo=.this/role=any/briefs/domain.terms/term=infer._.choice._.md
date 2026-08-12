# domain.term: infer

term.chosen   = infer
term.kind     = verb
term.status   = ⚠️ **DISPUTED — open.** see `.reason`. do NOT add a new `infer*` until it closes
term.synonyms.forbidden:
- deduce
- determine
- compute
- (plus the word `rule.forbid.term=resolve` already bans repo-wide)

## .what

**derive a value the caller did not supply — and, where it cannot be derived, ASK a human for it.**

that second half is the whole claim to a word of its own. a `get` retrieves or computes from what it
already holds; an `infer` may reach a point where no value can be computed and a human must answer.

```
which mechanism?
├─ 1. PERMANENT_VIA_REPLICA — static secret (api key, password)
└─ 2. EPHEMERAL_VIA_GITHUB_APP — github app installation (short-lived tokens)
choice: _
```

## ⚠️ .the dispute — `infer*` is not a sanctioned verb prefix

`rule.require.get-set-gen-verbs` names four core verbs (`get` / `set` / `gen` / `del`) plus two
transformer prefixes (`as*` / `is*`), and states that *"deterministic derivation stays a get
compute-subtype."* an operation without a sanctioned prefix is a **blocker** under that rule.

there are **7** `infer*` operations in this repo today, and they do not all behave alike — which is
why this is a dispute rather than a plain violation:

| operation | async? | prompts a human? | reads as… |
|-----------|--------|------------------|-----------|
| `inferKeyrackMechForSet` | ✅ | ✅ | a genuine `infer` |
| `inferKeyrackVaultFromKey` | ❌ | ❌ | a `get` compute-subtype |
| `inferKeyrackMechForGet` | ❌ | ❌ | a `get` compute-subtype |
| `inferKeyrackEnvForSet` | ❌ | ❌ | a `get` compute-subtype |
| `inferKeyrackKeyStatusWhenNotGranted` | ❌ | ❌ | a `get` compute-subtype |
| `inferKeyGrade` | ❌ | ❌ | a `get` compute-subtype |
| `inferRepoByRole` | ❌ | ❌ | a `get` compute-subtype |

**one of seven** carries the sense that would justify the word. the other six look like `get` under
a synonym — which is the exact shape `rule.forbid.domain-term-synonyms` forbids.

## .refs
- `src/domain.operations/keyrack/inferKeyrackMechForSet.ts`  # the only one that prompts
- `src/domain.operations/keyrack/inferKeyrackVaultFromKey.ts`
- `src/domain.operations/keyrack/inferKeyrackMechForGet.ts`
- `src/domain.operations/keyrack/inferKeyrackEnvForSet.ts`
- `src/domain.operations/keyrack/inferKeyrackKeyStatusWhenNotGranted.ts`
- `src/domain.operations/keyrack/grades/inferKeyGrade.ts`
- `src/domain.operations/invoke/inferRepoByRole.ts`

## .reason
see the ref-level cluster beside this choice:
- `term=infer._.choice.reason.md` — the open dispute, its two candidate outcomes, and why it is
  not settled here
