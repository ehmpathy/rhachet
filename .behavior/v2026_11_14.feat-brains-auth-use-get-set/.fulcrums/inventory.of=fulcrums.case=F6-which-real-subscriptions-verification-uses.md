# F6 — which real subscriptions verification uses

> for the commander's review at blueprint (seed S1).

## .the fork

the done-when requires tests against at least two real claude subscriptions. every test read rotates
each account's refresh token, and a test that drops a rotation strands the account. options:

- A. two seats the wisher sets aside for tests, filed into the keyrack once by a human via
  `rhx brains auth set`, under a test env (e.g. env `test`, owner `ehmpath`), never the seat a human
  works on
- B. the wisher's own daily seats
- C. one real seat plus a second org of the same email (a7), if one exists

## .taken

A — a test rotates the token on every run, so a seat a human works on would be one bad run from a
stranded login. a test env keeps test seats apart from the `prep` seats the pool will use.

## .rework

clean — the test reads two keyrack slots by name; which seats fill them is a human act, not code.

## .confidence — 60%, why low

the seats, their emails, and their keyrack env are the wisher's to name. until then the integration
and acceptance tests that need them fail fast with a `ConstraintError` that names the
`rhx brains auth set` a human must run.

## .two cheaper steps the council may also weigh (raised in review i004)

- **a `get` of the signed-in account alone.** `get --account <signed-in email>` reads the grove row
  with the live access token and refreshes naught, so it spends no seat. it would pin the profile
  and usage parse, and the parity with `brains.auth.usage`, for one account. it still reads a real
  account on this box, which the driver may not do, so it waits on the commander's word
- **a loopback-only provider seam.** the built binary could take a provider endpoint override,
  bound to `127.0.0.1`, so acceptance runs the positive `set`, `get` and `use` against a local fake.
  it adds an env seam to prod code; the loopback bound is what keeps it from a token-exfil vector,
  and each such test owes an inline `.mock / .why / .real` note. a commander's call

neither replaces the two-seat proof the wish names; each narrows what that proof must still cover.

## .where

`1.vision.yield.md` → q7 · `inventory.of=requirements.case=27`, `case=28` (their proofs)

## .verdict

open — for the commander.
