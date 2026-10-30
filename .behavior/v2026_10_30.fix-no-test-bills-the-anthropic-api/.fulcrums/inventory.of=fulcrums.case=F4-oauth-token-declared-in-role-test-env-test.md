# F4 — the oauth token is declared in each role=test env.test

## .the fork
- (a) `CLAUDE_CODE_OAUTH_TOKEN` replaces `ANTHROPIC_API_KEY` in the same manifest (rhachet: `.agent/repo=.this/role=test/keyrack.yml`)
- (b) a shared role from a package declares it for every repo

## .taken
(a): it keeps each repo's manifest the one truth for what its tests need, and the firewall
already reads it.

## .rework
clean: a manifest move.

## .confidence = 90%

## .where
each repo's env.test manifest, listed in the yield.
