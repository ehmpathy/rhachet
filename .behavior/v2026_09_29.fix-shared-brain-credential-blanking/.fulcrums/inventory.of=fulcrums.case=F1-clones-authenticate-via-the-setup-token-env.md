# F1 — clones authenticate via the `setup-token` env token

## .the fork

the wish lists five directions: serialize refresh (a box-wide lock), per-actor real logins, a refresh broker, atomic writes that never persist a blank, detect + self-heal. a sixth, not listed: take clones out of refresh entirely, via claude-code's documented long-lived credential `CLAUDE_CODE_OAUTH_TOKEN` (minted by `claude setup-token`).

## .taken, and why at the time

the sixth. it is the only direction that leaves **zero** clone refreshers, and it rides a documented claude-code contract ("for CI pipelines and scripts", precedence 5 above `/login` at 7). the others each fight claude-code's internals:
- a lock: claude-code's own refresh lock (where it exists) is taken on the config dir, which rhachet relocated per actor — rhachet cannot make claude-code honor a second lock
- a broker: rhachet would call the oauth token endpoint with claude-code's client id — undocumented, fragile
- per-actor logins: N browser handshakes, the cost the wish names
- atomic write / self-heal: rhachet is not the writer, and a revoked token family cannot be healed

## .rework

clean — the vision contract (enroll prefers an env token; refuses a blanked login) survives a swap of the direction beneath it; only case 1's mechanism would change.

## .confidence, and why it is low

75%. two unverified third-party reports cloud it (`anthropics/claude-code#24317`): a March 2026 comment says the server returned ~8h rather than one year for a `setup-token` token, and another says a February 2026 server-side enforcement blocked such tokens "outside the official Claude Code interactive flow". the current docs (fetched 2026-09-29) still state one year, and a clone IS claude-code. ⇒ verification must measure the token's real lifetime across ≥2 of the human login's 8h cycles before the done test counts.

## .where

`1.vision.yield.md` › the contract; case 1, case 2.
