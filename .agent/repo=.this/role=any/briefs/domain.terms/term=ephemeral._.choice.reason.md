# domain.term.choice.reason: ephemeral

## .etymology

`ephemeral` = "short-lived" (greek *ephēmeros*, "for a day"). names the `.agent` dirs
whose content is throwaway and host-local — `.agent/.actors/` (enrolled-actor records + sockets)
and `.agent/.cache/` (skill caches). the word carries the key promise in one adj: none of it is
source, none of it belongs in git history, all of it regenerates on demand.

chosen over:
- `state` — too broad; state can be durable AND source (config, manifests are state too). the
  point of these dirs is not that they hold state but that the state is throwaway. `ephemeral`
  names the lifespan, which is the property that decides the self-ignore.
- `runtime` — a phase-of-use word, not a lifespan; a runtime value can still be worth a track.
- `transient` / `volatile` — near-synonyms, but carry an in-mem/loss connotation; the content is
  on disk and stable within a host, just not durable across clone/host and not git-tracked.
- `scratch` — informal, and implies a single work area; these are multiple structured dirs.

## .disputes

### dispute: state  —  raised 2026-08-17  —  status: RESOLVED (keep `ephemeral`)
- raised.by  = mechanic (first draft named the helper `findsertAgentStateGitignore`)
- claim      = "state" reads plainly — these dirs hold the actor/clone runtime state.
- counter    = "state" is too broad and overloads a word that also fits durable, tracked
               state (manifests, config). the dirs' one defining property is that the content is
               throwaway + regenerable, which decides the self-ignore. "ephemeral" names exactly
               that lifespan; "state" does not.
- resolution = keep `ephemeral`; record `state` as a forbidden synonym. dispute closed by the
               human wisher ("not agent state ... agent ephemerals").

## .evidence

- the self-ignore owner: `src/domain.operations/invoke/link/findsertAgentEphemeralGitignore.ts`
  — findserts a `*` self-ignore into an ephemeral dir, kept out of git history.
- the two ephemeral dirs today: `.agent/.actors/` (getActorsRootDir) + `.agent/.cache/`.
- the contrast partition: `.agent` also holds tracked source (readmes via findsertFile, symlinked
  briefs/skills) — those are NOT ephemeral, which is why the self-ignore is scoped to the two
  throwaway dirs, not all of `.agent`.
