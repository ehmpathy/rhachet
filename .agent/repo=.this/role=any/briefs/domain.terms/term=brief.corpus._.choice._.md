# domain.term: corpus

term.chosen   = corpus
term.kind     = noun
term.boundary = brief
term.synonyms.forbidden:
- manifest
- bundle
- blob
- payload
- body

## .what

the **rendered text** of a set of briefs, as one string — the content a brain actually receives.

a corpus is an **artifact**, never a declaration. it is what a render produces from a
`boot.yml` manifest plus the brief files that manifest names.

| grain | the corpus |
|---|---|
| **role** | one role's briefs, rendered — `genRoleBriefCorpus` |
| **actor** | every role of one actor, rendered into one body — `genActorBriefCorpus` |

## 🔴 .the distinction it exists to hold — corpus vs manifest

> **the manifest DECLARES what to load. the corpus IS what was loaded.**

`boot.yml` is the manifest: a `say`/`ref` partition naming brief paths. the corpus is the text
those paths render to. they share the subject and differ in kind, so one word cannot carry both —
which is why `manifest` heads the forbidden list rather than sitting beside it as a near-synonym.

⇒ the pair is symmetric and both halves are itemized: `term=manifest`, and this.

## .refs

- `src/domain.operations/role/briefs/genRoleBriefCorpus.ts` (declared, `3.3.1.blueprint.product`)
- `src/domain.operations/actor/enrolled/genActorBriefCorpus.ts` (declared)
- `src/domain.operations/actor/enrolled/setActorBriefCorpus.ts` (declared)
- `src/domain.operations/actor/enrolled/asActorCorpusDigest.ts` (declared)

## .reason

- `term=brief.corpus._.choice.reason.md`
