# S12 — speed: tests and spin-up are held fast

## .holds

- a slow test is a defect. each step carries a timeout that names its cost and cuts the test short.
- prod code never imports eagerly. every command takes the thinnest import path it can.
- an upstream defect or efficiency found here is dispatched to the repo that owns it.
- every actor spawns claude with non-essential startup work turned off by default: claude.ai
  connectors, non-essential traffic, the autoupdater, telemetry, and error reports.
- a startup lever is searched for, not guessed. what the search finds is applied to all actors.
- fulcrums, seeds, and lessons are caught before the next piece of work starts.

## .said

> slow tests are unacceptable
>
> add timeouts … to ensure we know exactly where the cost is … and short circuit if too slow
>
> yeah lets ensure that we never eager import; always should go through thinnest import path possible.
>
> enrule that
>
> dispatch a task to teach that upstream package the efficiency fix, and another for the bug fix
>
> radio is open, so you can emit all those dispatches
>
> why does that test take over 3min already?
>
> oh we should disable all that for all actors really
>
> all this for all actors by default plz; `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1'`,
> `ENABLE_CLAUDEAI_MCP_SERVERS: 'false'`, `DISABLE_AUTOUPDATER: '1'`, `DISABLE_TELEMETRY: '1'`,
> `DISABLE_ERROR_REPORTING: '1'`
>
> dont forget to websearch what we can do to make it spinup faster too
>
> catch fulcrums and seeds and lessons first
>
> and then search
>
> and then propagate
