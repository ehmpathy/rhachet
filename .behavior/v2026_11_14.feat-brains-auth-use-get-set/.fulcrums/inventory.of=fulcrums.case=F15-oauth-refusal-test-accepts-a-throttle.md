# F15 — the live usage-refusal test accepts a throttle as a refusal

## .the fork

`getOneClaudeOauthReply.integration.test.ts` [case2][t1] reads the live usage endpoint with an
access token the provider never issued. it pinned `dead`. measured on 2026-11-14, the endpoint
answered that token 401 (`dead`) at first, then 429 (`rate-limited`) on two runs eleven minutes
apart, while the profile endpoint in the same runs still answered 401. the usage endpoint throttles
per caller before it checks the token.

- **A** — pin `dead` and accept a red run whenever the caller is throttled
- **B** — assert the refusal the test exists to prove: not `ok`, not `unreadable`. a drift in url,
  client id or agent still shows as `unreadable` and goes red
- **C** — retry with a backoff until a 401 arrives

## .taken, why

**B**. the test's own `.why` is to catch drift, and drift reads `unreadable`; a throttle is a reply
from the endpoint that was reached. A makes ci red on the provider's throttle state, with no defect
in this repo. C adds minutes of wait to a suite and still loses to a long window.

## .rework

clean. one assertion in one test.

## .confidence — 80%, why not higher

the 429 could also be the endpoint's new answer to every unissued token, in which case `dead` is
no longer reachable here at all. B holds either way, but the distinction is unmeasured.

## .where

- `src/domain.operations/brain/auth/account/claude/getOneClaudeOauthReply.integration.test.ts`

## .verdict

open.
