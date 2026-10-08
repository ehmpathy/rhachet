# rule.forbid.treestruct-in-a-budgeted-payload

> **a treestruct is for a HUMAN at a terminal. never for a payload a budget gates.**
> box-drawn glyphs cost ~4x their apparent size, so a tree that is SHORTER in chars is DEARER
> in tokens.

## .why — chars and tokens disagree, and the budget reads tokens

measured 2026-09-22 with `rhx calc.tokens` (`o200k_base`), over one real `briefs.ref` block — the
59-entry `ehmpathy/role=mechanic` set — rendered two ways:

| shape | chars | tokens | chars/token |
|---|---|---|---|
| flat hoist — one `base=`, then bare relative paths | 3,545 | **1,025** | **3.46** |
| treestruct — `├──` / `│` / `└──`, dirs nested | 🔴 **3,281 (−7.4%)** | 🔴 **1,161 (+13.3%)** | 🔴 **2.83** |

🔴 **the tree wins on every intuition and loses on the only axis that gates.** it is shorter, it
dedupes every repeated directory prefix, and it reads better — and it still costs **136 more
tokens**, because its density collapses from 3.46 to 2.83.

⇒ `│   ` is four characters and is **not** four cheap ones: the box-drawn glyphs are multi-byte
UTF-8 outside the merges a bpe vocabulary learned from prose, so each renders as its own token or
worse. a flat line's first characters are ordinary ascii the tokenizer has seen a billion times.

## 🔴 .the trap — the dedupe argument is real and still loses

the case for the tree is not weak, which is what makes it dangerous:

- it removes `code.prod/pitofsuccess.procedures/` from **nine** lines and states it once
- it is genuinely fewer characters
- every other render in this repo is a treestruct, so it reads as the house style

⚠️ **and all three are true.** the dedupe saved 264 chars; the glyphs then spent 136 tokens.
**a char cut is not a token cut**, and on a glyph-heavy render the two have opposite signs.

## .the test

> **does a MACHINE consume this, under a token budget?**

- yes → **flat**. hoist the shared base into an attribute, emit bare relative paths
- no — a human reads it in a terminal → **treestruct**, and it is the right choice there

## .the cues

| when… | then… |
|---|---|
| you render a resource list into a **boot payload** | 🔴 flat. the budget gates tokens, and the tree loses on tokens |
| you would dedupe a repeated path prefix by **nested dirs** | measure it. a nest trades ascii for box-drawn glyphs, which is a bad trade |
| you reach for a tree because *"it is shorter"* | 🔴 shorter in **chars**. run `rhx calc.tokens` before you believe it |
| you render a **status line, a halt, a help text** | treestruct. a human reads it, and no budget gates it |
| you would apply this rule to `<stats>` or the over-budget halt | ⚠️ do not — those are human surfaces. this rule governs the **payload**, never the chrome around it |

## 🟡 .the bound — this forbids a treestruct in ONE place

`rule.require.treestruct-output` (ergonomist) is not weakened. it governs what a **human** reads,
and it is right there. this rule carves out the one context where the human is not the consumer:
the resource manifest a `boot.yml` renders and a `budget.tokens` refuses.

⇒ so the repo renders **both**, on purpose: a treestruct `<stats>` block wrapped around a flat
`<briefs.ref>` body. that is not an inconsistency — it is two audiences in one document.

## .enforcement

- a treestruct in a resource list a budget gates = **blocker**
- a render shape chosen on a char count where a token count was available = **blocker**
- a flat list on a surface a human reads = **blocker** (`rule.require.treestruct-output`)

## .see also

- `rule.require.treestruct-output` (ehmpathy/ergonomist) — the rule this carves one exception from
- `.agent/repo=.this/role=any/skills/calc.tokens.sh` — the instrument that settles it
- `howto.entool-a-measurement-as-a-skill` — why the number above is reproducible rather than quoted
- `rule.prefer.emoji-language` — the other place a glyph's cost is weighed against its signal
