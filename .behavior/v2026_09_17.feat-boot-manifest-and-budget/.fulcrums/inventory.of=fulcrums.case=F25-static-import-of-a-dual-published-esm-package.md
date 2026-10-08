# F25 — is a static import of a DUAL-published esm package an eager-esm violation?

- **rework** = **clean** — one import line and its docblock; no caller sees a shape change either way
- **status** = 🔴 **DISPUTED** — the rule's premise does not hold for this package, and the package
  is measured rather than read
- **confidence** = 🔴 **97%.** the 3% is that `js-tiktoken` could drop its cjs entry in a future
  major, which would make the concern correct retroactively
- **where** = `src/domain.operations/brainCost/getOneBrainTokenEncoder.ts:1`
- **raised** = 2026-09-19, at `5.1.execution` `review.peer r001` (`repo-rules` nitpick.1)

---

## .the fork

`rule.forbid.eager-esm-imports-in-prod` forbids a static top-level import of a pure-esm package in
`src/`. a new production module imports `js-tiktoken` statically:

```ts
import { encodingForModel, type Tiktoken } from 'js-tiktoken';
```

and `js-tiktoken` declares `"type": "module"`.

| option | what it costs |
|---|---|
| **A** — route it through `getOneLazyEsmModuleLoader` | conforms to the rule as literally read, and it makes every token count `async` — which ripples into `calcBrainTokens`, `calcBrainOutputCost`, and the sdk surface that re-exports them |
| 🔴 **B** — keep the static import, and DISPUTE the premise (taken) | one import line stands, and it needs a measurement on the record so the next reader does not re-raise it |

---

## .taken, and why

🔴 **taken: B.** the rule targets a package a CJS consumer cannot `require`. this package **can** be
required, so the rule's premise is absent here:

```
$ rhx get.package.format --package js-tiktoken

📦 get.package.format --package js-tiktoken
   ├─ version: 1.0.18
   ├─ manifest
   │  ├─ type: module
   │  ├─ main: ./dist/index.cjs
   │  └─ exports['.'].require: ./dist/index.cjs
   ├─ probe (node v24.20.0 — THIS runtime only)
   │  └─ require(): ✅ loads
   └─ verdict: dual
```

⇒ `main` and `exports['.'].require` both point at a real `.cjs` entry, built by tsup with
`format: ['cjs', 'esm']`. a cjs consumer that `require`s this package gets that file.

🔴 **the two facts that coexist, and the one that decides a consumer's fate:**

| the fact | what it governs |
|---|---|
| `"type": "module"` | the package's own `.js` files — how NODE parses them |
| `exports['.'].require: ./dist/index.cjs` | 🔴 what a CJS consumer actually receives |

⇒ the first is the field a reader checks, and it is TRUE. the second is the field the rule's hazard
turns on, and it refutes the hazard. **a dual package satisfies both, which is exactly why it looks
like a landmine and is not one.**

---

## 🔴 .why the VERDICT reads the manifest and not the probe

the rule's own text warned this: *"a modern node CAN `require()` an esm package, so that signal is
node-version-bound and can false-pass."*

⚠️ **and that caution is measured, not hypothetical.** re-measured 2026-09-19: `age-encryption` —
the package this repo routes through `getOneLazyEsmModuleLoader` precisely because it is esm-only —
probes `✅ loads` on node v24. a probe-only verdict would have called it safe.

⇒ so `get.package.format` reports the **manifest** verdict, which is what a consumer gets, with the
probe beside it and its runtime named. **that separation is the whole reason the skill exists**, and
it is what makes this dispute a one-command settlement rather than a fresh argument each round.

---

## .what would flip it

- `js-tiktoken` drops `exports['.'].require` in a future major ⇒ the verdict becomes `esm-only` and
  option A becomes owed. **the trigger is checkable**: `rhx get.package.format --package js-tiktoken`
  reports `esm-only` rather than `dual`
- a real CJS consumer reports a load failure against a version whose manifest still declares a cjs
  entry ⇒ the manifest would then be false, and the verdict's basis would need to change

🟡 **the first is why the verify command is inline at the import site** rather than only here. a
fulcrum row is read by a council; the docblock is read by whoever next touches the line.

---

## .the clamps

**none, and that is the honest answer.** this is a dispute about a rule's premise, not a behavior
change, so there is no code path a test could pin. what stands in for a clamp is the **measurement
command**, which any reader can re-run in one step and which fails loud if the premise changes.

⚠️ **the acceptance tier does carry `blackbox/sdk/importEsmSafe.realnode.acceptance.test.ts`**,
which exercises the lazy-loader boundary for packages that genuinely need it. `js-tiktoken` is
deliberately not routed through it, and that absence is what this row records.

---

## .see also

- `rule.forbid.eager-esm-imports-in-prod` (mechanic) — the rule disputed, and the source of the
  probe caution this row relies on
- `.agent/repo=.this/role=any/skills/get.package.format.sh` — the instrument, and its own docblock
  argues the manifest-over-probe split
- `rule.forbid.domain-term-synonyms` — the pattern this dispute follows: a rule that offers a
  dispute path expects the dispute to be recorded rather than the rule quietly ignored
- `F24` — the other DISPUTED row raised by a peer review, and the contrast: `F24` disputes a brief
  **this behavior wrote**, where this disputes a rule whose premise a measurement refutes
