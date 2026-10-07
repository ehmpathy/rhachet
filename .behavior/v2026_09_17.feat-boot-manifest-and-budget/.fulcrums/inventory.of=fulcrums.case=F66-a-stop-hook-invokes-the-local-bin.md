# F66 — must the generated stop hook invoke the cli via `npx`, rather than `./node_modules/.bin`?

- **raised** = 2026-10-02, at `5.1.execution.from_vision`, `review.peer i024` — `repo-rules` nitpick.2
- **rework** = clean
- **status** = OPEN — **no**, keep the local bin
- **confidence** = **82%**

## .the fork, stated fairly

`REPO_THIS_BUDGET_HOOK_COMMAND` writes `./node_modules/.bin/rhachet roles cost …` into the brain
dir's `settings.json`. `rule.forbid.node-modules-bin-rhx` asks for `npx rhx`.

| | **local bin** (taken) | **`npx`** |
|---|---|---|
| fit with the other hooks | every hook in `settings.json` uses `./node_modules/.bin/rhx` or `./node_modules/.bin/rhachet` (route.drive, route.bounce, memory.guard, …) | the one hook in a second dialect |
| cost per stop | the bin, direct | npx resolution on every stop |
| the rule's scope | its pattern and enforcement name an agent's own exercise of the built cli | — |

## .the call, and why

**local bin.** the hook joins a set of hooks that all use the local bin, and a stop hook runs on
every stop, where npx resolution is a per-stop cost. the rule governs how an agent exercises the
cli by hand, not the hook commands the framework writes.

🔴 `npx` is not an option a hook may take at all: `assertRegistryHooksNoNpx` (on `main` since #523)
refuses `npx rhachet` in a role hook, and `repo.introspect.acceptance` [case10] pins the refusal,
whose own remedy names `./node_modules/.bin/rhachet`. so the rule the reviewer cites and the
guard the repo ships point opposite ways for a hook, and the guard is the one that runs.

`rule.require.when-names-the-caller` line 73 now names this directly: a hook that calls a cli
command writes `./node_modules/.bin/rhachet …` — never `rhx` (a skill lookup), never `npx`
(refused by the guard).

## .why the confidence is 82%

whether the rule should reach generated hook commands is a rule-scope question; if the wisher says
yes, the fix is one constant plus every other hook, which belongs in its own change.

## .rework

clean — one constant.
