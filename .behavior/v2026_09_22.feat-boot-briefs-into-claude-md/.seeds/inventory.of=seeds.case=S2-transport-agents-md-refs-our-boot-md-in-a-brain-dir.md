# S2 — transport: `AGENTS.md` refs our `boot.md`, in a brain dir

## .holds

there are exactly two brain dirs, and a clone reads exactly one:

| clone | its brain dir | how it is reached |
|---|---|---|
| enrolled | the actor's — `<actorDir>/brain/.claude` | `CLAUDE_CONFIG_DIR` at spawn |
| unenrolled `claude` | the repo's — `<repo>/.claude` | the default load, from the repo |

- each brain dir holds `AGENTS.md` (body: `@boot.md`) and `boot.md` (the corpus we render).
- every brain dir also holds `CLAUDE.md`, a symlink to `AGENTS.md` — a name with no content of its
  own (F7). `AGENTS.md` stays the file rhachet writes; `CLAUDE.md` is the door the cli reads.
  - the actor's: the cli reads no user-scope `AGENTS.md` (`3.1.1` E1).
  - the repo's: the `agents-md` walk sits behind a remote gate (`3.1.1` E3, E4), and `AGENTS.md`
    alone failed to load in the 2026-09-23 dogfood. the core `CLAUDE.md` door is ungated, so the
    unenrolled path is no longer best-effort.
- the human's own user-scope memory never loads into a clone — enforced by `claudeMdExcludes`, since
  the relocation alone still loads `~/.claude/CLAUDE.md` — `3.1.1` E6.
- every transport option was scored. subagent reach is not a criterion — the fleet runs none.

## .supersedes

- `--append-system-prompt` as the transport — ruled once, then reversed. void.
- *"no `CLAUDE.md` at any scope"* — softened to *"avoid `CLAUDE.md` where possible"*, then settled as
  a symlink in every brain dir: a name with no content is no second corpus.
- *"the unenrolled path is best-effort"* — void; it rides the core door.

## .said

> lets also evaluate this idea too *(on `--append-system-prompt-file`)*
>
> just be sure to explore each option explicitly to compare and contrast
>
> we dont use claude subagents
>
> lets go with AGENTS.md actually, since its supported now. dont add dir. replace the claude config dir entirely with the actor's dir. we literally already have per actor claude configs, and we literally already intend to make per actor auth too
>
> we forbid user-scope memory load already, as a structural rule. CLAUDE.md is a ref out to our boot.md, that we write ourselves
>
> AGENTS.md is what we want. we want to avoid CLAUDE.md if possible
>
> didnt we symlink CLAUDE.md to AGENTS.md ?
>
> how come specified actor brain gets a claude -> agents symlink, but repo default actor brain does not?
>
> it should have the symlink in both
>
> why wouldnt we
>
> no longer, since we always include symlinked claude.md, right? *(on the vision's "the unenrolled path is best-effort")*
