# catalog.of=architecture-terms

> the vocabulary rhachet's architecture is argued in. one row per brief; read the brief when its
> term enters a design.

## .domain.khlone — delegate work to actors

| brief | what it settles |
|---|---|
| `domain.khlone.delegation/define.term.delegation` | delegation = distill → enroll → specialize → isolate → fulfill → verify |
| `domain.khlone.delegation/define.term.enrollment-vs-isolation` | *who* runs (enrollment) and *where* it runs (isolation) are orthogonal — never couple them |
| `domain.khlone.orchestration/define.term.orchestration` | orchestration = delegation to many actors at once: communication, dispatch, observation |

## .domain.thought — three perspectives on one run

| brief | what it settles |
|---|---|
| `domain.thought/define.perspectives.brain_vs_weave_vs_skill` | skill (distilled) · weave (observed) · brain (produced) — each owns its own vocabulary |
| `domain.thought/define.term.skill.thought-routes` | 🪨 solid · 🔩 rigid · 💧 fluid — the determinism spectrum; to harden is to move toward solid |
| `domain.thought/define.term.weave.threads` | `WeaveFabric → WeaveThread → WeaveStitch` — what a run was observed to do |
| `domain.thought/define.term.brain.episodes` | `BrainSeries → BrainEpisode → BrainExchange` — compaction ends an episode, never a series |
| `domain.thought/define.term.brain.focus` | `BrainFocus = { concept, context }` — inferred, curated, never set directly |
| `domain.thought/define.pattern.brain.episode.fanout_and_revive` | an episode ref is a checkpoint: fan out from it, or revive to it |

## .infra.composition — how suppliers plug in

| brief | what it settles |
|---|---|
| `infra.composition/define.term.arch.suppliers` | role suppliers and brain suppliers, discovered by package name |
| `infra.composition/define.term.arch.adapters` | an adapter maps a rhachet contract onto a target's contract (e.g. `onBoot` → `SessionStart`) |
