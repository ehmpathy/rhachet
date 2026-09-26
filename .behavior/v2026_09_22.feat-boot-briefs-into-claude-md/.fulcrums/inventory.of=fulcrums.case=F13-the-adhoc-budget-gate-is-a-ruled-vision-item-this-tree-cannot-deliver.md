# F13 — the adhoc budget gate lives on a peer branch

## .fork

F3 ruled the adhoc budget gate. its implementation (`genBootPayload`, `assertBootWithinBudget`,
`calcBootPayloadTokens`) lives on `beav/feat-boot-manifest-and-budget`, not in this tree.

| option | verdict |
|---|---|
| a. land the peer branch first | ❌ the p0 waits on a branch this route does not own |
| **b. ship the role half here; the adhoc half ships with its own branch** | ✅ **taken** |
| c. re-implement the gate here | ❌ the peer wish forbids a second renderer |

## .verdict — RULED by the vision's `.out of scope`

*"the adhoc budget gate and its manifest header — `beav/feat-boot-manifest-and-budget`."*

## .grounds

- the urgency is the **role** census: 10 of 15 role boots breach the cap. the adhoc corpus rides the
  hook either way and does not block the cli upgrade.
- the vision's static/dynamic split already draws this seam: role → `boot.md`, adhoc → the hook.
- this tree's criteria carry no adhoc-budget usecase, so no coverage bar is left undischarged.

## .where

- vision `.out of scope`, `.static and dynamic corpora` · criteria `.out of scope` · F3
