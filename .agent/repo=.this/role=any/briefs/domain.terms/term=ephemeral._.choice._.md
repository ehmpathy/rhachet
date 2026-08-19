# domain.term: ephemeral

term.chosen   = ephemeral
term.kind     = adj            # qualifies a .agent dir that holds throwaway, host-local content
term.synonyms.forbidden:
- state
- runtime
- transient
- volatile
- scratch

## .what

the throwaway, host-local partition of `.agent` — the `.agent/.actors/` and `.agent/.cache/`
dirs, whose content is regenerated on demand and must never enter git history. an `ephemeral`
dir carries a self-ignore (`*`) so it stays out of git wherever `.agent` lands. contrasts with
the tracked, source partition of `.agent` (readmes, symlinked briefs/skills).

## .refs

- src/domain.operations/invoke/link/findsertAgentEphemeralGitignore.ts (the self-ignore owner)
- src/domain.operations/invoke/link/execRoleLink.ts (findserts the ephemeral self-ignores)
- src/domain.operations/actor/enrolled/getActorsRootDir.ts (.agent/.actors — an ephemeral dir)

## .reason

see the ref-level cluster beside this choice:
- `term=ephemeral._.choice.reason.md` — etymology, the `state` dispute, evidence
