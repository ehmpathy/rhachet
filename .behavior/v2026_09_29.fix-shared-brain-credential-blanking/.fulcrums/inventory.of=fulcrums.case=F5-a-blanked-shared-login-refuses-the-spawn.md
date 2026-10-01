# F5 — a blanked shared login refuses the spawn, exit 2

## .the fork

when there is no env token and the human's file has empty secrets beside a live `refreshTokenExpiresAt`: (a) spawn anyway, as today; (b) spawn, plus a warn line; (c) refuse before the spawn, exit 2, both cures named.

## .taken, and why at the time

(c). the shape is known-dead: a claude.ai login with no refresh token cannot recover without a human. a spawn yields a clone that looks alive and is not — the exact confident-wrong state the wish flags in the fleet poll. a refusal is what a supervisor can act on.

scope, widened at the experience-coverage review: the check reads whichever file the clone would use, whether the human's through the link or the actor's own (case 5 `[t1]`). it stands down when an env credential that claude-code ranks above `/login` is set (`CLAUDE_CODE_OAUTH_TOKEN`, `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`), because then the file is not the clone's credential (case 3 `[t2]`).

## .rework

clean.

## .confidence, and why it is low

85%. the shape test reads a file claude-code owns; a future claude-code release may change the field names, and the check must then fall through to (a), never refuse a healthy login. enroll must read only field presence and length, never log a value.

## .where

case 3; case 5 `[t1]`.
