# rule.forbid.clone-config-misnomer

> **never name an artifact a clone's `config dir`. a clone owns no config — it REFERENCES its
> actor's brain dir, and that dir already has a settled word: `brain dir`.**

the term-level specialization of `rule.forbid.per-clone-config`. that rule forbids the per-clone
config **artifact**; this forbids the per-clone config **term**, which asserts the same forbidden
grain in prose and survives every review that only checks where files land.

## .why — the misnomer asserts a grain the model forbids

`define.brain-dir-repo-vs-actor` settles it: there are **exactly two** brain dirs, the repo's
and the actor's. a clone reads one of them and owns neither. so a `getCloneConfigDir` declares
a third, clone-scoped grain that does not exist — and the model it contradicts is the one
`rule.forbid.per-clone-config` already enforces at blocker.

three rules the one misnomer breaks at once:

| the defect | the rule |
|---|---|
| it asserts a clone-scoped config grain | `rule.forbid.per-clone-config` — a clone references, never owns |
| `config dir` beside the settled `brain dir` | `rule.forbid.domain-term-synonyms` — one concept, one word |
| the callers already said `brainDir` | `rule.forbid.domain-term-inconsistency` — one concept, two words |

🔴 **the third row is the sharpest, and it is measured.** 2026-09-25, this repo: **all three call
sites of `getCloneConfigDir` assigned its return to a variable named `brainDir`.** the contract
said one word and every caller said the other — so the codebase had already settled the term, and
only the declaration had not caught up. a misnomer that every caller silently corrects is a
misnomer no reviewer is prompted to catch.

## ⚠️ .the boundary — generic `config dir` prose is FINE

`define.brain-dir-repo-vs-actor` opens with *"a brain dir is the config dir a brain-cli reads"* —
so `config dir` as a general description of what a brain-cli reads is correct and stays. **the
defect is the CLONE-SCOPED form**: an operation, type, field, filename, or doc phrase that speaks
of a clone's own config dir.

| forbidden | fine |
|---|---|
| `getCloneConfigDir` | "a brain dir is the config dir a brain-cli reads" |
| `asCloneConfigDir` | `CLAUDE_CONFIG_DIR` — the cli's own env var, its word not ours |
| `cloneConfigDir: string` | `brainDir: string` |
| "the clone config dir is …" | "the brain dir this clone writes under" |

## .the test

> **whose config is it?**

- a **clone's** → the grain does not exist. it is the **actor's brain dir**, and the term says so
- a **brain-cli's**, described generally → `config dir` is correct, and untouched

| when… | then… |
|---|---|
| you declare an operation that yields the dir a clone reads | it SELECTS a brain dir. say `BrainDir`, never `ConfigDir` |
| a caller assigns the return to `brainDir` | 🔴 the contract already lost the argument. rename the contract |
| you would add a `config` field to a clone type | 🔴 read `rule.forbid.per-clone-config` first — a clone dir holds session artifacts only |
| the prose reads "a brain dir is the config dir a brain-cli reads" | correct, and untouched |
| you must reach for the cli's env var | `CLAUDE_CONFIG_DIR` is the cli's word. quote it, do not adopt it |
| a selector returns one of two extant brain dirs | say so in a `.note` — a SELECT mints no third grain |

## .enforcement

- a symbol, type, field, or filename that carries a clone-scoped config dir term = **blocker**
- a doc phrase that speaks of "the clone's config dir" = **blocker**
- generic `config dir` prose about what a brain-cli reads = **false positive**
- the cli's own `CLAUDE_CONFIG_DIR`, quoted as the cli's term = **false positive**

## .see also

- `rule.forbid.per-clone-config` — the parent: the artifact this rule's term would imply
- `define.brain-dir-repo-vs-actor` — the two kinds, and why `brain dir` is the word
- `rule.forbid.domain-term-synonyms` · `rule.forbid.domain-term-inconsistency` — the two term
  laws the misnomer breaks
- `catalog.of=actor-clone-design._.md` — the identity model both sit within
