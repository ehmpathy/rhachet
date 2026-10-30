# F3 — one org secret for the oauth token, not one per repo

## .the fork
- (a) one `CLAUDE_CODE_OAUTH_TOKEN` org secret on ehmpathy, visible to the six repos
- (b) one repo secret per repo

## .taken
(a): one human act, one rotation a year (`claude setup-token` mints a one-year token). every
workflow already passes `secrets: inherit`, and the keyrack firewall filters to declared keys.

## .rework
clean: the same value set per repo.

## .confidence = 85%
the org may restrict org secrets to some repos; the exact command names `--repos` to cover that.

## .where
the hand-up command in the yield.
