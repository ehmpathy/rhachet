# F12 · `clone boot drift` renders a tree only, with no `--output json`

## .the fork

- **a.** tree only: the inspector speaks to an editor, the hook arm speaks to the clone itself
- **b.** add `--output json|tree`, as `clone list`, `say`, `get`, `whoami`, `prune` carry

## .taken = a

neither reader of this verb is a machine today: the inspector answers a human who met a stale reply,
and the hook arm's whole contract is its exit code plus a stderr message to the clone. a json shape
with no consumer is a contract to keep stable for none; the first supervisor or cron that wants it
names the fields it needs.

## .rework = clean

one option and one json render in `invokeCloneBoot`, over the drift object the domain op already
returns; additive, no caller breaks.

## .confidence = 75%, why

the peer clone verbs set an expectation of parity, and a supervisor reach is plausible soon.

## .where

`src/contract/cli/invokeCloneBoot.ts`. answers r9.nitpick.2.

## .verdict

reversed at peer review (5.3, i002, r2.nitpick.1): parity with the peer clone verbs outweighs the absent consumer. the inspector takes `--output json` (`{ address, serial, drift }`); the hook arm refuses `--output`, since it answers by exit code and stderr.
