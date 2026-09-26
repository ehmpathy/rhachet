# S3 — writes: enroll to the actor; link, init and upgrade to the repo and the actors

## .holds

| command | writes |
|---|---|
| `rhx enroll` | the actor's brain dir |
| `rhx roles link` · `rhx init` · `rhx upgrade` | the repo's brain dir **and** each active actor's brain dir |

- an unenrolled `claude` boots from the repo's brain dir: the repo's default roles.
- all three of link, init and upgrade operate on the default. a link edits the default roleset in
  place, so the default brain dir re-renders at once and every bare `claude` inherits it — a new
  session at spawn, a live one at its next read. an enrolled hash actor keeps its own roleset.
- the brain segment is flat. the hash digests the brain, so a second brain is a second actor.
- `.claude` under `brain/` is where the extant hook sync already writes `settings.json`.
- the repo's `boot.md` is gitignored: `rhx init` findserts `boot.md` into `<repo>/.claude/.gitignore`, since every `init` and `upgrade` regenerates it. `AGENTS.md` stays tracked.

## .supersedes

- *"`rhx init` writes the repo's `.claude/AGENTS.md` + `boot.md`"* — extended: `upgrade` writes it too, and both also write the actors.
- *"`brain/$brainSlug/`"* — withdrawn in the same breath; flat holds.
- *"init and upgrade write the default"* — extended 2026-09-23: `roles link` writes it too. a link that left the default stale until the next `init` was a gap, not a design.

## .said

> when we `rhx init` we should init a default AGENTS.md and boot.md into .claude/* dir of the repo too, that way the boot binds against all unenrolled claudes too
>
> can these all be nested within a `brain/` dir? all in the actor's brain dir, not just spread toplevel
>
> well, i guess just /brain/ is fine no? cause an actor can only have one brain
>
> `rhx enroll` must apply against the actors dir. this is a global invariant that already exists
>
> rhx init and upgrade apply against the repo's brain dir AND the actors dirs — that way the default `claude` still gets enrolled with the default repo's brain, when it is an unenrolled clone
>
> another requirement is that boot.md needs to be gitignored. gotta findsert that gitignore, cause it gets regened on each rhx init
>
> other than for the default repo brain. in which case it takes effect instantly, per claude settings update referenced by all the clones
>
> make that clear plz
> i thought that was a requirement
>
> link, init, upgrade
> all need to
> they all operate on the default
>
> i thought init called link under the hood ?
