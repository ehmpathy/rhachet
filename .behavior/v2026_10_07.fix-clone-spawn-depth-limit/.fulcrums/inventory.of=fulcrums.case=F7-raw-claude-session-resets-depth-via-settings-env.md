# F7 — a raw `claude` session resets its depth to 0 via the repo brain dir's settings `env`

**the fork:** a raw `claude` opened in a pane that inherited `RHACHET_CLONE_DEPTH=1` passes that 1
to its tool shell, so its guard's enroll would mint 2 and be refused. how does the session start
at depth 0? (a) `env.RHACHET_CLONE_DEPTH = "0"` in the repo brain dir's settings
(`.agent/.actors/actor.via.slug=.default/brain/.claude/settings.json`, read as `<repo>/.claude`)
· (b) a SessionStart hook that writes `RHACHET_CLONE_DEPTH=0` to `CLAUDE_ENV_FILE` · (c) a
launcher, `rhx claude` · (d) leave the edge open — the wisher's terminal carries no var (Q7a).

**taken:** (a), with (b) as the fallback. the wisher ruled that a pane is depth 0 whatever it
inherited (S1), so (d) is out. (a) is one key in a file `rhx init` already writes, and an enrolled
clone never reads it — it reads its actor's brain dir via `CLAUDE_CONFIG_DIR` and
`--setting-sources local`. (c) asks the human to learn a new verb.

**rework:** clean — one settings key (or one hook), behind the render that already writes the
repo brain dir.

**confidence:** 65%. it rests on two unmeasured premises: (1) a settings `env` key overrides a
var the `claude` process already inherited (Q11); (2) an enrolled clone's settings sources
truly exclude the repo brain dir's settings, so its own marker is never reset. both are
measured in execution before the contract relies on them. if (1) fails, (b) takes its place.

**where:** the repo brain dir render (`rhx init --hooks` / `rhx roles link`), `asBrainCliSpawnArgs.ts`.

**verdict:** —
