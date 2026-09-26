# philosophy.minimal-budget-for-maximum-perspective

> **a big role boot is a feature, not a defect. briefs shift the brain's perspective, and the
> shift is what makes a role worth its tokens. rhachet's job is to make that trade cheap to
> balance: the least budget for the most perspective.**

## .what

a boot corpus buys two different things, and they scale differently:

| axis | the question it answers | how size affects it |
|---|---|---|
| **perspective** | *where does the brain's thought drift by default?* | more briefs → more concept planets → stronger pull toward the role's way of work |
| **adherence** | *is this one specific rule followed?* | Anthropic reports that shorter `CLAUDE.md` files are followed more reliably |

rhachet's bet is on perspective. an unenrolled brain drifts toward whatever it absorbed; an
enrolled brain navigates by the gravity its briefs register (`define.rhachet.v3`, concept planets).
a role boot that reads large is the point: the perspective shift is produced by the corpus.

## .why this is not a contradiction with Anthropic's brevity advice

`define.claude-md-vs-system-prompt` quotes Anthropic: *"target under 200 lines per CLAUDE.md file.
Longer files consume more context and reduce adherence."* that claim is about **adherence per
rule**. it says naught about **perspective**, and no source measures either effect for a corpus of
hundreds of thousands of characters.

⇒ both can hold at once. a big boot can shift how the brain approaches work while a single rule
inside it gets marginally less attention. to trim a boot because of the 200-line figure alone is to
optimize the axis rhachet does not bet on.

🔴 **do not cite the 200-line advice as a verdict on a role boot.** it is one axis of a trade.

## .the trade rhachet exists to balance

> **minimal budget for maximum perspective.**

every token in a boot is paid on every session, by every clone. so the goal is not a small boot and
not a large one. it is the most perspective per token spent.

the levers rhachet provides for that balance:

| lever | what it trades |
|---|---|
| `boot.yml` → `say` vs `ref` | `say` inlines the full brief (pays tokens, earns gravity); `ref` boots only the path (near free, read on demand) |
| `.md.min` variants | a condensed form of the same brief, auto-preferred at boot. same planet, less mass. see the `condense` skill |
| `.pt1` / `.pt2` splits | boot the part that carries the perspective, ref the part that carries the detail |
| `npx rhachet roles cost --repo <r> --role <r>` | shows token estimates per role resource, so a role author sees where the budget goes |

⚠️ `roles cost` reports every file in the role (briefs, skills, inits), not only what boots. an init
hook that never enters context still appears in its totals. read it as a map of the role, then check
`boot.yml` for what actually boots.

## .how to apply

| when… | then… |
|---|---|
| a boot looks too large | ask what perspective each `say` brief buys, not how many lines the corpus has |
| a brief states a concept a brain must think *within* | `say` it. that is gravity |
| a brief holds detail a brain can look up when needed | `ref` it. a path costs almost naught |
| a `say` brief is long but its concept is short | condense it to `.md.min`. keep the planet, drop the mass |
| you want to know whether a trim cost perspective | measure both axes on one task set: full boot, trimmed boot, no boot (`rule.require.refute-a-premise-with-a-measurement`) |

## .see also

- `define.rhachet.v3` — briefs as concept planets; enrollment shapes gravity
- `define.claude-md-vs-system-prompt` — the adherence side of this trade, and its open question on size
- `rhachet/role=enroller` → `howto.use.check-role-costs` — the cost report
- `rule.require.refute-a-premise-with-a-measurement` — how to settle a claim about boot size
