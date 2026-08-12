# domain.term: unlock

term.chosen   = unlock
term.kind     = verb
term.synonyms.forbidden:
- open
- acquire
- load
- activate
- retrieve

## .what

to make a credential **available for the session** — the daemon holds it, so every later `get`
answers without a passphrase.

an unlock is a **write to the daemon**, never a read of a vault. that is the whole of the term, and
it is the part most easily lost.

```
vault → grant   → a GET  (one key comes back)
grant → daemon  → an UNLOCK (the session can now answer for it)
```

## ⚠️ .the two senses in code, and which one is canonical

`unlock` appears in two places in `unlockKeyrackKeys`, and they are **different acts**:

| call site | what it does | is it the canonical sense? |
|-----------|--------------|----------------------------|
| `daemonAccessUnlock({ socketPath, keys })` (`:336`) | hands the grants to the daemon, once, after the loop | ✅ **yes** — this IS the unlock |
| `adapter.unlock({ identity, exid, … })` (`:249`) | decrypts a vault so it can be read | ⚠️ a **vault** unlock — a precondition of a get, not this |

the second is the vault adapter's own word, inherited from `age`/`1password` where a vault is
literally locked. it is legal where it sits — a vault genuinely unlocks — but it is **not** what
`unlockKeyrackKeys` names.

## .the loop body is NOT an unlock

`unlockKeyrackKeys` is one loop over slugs (`:171-332`) and one daemon write after it (`:335`). the
loop body **pushes to an accumulator** — `keysToUnlock.push(...)` — and unlocks not one key. so:

- an operation extracted from that loop body is a **get**, and must be named one
  (`getOneKeyrackGrantForUnlock`), per `rule.require.get-set-gen-verbs`
- to name it `unlockOneKeyrackSlugAtReach` would promise a daemon write it does not perform

## .refs
- `src/domain.operations/keyrack/session/unlockKeyrackKeys.ts`  # the declared dop; `:336` is the unlock
- `src/domain.operations/keyrack/daemon/sdk/.../daemonAccessUnlock.ts`  # the write itself
- `src/contract/cli/invokeKeyrack.ts`  # `keyrack unlock`, the published command
- `src/domain.operations/keyrack/session/relockKeyrack.ts`  # the inverse

## .the pair

`unlock` ↔ `relock`. the inverse is **relock**, never "lock" — a key was locked to begin with, so to
lock it again is to *re*-lock (`rule.prefer.symmetric-term-pairs`).

⚠️ **`relock` is NOT `prune`, and the confusion is expensive.** a relock empties the daemon's
in-memory store; the **process lives on with the bytecode it was born with**. only
`keyrack daemon prune` replaces the code. a stale daemon serves wrong answers from source that reads
correct — see `term=prune._.choice.reason.md` for the hour that distinction cost.

## .reason
see the ref-level cluster beside this choice:
- `term=unlock._.choice.reason.md` — etymology, the overload dispute, evidence, invariants
