# self-review: has-questioned-questions

## question 1: what's the exact claude code hook schema for PreCompact/PostCompact?

**can answer via logic?** no — need to inspect actual claude code schema

**can answer via docs/code?** yes — we can fetch claude code documentation or inspect claude code behavior

**triage: [research]** — mark for research phase. fetch claude code settings.json schema.

---

## question 2: does PreCompact give enough time for useful work?

**can answer via logic?** no — depends on claude code's implementation

**can answer via docs/code?** potentially — might be documented, might need empirical test

**triage: [research]** — mark for research phase. check if documented; if not, test empirically.

---

## assumption updates

assumption 2 in vision says "SessionStart fires on compaction too" — this was confirmed by wisher, so update to:

**verdict: [answered]** — wisher confirmed: "SessionStart already covers compaction"

assumption 3 says "onBoot without filter = SessionStart only" — this was confirmed by code inspection:
```ts
const EVENT_MAP: Record<BrainHookEvent, string> = {
  onBoot: 'SessionStart',
  ...
};
```

**verdict: [answered]** — code evidence confirms prior behavior

---

## summary

| question | triage |
|----------|--------|
| PreCompact/PostCompact schema | [research] |
| PreCompact time window | [research] |
| SessionStart fires on compaction | [answered] — wisher confirmed |
| onBoot without filter = SessionStart | [answered] — code confirms |

---

## vision update needed

update "open questions & assumptions" section to mark triaged items clearly.

