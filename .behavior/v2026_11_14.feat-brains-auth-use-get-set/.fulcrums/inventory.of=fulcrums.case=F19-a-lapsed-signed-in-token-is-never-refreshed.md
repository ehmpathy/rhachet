# F19 — a lapsed signed-in token is never refreshed by `get` or `use`

> raised in review i005 (r010); for the commander.

## .the fork

after an idle stretch (over an hour, no claude session open), the grove's access token has lapsed.
case=9 forbids a refresh of the signed-in token: a refresh rotates the token a live session holds in
memory, and that session then dies on its next call. so today:

- `get` reads the signed-in row `unverified`, with no windows
- `use` refuses, exit 2, until any claude session renews the login

options:

- A. never refresh it (today). the human opens any claude session once; the pool loop waits
- B. refresh it, under claude's own write lock, only when no live clone is seen. a lapsed token
  means no session has renewed it lately, so no live session may hold it; but a session the scan
  cannot see (a bare `claude` terminal, a clone of another repo) may still hold it in memory
- C. B, behind an explicit flag (`--renew-signed-in`), so the human chooses the risk

## .taken

A — a refresh of a token some unseen session still holds kills that session with a 401, and the
scan cannot see every session (case=7 names the bound). a wait costs the human one claude launch; a
wrong refresh costs a live session.

## .rework

clean — one branch in `getOneBrainAuthUsageOfGrove` and step 1 of `setBrainAuthAccountInUseAtGrove`,
both behind the lapsed check that already exists; no caller depends on the refusal.

## .confidence — 70%, why low

whether a live claude session re-reads the login file after another process refreshes it (vision
r3) was never probed on a real seat. if it does, B is safe and A costs the dawn flow for no gain.
the probe needs a real seat (F6).

## .where

`getOneBrainAuthUsageOfGrove.ts` (the lapsed branch) · `setBrainAuthAccountInUseAtGrove.ts` step 1 ·
`1.vision.experience.case=_.md` (`pool × grove × before unverifiable`, `any × grove × before
unverifiable`)

## .verdict

open — for the commander.
