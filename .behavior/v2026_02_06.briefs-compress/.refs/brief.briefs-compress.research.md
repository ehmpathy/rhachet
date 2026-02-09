# briefs compression: research + concept

## .what

compress `.md` briefs into `.md.comp` — a machine-optimized format that LLMs understand but humans wouldn't want to read. analogous to `.js` → `.min.js`.

## .why

ehmpathy mechanic role loads ~58k tokens of briefs at session start. that's 29% of a 200k context window before a single message. compression can reclaim ~25-30k tokens (40-50% reduction) without degrading agent comprehension.

## .prior art

### telegraphic semantic compression (TSC)

removes predictable grammatical elements LLMs can reconstruct from context. keeps high-entropy content (nouns, verbs, numbers, domain terms).

**removes:** articles (a, the), prepositions (of, in, for), auxiliary verbs (is, was, are), filler words (just, really, basically), conjunctions where context is clear, pronouns when referent is obvious

**keeps:** nouns, verbs, numbers, entity names, domain-specific vocabulary, code identifiers, enforcement levels

**ratio:** ~40-60% token reduction, minimal comprehension loss for LLMs

**source:** https://dev.to/devasservice/telegraphic-semantic-compression-tsc-a-semantic-compression-method-for-llm-contexts-1akl

### symbolic metalanguages (MetaGlyph)

replaces verbose natural-language instructions with math symbols LLMs already know from training data (∈, ¬, ∩, →, ⇒).

**ratio:** 62-81% token reduction across task types

**tradeoff:** higher compression but less readable even for LLMs on nuanced rules. best for structured/logical constraints, not prose guidance.

**source:** https://arxiv.org/html/2601.07354v1

### LLMLingua (microsoft research)

uses a small LM to score token importance and remove low-information tokens. up to 20x compression with 1.5% performance loss.

**tradeoff:** requires model inference at build time. heavier tooling dependency.

**source:** https://llmlingua.com/

## .recommended approach: TSC + structural compression

TSC is the sweet spot for briefs:
- no tooling dependency (deterministic string transforms)
- human-auditable (compressed output is still english-ish)
- reversible (keep `.md` source, generate `.comp` at build)
- ~50% savings which is massive at 58k baseline

### compression transforms (ordered)

| transform | description | savings |
|-----------|-------------|---------|
| dedup | remove duplicate/subset briefs | ~5% |
| trim examples | keep 1 good + 1 bad example max per rule | ~20% |
| strip markdown formatting | remove `#`, `**`, `---`, excess whitespace | ~5% |
| telegraphic rewrite | remove articles, prepositions, filler | ~15% |
| collapse tables | terse `key=value` notation | ~5% |
| merge related rules | consolidate groups into single files | ~5% |

### example: before vs after

**before** (~700 tokens):
```markdown
### .tactic = args:input-context

#### .what
enforce hard requirement that all procedure args to follow the canonical
pattern: `(input, context?)` — even for simple one-liners

#### .why
- promotes long-term clarity and change-resilience over short-term brevity
- prevents positional argument confusion
- supports context injection without argument churn
- aligns with domain patterns: input = upstream data, context = runtime environment
- enables safe refactors and consistent documentation across codebase

#### .where
- applies to **all function definitions** (sync or async)
- required for all exported and internal functions in production code
- expected in tests, hooks, utils, and logic modules
- only anonymous inline callbacks are **exempt** if tightly scoped

#### .how

##### 👍 required
- every function must accept exactly:
  - one `input` arg — a destructurable object
  - optional second `context` arg — also a destructurable object

##### 👎 forbidden
- more than 2 positional args
- non-destructurable inputs
- context blended into input
- inline positional args unless anonymous

#### .examples

##### 👍 positive
export const genRoute = async (input: { slug: string }, context?: { traceId?: string }) => { ... }
const updateUser = ({ userId }: { userId: string }, context: { userDao: UserDao }) => { ... }

##### 👎 negative
export function doThing(a, b, c) {}              // positional args & function keyword
handleRequest(input, options, env)               // more than two args
export const getTotal = (invoice) => ...         // input not typed
```

**after** (~150 tokens):
```
rule=args:input-context. all procs follow `(input, context?)` pattern.
input=destructurable obj. context=optional destructurable obj.
scope: all fn defs, sync+async, prod+test. exempt: tightly scoped anonymous callbacks.
forbid: >2 positional args, non-destructurable inputs, context blended into input.
enforcement=BLOCKER.
eg+ `genRoute = async (input: { slug: string }, context?: { traceId?: string }) => {}`
eg- `function doThing(a, b, c) {}` // positional+function keyword
```

## .build pipeline

```
src/briefs/rule.require.named-args.md          ← human writes/reads
    ↓ npm run build (compress step)
dist/briefs/rule.require.named-args.md.comp    ← agent reads
```

rhachet loader: prefer `.md.comp` when available, fall back to `.md`.

## .analysis: current token budget

| category | briefs | tokens | % |
|----------|--------|--------|---|
| package refs (full READMEs) | 3 | ~6,100 | 11% |
| demo transcripts | 4 | ~8,000 | 14% |
| large rule files (>1k tokens) | 20 | ~22,000 | 38% |
| medium rule files (500-1k) | 25 | ~12,000 | 21% |
| small rule files (<500) | 48 | ~10,000 | 17% |
| **total** | **100** | **~58,000** | |

### top 5 compression targets

| brief | tokens | strategy | est. compressed |
|-------|--------|----------|----------------|
| ref.package.domain-objects | 4,717 | key patterns only, drop full README | ~800 |
| rule.prefer.declastruct.[demo] | 3,935 | extract pattern, drop full code | ~600 |
| howto.write-bdd (pt1+pt2) | 3,637 | merge + TSC | ~1,000 |
| rule.prefer.early-returns.[demo] | 2,119 | distill lesson from transcript | ~300 |
| ref.package.test-fns | 1,382 | key apis only | ~400 |
| **subtotal** | **15,790** | | **~3,100** |

top 5 alone: ~12,700 tokens recoverable.

## .known duplicates to dedup

1. `rule.forbid.term-dryrun.md` ≡ `rule.forbid.term=dryrun.md` — same rule, two files
2. `rule.require.what-why-headers.md` ≡ `rule.require.what-why-headers.v1.md` — versioned dup
3. `rule.forbid.barrel-exports.md` → self-declared alias of `rule.forbid.index-ts.md`
4. `rule.forbid.term=existing.md` ⊂ `rule.forbid.gerunds.md` — subset

## .open questions

1. should compression be applied per-brief or should related briefs be merged first then compressed?
2. should the compressor be an LLM call (higher quality, non-deterministic) or deterministic transforms (reproducible, no cost)?
3. should `.comp` files be committed or generated at build time only?
4. should there be a quality gate that verifies agent comprehension of compressed vs uncompressed?
