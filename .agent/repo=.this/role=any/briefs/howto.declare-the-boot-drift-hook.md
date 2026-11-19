# howto.declare-the-boot-drift-hook

> **a role that wants its clones told of boot drift declares one onStop hook:
> `rhx clone boot drift --when hook.onStop`. rhachet ships the verb; it declares no hook itself.**

## .the declaration

in the role's `Role.build`, under `hooks.onBrain`:

```ts
hooks: {
  onBrain: {
    onStop: [{ command: 'rhx clone boot drift --when hook.onStop', timeout: 'PT10S' }],
  },
},
```

`timeout` is an iso duration (`PT10S`), as every hook takes. the stanza is held verbatim by
`syncOneRoleHooksIntoOneBrainRepl.integration.test.ts`, which asserts the `Stop` entry it lands.

then `rhx init --hooks` (or any `rhx init`) relays it into each actor's
`brain/.claude/settings.of.repo.json` as a `Stop` entry. a clone reads its own actor's file, so
every clone of an actor that holds the role runs it at each stop.

## .what the hook does

| the clone | the hook |
|---|---|
| on the current boot, or under the 200 line threshold | silent, exit 0 |
| spawned before boot drift, or by a resume | silent, exit 0 — it can take no drift |
| past the threshold, not yet told of this drift | prints the nudge to stderr, exits 2, once |
| already told of this drift hash | silent; a new drift hash speaks again |
| past the 2000 line cap | the nudge names respawn as the one cure |

## .why rhachet declares no hook of its own

the framework does not own hooks (`rule.forbid.framework-owned-hooks`). which role carries it is
a choice for the role owner. without it, the drift still lands in each revision's `CLAUDE.md`, and
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
