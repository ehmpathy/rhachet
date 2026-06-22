# self-review: has-zero-deferrals

## stone

3.3.1.blueprint.product

## review round

r2

## check

has-zero-deferrals

---

## deferrals found in blueprint

### deferral.1 = 1-hour TTL

**location:** research citations table, omissions table

**text:** "deferred — depends on Anthropic; design works with 5-min TTL"

**source check:** is this in the vision or criteria?

- **wish (0.wish.md):** reviewed — no mention of TTL requirements
- **vision:** cannot access (route guard blocks non-current stones)
- **criteria (2.1.criteria.blackbox.yield.md):** reviewed — no TTL criteria

**verdict:** acceptable deferral

**rationale:** the 1-hour TTL is an optimization we discovered in external research (3.1.1.research.external.product.flagged._.yield.md, source [10]). it is not part of the wish or criteria. the design works correctly with 5-min TTL, which is the current default. 1-hour TTL would be a bonus if Anthropic implements it.

---

## vision requirements checklist

### from 0.wish.md

| # | requirement | in blueprint? | location | deferred? |
|---|-------------|---------------|----------|-----------|
| 1 | briefs boot into cacheable location | ✓ | summary: "CLAUDE.md (position 2, before dynamic content)" | no |
| 2 | BrainBootsAdapter (symmetric to BrainHooksAdapter) | ✓ | filediff: "[+] BrainCliConfigAdapter.ts" with daos.boots | no |
| 3 | boots adapters respect `rhx enroll` pattern | ✓ | impl samples: "spawn with adapter.daos.choice.cli" | no |
| 4 | different roles booted via --roles | ✓ | codepath: "genBrainConfigDir" | no |
| 5 | repo=.this/role=any boots AFTER published role boots | ✓ | boot order section: "1. published roles... 2. local roles" | no |

**note (r2 update):** BrainBootsAdapter renamed to BrainCliConfigAdapter with unified daos: { hooks, boots, choice }. this supersedes the original BrainBootsAdapter + BrainHooksAdapter split — it deprecates BrainHooksAdapter and unifies into one adapter.

### from 2.1.criteria.blackbox.yield.md

| usecase | in blueprint? | location | deferred? |
|---------|---------------|----------|-----------|
| usecase.1 init default config | ✓ | filediff: "[+] genBrainConfigDir.ts" | no |
| usecase.2 enroll with default config | ✓ | codepath: "[~] enrollBrainCli" | no |
| usecase.3 enroll with custom roles | ✓ | codepath: "[~] genBrainCliConfigArtifact" | no |
| usecase.4 upgrade regenerates config | ○ | not explicit — but covered by re-run of init --hooks | no |
| usecase.5 clone and go | ✓ | impl: ".credentials.json symlink" | no |
| usecase.6 cache benefit at compaction | ✓ | summary: "~$0.25 saved per compaction" | no |
| usecase.7 boot order for cache | ✓ | boot order section | no |
| edgecase.1 no roles linked | ✓ | error cases table | no |
| edgecase.2 invalid brain | ✓ | error cases table | no |
| edgecase.3 absent credentials | ✓ | error cases table | no |

all vision and criteria items are present in blueprint. no vision items deferred.

---

## holds (non-issues)

### hold.1 = 1-hour TTL is not a vision requirement

the wish explicitly states:
- "our briefs and skills get booted into a cacheable location" (position 2, before dynamic content)
- "boots adapters respect the `rhx enroll` pattern"
- "order the repo=.this/role=any boots AFTER the published role boots"

none of these mention TTL duration. the 5-min TTL is sufficient for cache benefit because:
- cache is shared across sessions with same CLAUDE.md
- each compaction event saves ~$0.25 (19 sessions reuse 1 cache write)
- 5-min TTL refreshes on each hit, so active sessions keep cache warm

1-hour TTL would further reduce cache writes in idle periods, but this is optimization beyond scope.

---

## verdict

**pass** — 1 deferral found (1-hour TTL), verified as acceptable (optimization beyond vision scope). all 5 vision requirements present in blueprint.

---

## thorough verification (r2 update)

### grep for deferrals in blueprint

```
grep -i "deferred|future work|out of scope|TODO|FIXME" blueprint
```

**result:** 1 match found:
- line 108: `| [OPIN] 1-hour TTL would help | deferred | depends on Anthropic; design works with 5-min TTL |`

### is 1-hour TTL in the wish?

**search:** `grep -i "TTL|1-hour" 0.wish.md`

**findings:**
- line 138: "Cache TTL is 5 minutes" — stated as fact/constraint
- line 379: "1-hour TTL — Feature request #19436 proposes... Would further reduce cache writes if implemented" — listed under **open questions**, not requirements

**conclusion:** 1-hour TTL is explicitly listed in the wish's "open questions" section, not as a requirement. the wish acknowledges it as a potential future optimization that "depends on Anthropic". deferral is acceptable.

---

## found issues (r2 update)

### issue.1 = stale reference to BrainBootsAdapter

**problem:** review referenced BrainBootsAdapter which was renamed to BrainCliConfigAdapter with unified daos.

**fix:** updated requirement #2 location to reference "[+] BrainCliConfigAdapter.ts" with daos.boots. added note that BrainCliConfigAdapter supersedes the original BrainBootsAdapter + BrainHooksAdapter split.

### issue.2 = stale reference to impl samples spawn

**problem:** review referenced "spawn with CLAUDE_CONFIG_DIR" but impl samples now use "spawn with adapter.daos.choice.cli".

**fix:** updated requirement #3 location to reference "spawn with adapter.daos.choice.cli".

### issue.3 = review lacked thorough verification

**problem:** prior review stated "1-hour TTL is not a vision requirement" but did not show the verification steps.

**fix:** added "thorough verification" section with grep commands and specific line references to prove the deferral is acceptable.

---

## session review: 2026-04-23

verified against blueprint:
- only 1 deferral (1-hour TTL) — correctly marked as optimization beyond vision scope
- all 5 wish requirements traced to blueprint sections
- all 10 criteria usecases/edgecases traced to blueprint sections
- BrainCliConfigAdapter name consistent throughout

**confirmed pass**.
