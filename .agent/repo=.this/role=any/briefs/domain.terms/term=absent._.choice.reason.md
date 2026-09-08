# domain.term.choice.reason: absent

## .etymology

latin *absentem* — "away, not present." the ordinary english word, taken unchanged, and that is
the point: `absent` is not a term of art. it is the plain word the repo already reached for
hundreds of times in prose before it ever appeared in a contract.

the choice worth an argument is not *which word* but **that it stayed plain**. two narrower terms
— `miss` and `omitted` — were coined for cases that needed more precision. the pressure at each
coinage was to let the new word absorb the old one. it was resisted both times, because a base
word with no observer baked in is what lets the narrower two be defined at all.

## .why it was itemized late

`absent` is one of the oldest words in the codebase and one of the last to be itemized. that is
not an oversight — it is the ordinary fate of a word that reads as plain english. the glossary's
own `rule.require.domain-term-itemization` carves out "generic english not part of the domain
vocabulary," and for a long time `absent` was on the correct side of that line.

it crossed the line when it started to appear in **published contract values** rather than only
in prose. today it names six of them (see `.refs` on the say file), and two behaviors ship it in
a `--json` payload a consumer parses. once a word is a value someone can branch on, its sense has
to be pinned somewhere.

the trigger to itemize it was concrete: the round that added `'package-absent'` to
`NPM_INSTALL_FAILURE_KINDS` needed to know whether that name was legal, and the only extant
guidance said `absent` was a **forbidden synonym of `miss`** — which contradicted both the
`.why not absent` section on that same term file and three shipped contracts. see the dispute
below.

## .disputes

### dispute: `absent` as a forbidden synonym of `miss` — raised 2026-08-31 — status: RESOLVED (keep both; `absent` is kin, never a synonym)

- raised.by = the learner, in the term sweep of `v2026_08_25.fix-node-pty-install`
- claim = `term=miss._.choice._.md` listed `absent` under `term.synonyms.forbidden`, which read as
  a flat ban on the word in every contract
- counter = **the same file argued the opposite four sections down.** its `.why not absent`
  section reads: *"`absent` is the repo's plain-english word for a value that is not there, and it
  stays that. a miss is narrower: it is an absence that was asked for. every miss is an absence;
  not every absence is a miss."* that is the definition of a kin term, not a synonym.

  the contracts agreed with the prose rather than the list: `unlockKeyrackKeys` ships
  `reason: 'absent' | 'lost' | 'remote'` in a published `--json` payload, `getKeyrackKeyGrant`
  ships `status: 'absent'`, and `execRoleUnlink` ships `status: 'removed' | 'absent'`. all three
  predate the dispute. so the forbidden-list entry was already false when it was written.
- resolution = the list entry was wrong, and the prose was right. `absent` moves out of
  `term.synonyms.forbidden` on `term=miss` and into a ⚠️ kin callout that points here. the
  `.why not absent` section stays exactly as it was — it needed no revision, only to be believed.

  this mirrors the shape `term=omitted` already uses correctly for `skipped`: a kin term gets a
  callout and a boundary table, never a slot on the forbidden list.

> 🚨 **the lesson, which generalizes past this one word.** a forbidden-synonym list and a
> `.why not X` section can drift **within a single file**, because one is data and the other is
> prose, and no test reads either. the tell was that the two disagreed in the same document —
> and it went unnoticed because a reader who checks the list stops there, and a reader who reads
> the prose never scrolls back up.
>
> the same shape is worth a look on every term file that carries both.

### dispute: `missing` — raised 2026-08-31 — status: RESOLVED (keep `absent`)

- raised.by = the learner, pre-emptively
- claim = the -ing form is the more common english word for this sense, and reads more naturally
  in a sentence like "the key is not there"
- counter = three reasons, in order of weight. **(1)** it is a gerund, forbidden by
  `rule.forbid.gerunds`. **(2)** the gerund ban is substantively right here rather than
  incidental — the -ing form reads as an act underway, which invites the reader to look for an
  actor, and the sense needs a *state*. **(3)** decisively, it shares a stem with `miss`, a real
  and distinct term in this glossary, so the two would be one keystroke and one glance apart
  while they mean different things — the exact hazard `rule.forbid.domain-term-ambiguity` names.
- resolution = keep `absent`; record the -ing form as a forbidden synonym (it is listed verbatim
  on the say file). dispute closed.

## .evidence

### discovery — the scenario narrative that separated the three

the boundary was found by a walk of one key through one `keyrack` run, and by note of which word
was true at each step:

1. the key is not in the vault. **absent** — true right now, and true an hour ago when no one
   looked. no observer is implied
2. `fill` probes for it and its guard `isKeyrackFillProbeMiss` returns true. **miss** — the probe
   asked, so expectation has entered the picture. still no report; the caller just carries on
3. `unlock` cannot serve it and returns it in `omitted` with `reason: 'absent'`. **omitted** — the
   caller is now told, and a `notice` is owed

🚨 **step 3 is the proof the three are not synonyms.** the contract at that step uses **two of
them at once**: the field is named `omitted` and its reason value is `'absent'`. if they were the
same word, that line would be a tautology. it is not — it says *"we left this out, and the reason
we left it out is that it is not there,"* which distinguishes it from the kin reasons `'lost'`
and `'remote'`, where the value **is** there and we still could not serve it.

that single line is the whole boundary, already shipped in a published contract:

```ts
// unlockKeyrackKeys.ts
omitted: { slug: string; reason: 'absent' | 'lost' | 'remote' }[];
```

### the compound-order evidence

the `$noun-absent` order was not designed; it was read off the extant values and then conformed
to. `computeCloneSocketOmissionReason` shipped `'pty-absent'` first, and the round that added
`'package-absent'` matched it deliberately rather than by chance — both name a fallback of the
form *"the resource this behavior needed is not there."*

the one outlier, `'absent-roles-boot-command'`, inverts the order. it is recorded on the say file
as a known inconsistency rather than quietly conformed, per `rule.forbid.domain-term-synonyms`'s
"left in place until disturbed" clause. worth a note that it is also the only one of the six that
is not a *fallback* — it is a validation reason, which may be why it drifted.

### invariants

- **every `miss` is an `absent`; not every `absent` is a `miss`.** the containment is strict and
  one-way. a guard that treats them as interchangeable will over-fire in the direction of a claim
  of an observer that does not exist
- **an `omitted` entry carries a reason, and `'absent'` is one of three.** so `omitted` is never
  a synonym of `absent` — the two compose, at different levels of the same contract
- **the compound is `$noun-absent`.** one legacy value inverts it; no new value may

## .see also
- `term=miss._.choice._.md` — the kin term that adds expectation
- `term=omitted._.choice._.md` — the kin term that adds a report
- `term=blocked._.choice._.md` — the report class an absence raises when the caller must act
