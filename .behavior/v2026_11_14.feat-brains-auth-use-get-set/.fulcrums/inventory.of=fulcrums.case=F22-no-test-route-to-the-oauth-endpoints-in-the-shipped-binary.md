# F22 — the shipped binary has no test route to the oauth endpoints; the live set, get, use journeys wait on real seats

> raised by the acceptance-journey peer lane; ruled by the director, 2026-11-15: A stands.

## .the fork

the positive `set`, `get`, and `use` journeys through the built cli each call the claude oauth
endpoints (`claudeOauth.ts`: token, profile, usage). a stub `claude` binary can write a login file,
but every read after it reaches the real service, and a token the service never issued reads `dead`.

options:

- A. no route: the endpoints stay constants in `claudeOauth.ts`. the live positive journeys run
  against two seats set aside for tests (F6), and until then they are owed (today)
- B. an env var (or a config key) that points the built binary at another oauth host, so an
  acceptance test drives a local stub server
- C. a `--require` preload, via `NODE_OPTIONS`, that swaps `fetch` inside the spawned binary

## .taken

A —

- B puts a route to a foreign host in every shipped binary. whoever can set one env var for a
  process redirects its refresh token, the one credential that mints a seat's access, to a host of
  their choice. a test seam that leaks a credential is a security defect, and it ships to every
  caller to serve one suite
- C ships no seam, but it mocks the network inside an acceptance test. `rule.forbid.acceptance.mocks`
  forbids exactly that, and a swapped `fetch` proves the stub, not the service: it pins the reply
  shape we already pin at the cast boundary, on recorded replies
- so the live proof needs a live seat. the seats are F6, open for the commander

## .rework

clean — B is one lookup in `claudeOauth.ts` and one stub server in `blackbox/.test/infra`; C is one
preload file. neither moves a contract.

## .confidence — 85%

## .where

`src/domain.operations/brain/auth/account/claude/claudeOauth.ts` · `blackbox/cli/brains.auth.acceptance.test.ts`
· requirement inventory cases 10, 11, 12 (`owed`, with F6)

## .verdict

ruled by the director, 2026-11-15 (S4): A stands, the taken guess.

- the shipped binary carries no test route to the oauth endpoints. a test door in the binary is a
  door in prod
- the live `set`, `get`, and `use` journeys run only on real seats, in the narrow live tiers, never
  through a seam on the shipped surface
- B and C are closed. the live proofs wait on F6, which stays with the commander at his review
