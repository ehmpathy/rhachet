# domain.term.choice.reason: accrual

## .etymology

why `accrual`: from *accrue* — "to accumulate over time, especially as a repeated charge." the word is
borrowed straight from the billing domain the hazard actually lives in: an enroll mints a **billed**
brain, and a cron that retries makes those charges *accrue*. the wish names it in exactly these words —
"a cron that retries can **accrue** billed brains" — so the term is discovered from the wish's own
words, not invented at the keyboard.

chosen over:
- `buildup` / `pileup` — vague, non-domain; they name the shape (things stack) but not the *cost*
  sense that makes the hazard matter. accrual carries the money sense inherently.
- `leak` — implies an unintended escape (a resource leak); the accrual is not a leak — every clone was
  deliberately created. the hazard is *unbounded* creation, not *lost* resources.
- `drift` — already overloaded in this repo (config drift, term drift); a reuse for a cost hazard
  would collide two senses onto one word (`rule.forbid.domain-term-synonyms`).

## .disputes

none yet. the term was discovered from the wish's own phrase and holds one sense across every
`*Accrual*` operation.

## .evidence

- **the soft-warn-not-cap axis** — the domain deliberately answers accrual with a *visible advisory*
  (`computeCloneAccrualWarn` → `asCloneAccrualWarnLine`), never a hard cap. a hard cap would fight the
  wish (a legitimate parallel-clone burst must still succeed). so accrual is a *hazard made visible*,
  not a *limit enforced* — the term names the hazard the warn surfaces, and the warn is the advisory.
- **recurs across the operation family** — `accrual` composes `computeCloneAccrualWarn`,
  `asCloneAccrualWarnLine`, `CLONE_ACCRUAL_THRESHOLD`, and the live-count leaf
  `getOneCloneLiveCountForActor` reads into it. one noun, reused across the classifier + threshold +
  renderer, is exactly the itemization trigger (`rule.require.domain-term-itemization`).
- **invariant** — the warn is emitted only when `liveCount` crosses `CLONE_ACCRUAL_THRESHOLD`; below
  the threshold a legitimate small burst is never nagged (the false-positive guard). the accrual concept
  is inseparable from its threshold: an accrual with no threshold is just a count.
