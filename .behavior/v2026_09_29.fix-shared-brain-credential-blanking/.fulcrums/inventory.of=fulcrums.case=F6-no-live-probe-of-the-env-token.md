# F6 — enroll does no live probe of the env token, unless a dead token stalls

## .the fork

when `CLAUDE_CODE_OAUTH_TOKEN` is set, enroll may (a) trust it and spawn; or (b) check it before the spawn, and refuse if the server rejects it.

## .taken, and why at the time

(a), conditioned on a measurement, with (b) specified now as the branch the measurement may pick (case 8, branch B).

- (a) holds if a dead token fails fast as claude-code's own auth error: a check costs latency, and possibly a model request, on every spawn, and needs network at enroll; the token is opaque, so a shape check proves naught; the failure is box-wide but rare, and its cure is one step for the box
- (b) holds if claude-code's 401-wait makes a dead token stall. a stall is not a fail-safe, so rhachet takes the check to its own boundary

whether a dead token fails fast is unmeasured; the fork would have been decided by verification. superseded with F1 — under O3 no clone authenticates via the env token.

## .rework

clean — a check is an additive gate before the spawn.

## .confidence, and why it is low

70%. a machine spawner cannot parse a clone's pane, so under (a) a dead token looks to a supervisor the way the wish's outage did: crews that seem alive. that parse gap is `nheuron`'s poll health (the reseed dream), but a check would close it at the rhachet boundary. and if F1's ~8h doubt holds, deaths become daily, and (b) earns its cost regardless of the stall.

## .where

case 8; `1.vision.yield.md` › open questions.
