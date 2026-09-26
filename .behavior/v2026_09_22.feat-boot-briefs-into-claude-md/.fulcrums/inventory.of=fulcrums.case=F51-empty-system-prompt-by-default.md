# F51 — every enrolled clone spawns with an empty system prompt

## .the fork

- **a.** keep the vendor default system prompt; the corpus arrives via CLAUDE.md beside it
- **b.** spawn every clone with `--system-prompt ''`; the corpus via CLAUDE.md is the whole boot context

## .taken — b, ruled by the wisher

the wisher, 2026-09-25: *"so that claude.md boots but the default stuff anthropic pollutes with is gone, cause rhachet owns it"*, then *"why wouldnt we make it default"*.

two objections were raised against a per-actor option and both dissolve for a constant:

- **cache** — an empty prompt holds no per-machine section, so it caches whole; `--exclude-dynamic-system-prompt-sections` has naught to move and is dropped
- **resume drift** — `--resume` reuses the original prompt, and the original is always `''`

## .measured — journey `[t3]`, real cli, haiku

| launch | billed input |
|---|---|
| vendor default prompt | 12,429 |
| `--system-prompt ''` | 6,180 |
| removed | **6,249** |

- CLAUDE.md boots head to tail under the empty prompt; the corpus read is identical to the vendor launch
- M2: 6,170 of 6,180 input tokens read from cache on the second launch

## .the cost accepted

a prefix under the model's minimum cacheable length is silently never cached (haiku 4.5: 4,096 tokens; opus 5.5: 512). the vendor prompt used to carry a small corpus over that bar. the fleet's corpora sit far above it; a one-role haiku actor may not. the journey fixture was sized past 4,096 so M2 still measures the transport.

## .rework

**clean** — one argv pair in `asBrainCliSpawnArgs.ts` plus its clamps.

## .confidence

ruled — not a best guess.
