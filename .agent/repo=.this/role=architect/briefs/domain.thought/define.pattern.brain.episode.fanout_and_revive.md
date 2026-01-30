# episode saves: fanout and revive

## .what

every `.ask()` returns an episode reference. that reference is a time-capsule — it captures the context window state at that moment, with all exchanges up to that point.

via saved episode references, callers can:
- **fanout** — branch from a checkpoint to explore alternatives
- **revive** — resume from a prior state when things go wrong

## .tldr

```ts
// save episode refs as you go
const { episode: setup } = await atom.ask({ say: 'establish context' });
const { episode: afterAnalysis } = await atom.ask({ on: { episode: setup }, say: 'analyze' });
const { episode: afterRiskyOp } = await atom.ask({ on: { episode: afterAnalysis }, say: 'risky op' });

// fanout: branch from setup to try different approaches
const { output: approachA } = await atom.ask({ on: { episode: setup }, say: 'try approach A' });
const { output: approachB } = await atom.ask({ on: { episode: setup }, say: 'try approach B' });

// revive: resume from before risky op went wrong
const { output: retry } = await atom.ask({ on: { episode: afterAnalysis }, say: 'safer op' });
```

## .pattern: fanout

branch from a single checkpoint to explore multiple paths in parallel.

```
         ┌─→ approach A
setup ───┼─→ approach B
         └─→ approach C
```

each branch sees the same prior context (setup) but diverges from there.

**use cases:**
- explore alternative solutions to a problem
- compare different prompts or strategies
- A/B test outputs from the same start point

```ts
const { episode: checkpoint } = await atom.ask({ say: problemDescription });

// fanout: parallel branches from same checkpoint
const branches = await Promise.all([
  atom.ask({ on: { episode: checkpoint }, say: 'solve via refactor' }),
  atom.ask({ on: { episode: checkpoint }, say: 'solve via rewrite' }),
  atom.ask({ on: { episode: checkpoint }, say: 'solve via workaround' }),
]);

// compare outputs, choose best approach
const best = selectBest(branches.map(b => b.output));
```

## .pattern: revive

resume from a prior checkpoint when a later exchange goes wrong.

```
setup ──→ analysis ──→ risky-op ──→ 💥 failure
                 │
                 └──→ safer-op ──→ ✓ success (revived)
```

the brain sees context up to the saved checkpoint — later exchanges are forgotten.

**use cases:**
- recover from a bad decision or hallucination
- retry with different instructions after a failure
- step back to before state mutation occurred

```ts
const checkpoints: Record<string, BrainEpisode> = {};

// save checkpoints at critical moments
const { episode } = await atom.ask({ say: 'setup' });
checkpoints['after-setup'] = episode;

const { episode: ep2 } = await atom.ask({ on: { episode }, say: 'analysis' });
checkpoints['after-analysis'] = ep2;

// risky operation
const { output } = await atom.ask({ on: { episode: ep2 }, say: 'risky op' });

// if output is problematic, revive from before
if (isProblematic(output)) {
  const { output: retry } = await atom.ask({
    on: { episode: checkpoints['after-analysis'] },
    say: 'safer alternative op',
  });
}
```

## .name management

episode names are caller-managed. the brain supplier returns opaque episode refs; callers assign semantic names:

```ts
// simple: variable names
const { episode: beforeRisky } = await atom.ask({ ... });

// structured: checkpoint map
const checkpoints = new Map<string, BrainEpisode>();
checkpoints.set('before-risky-op', episode);

// domain-specific: keyed by operation
const episodeByStep: Record<StepName, BrainEpisode> = {};
episodeByStep['after-validation'] = episode;
```

this keeps the contract simple (no supplier-side name persistence) while callers retain full flexibility.

## .BrainAtom vs BrainRepl

| pattern | BrainAtom | BrainRepl |
|---------|-----------|-----------|
| fanout | straightforward — each branch is independent | works — each branch starts a new series from the episode |
| revive | straightforward — truncates to saved context | caution — filesystem/state may not match revived context |

for BrainRepl revive: the brain sees context as if later exchanges never happened, but tool use side effects (file writes, api calls) persist. the caller must manage this divergence.

## .see also

- `define.term.brain.episodes.md` — BrainEpisode definition
- `define.term.brain.episodes.vs_anthropic_session.md` — supplier comparison
- `define.perspectives.brain_vs_weave_vs_skill.md` — brain vs weave vs skill

