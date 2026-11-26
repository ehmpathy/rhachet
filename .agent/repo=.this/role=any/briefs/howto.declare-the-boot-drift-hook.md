# howto.declare-the-boot-drift-hook

> **a `repo=.this` role declares one onStop hook in its own `hooks.yml`:
> `rhachet clone boot drift --when hook.onStop`. rhachet ships the verb; it declares no hook itself.**

## .the declaration

in the repo's own role, the one its seats hold (here, `role=any`):

```yaml
# .agent/repo=.this/role=any/hooks.yml
onStop:
  - command: ./node_modules/.bin/rhachet clone boot drift --when hook.onStop
    timeout: PT10S
```

`getAllRepoThisRolesWithHooks` reads it (ehmpathy/rhachet#830), and enroll keeps it for each seat
that holds the role. `timeout` is an iso duration (`PT10S`), as every hook takes.

then `rhx init --hooks` (or any `rhx init`) relays it into each actor's
`brain/.claude/settings.of.repo.json` as a `Stop` entry, authored `repo=.this/role=any`. a clone reads
its own actor's file, so every clone of an actor that holds the role runs it at each stop.

🟡 the declaration fires once #830's reader lands. until then it is inert; read a drift on demand.

## .what the hook does

| the clone | the hook |
|---|---|
| on the current boot, or under the 200 line threshold | silent, exit 0 |
| spawned before boot drift, or by a resume | silent, exit 0 — it can take no drift |
| past the threshold, not yet told of this drift | prints the notice as `{"systemMessage": …}` on stdout, exit 0, once |
| already told of this drift hash | silent; a new drift hash speaks again |
| past the 2000 line cap | the notice names respawn as the one cure |

🟡 the hook never blocks the stop. a clone cannot compact itself from inside its turn, so a block
would only spend a turn: the notice tells the human (or a supervisor) to `/compact` or to send
`rhx clone say @:<clone> --what /compact`.

## .why a `.this` role, never rhachet nor a package

- the framework does not own hooks (`rule.forbid.framework-owned-hooks`). a `.this` `hooks.yml` is a
  human's declaration in the repo, so it is no third arm; the budget carrier stays the only framework
  hook
- the repo that runs long-lived clones opts in, in its own files. a package role would arm it in every
  consumer at once
- a clone still runs only its own roles' hooks (`inventory.of=requirements.case=9`): the author is
  `repo=.this/role=<x>`, kept only for a seat that holds `<x>`

without the hook, the drift still lands in each clone's spawn boot `CLAUDE.md`, and
`rhx clone boot drift --of @:<clone>` reads it on demand.

## .how to check it landed

```sh
rhx init --hooks
jq '.hooks.Stop' .agent/.actors/<actor>/brain/.claude/settings.of.repo.json
```

## .see also

- `rhx clone boot drift --help` — the verb
- `define.claude-md-vs-system-prompt` — why the drift rides `CLAUDE.md`, never the system prompt
- `rule.forbid.framework-owned-hooks` — why the declaration lives in a role
