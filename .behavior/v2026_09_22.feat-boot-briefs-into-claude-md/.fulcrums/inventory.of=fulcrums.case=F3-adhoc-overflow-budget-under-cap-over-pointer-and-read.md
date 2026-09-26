# F3 — adhoc overflow: budget-under-cap (A) over pointer+Read (B)

## .fork

the adhoc corpus rides the `SessionStart` hook, capped at 10,000 chars.

| option | mechanism | verdict |
|---|---|---|
| **A. budget under the cap** | the peer branch's `budget: { tokens: N }` halts an over-budget boot at author time | ✅ **taken** |
| B. pointer + `Read` | the hook names a path; the clone reads it | ❌ the clone may skip the read |
| C. a skill | loads on the model's discretion | ❌ |
| D. a `paths:`-scoped rule | dies at `/compact` | ❌ |

## .verdict — RULED (S10): A, plus a manifest header

- *"let's start with A for now… that way, folks can write thinner behavior yields."*
- the adhoc emit leads with every brief path, so truncation cuts content and never the manifest.

## .grounds

- A is built, on `beav/feat-boot-manifest-and-budget`; a halt at author time beats a truncation at
  runtime.
- the bound is a discipline, not a cost: each remedy (catalogize · condense · reference · eliminate)
  improves the artifact.
- the role corpus leaves the hook path entirely (F1), so the cap binds the adhoc corpus alone.

## .where

- out of this blueprint's scope — vision `.out of scope`, the peer branch owns it (F13)
- dream `per-file-emits-may-lift-the-adhoc-boot-bound` · seed S10
