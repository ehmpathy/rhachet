# domain.term.choice.reason: ask

## .etymology

`ask` is the plainest english noun for *what a caller wants*. it was chosen because it is
**transport-free and verb-free**: a caller's want is the same want whether it arrives on the cli,
through the sdk, or over the daemon socket, and whether the verb that serves it reads or mutates.

each rejected synonym drags in a frame the domain does not have:

| word | why forbidden |
|---|---|
| `request` | http/wire jargon. an ask is not a message and has no transport; the daemon's socket carries one, but so does a bare function call |
| `query` | implies read-only. an ask is served by `set` and `del` too |
| `input` | names the **argument bag**, not the intent. every operation has an `input`; only some carry an ask |
| `call` / `invocation` | names the **mechanism** that delivered the want, not the want |

## .disputes

### dispute: request — raised 2026-08-25 — status: RESOLVED (keep `ask`)
- raised.by = execution stone, `v2026_08_25.fix-keyrack-all-skips-manifest`
- claim = `request` is the more standard software word and reads less colloquial
- counter = the domain has a **real** request object elsewhere — the daemon protocol's wire
  message (`handleGetCommand.ts`). to spend `request` on the caller's intent would overload one
  word across the intent and its serialized carrier, which is exactly the ambiguity
  `rule.forbid.domain-term-ambiguity` names. `ask` stays free of the wire
- resolution = keep `ask`; record `request` as a forbidden synonym, RESERVED for the daemon's
  wire message

## .evidence

### the word already carried weight before it was itemized

`term=keyed._.choice._.md` defines itself as *"an **ask** that names EXACTLY ONE key"*, and
`term=sweep` leans on the same word. so the glossary already reasoned in terms of an ask while the
word itself had no record — a term used but never itemized, the precise gap
`rule.require.domain-term-itemization` closes.

### the two-dimension read is what the defect turned on

`ehmpathy/rhachet#467`: five load sites each carried a comment that said *"an `@all` ask needs no
manifest"*, and each branched on *"is there a repo?"* instead. the rationale was written five
times and mis-keyed five times.

that is the signature of a **concept with no name**: when a concept has no word, each site
re-derives it, and each derivation drifts. once `ask` exists as a noun with two named dimensions,
the read has one home (`asKeyrackAskOrg`) and a sixth hand-rolled condition cannot be written
without an obvious duplicate.

### the two-surface default asymmetry is a property of the ask, not of a flag

- cli: `invokeKeyrack.ts` defaults `--org` to `'@this'`
- sdk: `org` is declared nullable with no default

a reader who thinks in terms of "the `--org` flag" sees one surface and misses the other. a reader
who thinks in terms of "the ask's provenance" sees both, because the ask is what both surfaces
construct. the term is what makes the asymmetry visible.

## .see also

- `term=keyed._.choice._.md` — an ask of cardinality one
- `term=sweep._.choice._.md` — an ask whose selector is a set
- `term=machine-wide._.choice._.md` — the provenance class an `@all` ask names
- `rule.require.named-transformers` — why the read is a named cast, not an inline condition
