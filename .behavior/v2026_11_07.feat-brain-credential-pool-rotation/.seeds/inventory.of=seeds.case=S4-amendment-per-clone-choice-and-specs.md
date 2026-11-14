# seed S4 — amendment: per-clone choice, and the specs to reconcile

source: the commander, mid-drive, 2026-11-07 (amendment of [time] and [time])

## .said

> an amendment to your wish (commander, [time] and [time]), part of the vision due [time].the vision covers:- ad-hoc choice per clone of which credential pool or account it uses, beside any automatic pick- a read of each credential capacity left and its reset, the way uladkasach/dev-env-setup brains.auth.usage does today- rotation by usage and expiry: the session that resets soonest is spent first, no capacity left unused- long-lived tokens held in keyrack, fetched per --reachit answers the open question on #575 (per box, actor, or clone): ad-hoc per clone, or at least choose the pool.

> the specs your vision must cite and reconcile (each confirmed to exist; read each whole):- ehmpathy/rhachet .behavior/v2026_09_29.fix-shared-brain-credential-blanking/.seeds S2 (one subscription per reach via keyrack: org token, else the machine default), S3 (rotate live clones on our timeline: 15-min ttl, or at once on a usage limit), S4 (limits are per subscription), and its refs/inventory.of=options._.md (O5, O7, O8)- ehmpathy/rhachet .dream/v2026_09_29.feat.per-subscription-reach-and-live-rotation.md (per-reach auth, an api-key helper backed by rhx keyrack get, swap on usage limit): the newest spec for per-clone choice- ehmpathy/rhachet .dream/v2026_09_29.reseed.grove-crews-should-spawn-with-the-setup-token.md (a one-year setup-token per grove; warns a ~9h keyrack unlock undercuts it)- ehmpathy/rhachet #324 (apiKeyHelper fires on ttl or 401, not 429), #531, #675- ehmpathy/rhachet-roles-bhuild #522 (usage per subscription on the board)- uladkasach/dev-env-setup .behavior/v2026_07_28.brain-budget-utilization (brains.auth.usage, .use --reach, .creds.get; refresh tokens per reach in keyrack, since the usage endpoint refuses the setup-token) and its creds/hazard.claude-oauth-*.md briefs- uladkasach/nheuron .dream/2026_09_04.cycle-groves-by-account-headroom.dream.mddone means the vision states how per-clone choice, capacity reads, rotation by usage and expiry, and long-lived keyrack tokens compose, and answers the open question on #575 (per box, actor, or clone) with the commander ask: ad-hoc per clone, or at least choose the pool. vision pr still due [time]; the link goes in your report.

## .settled

- the unit of choice is the **clone**: a clone may be pointed ad hoc at a pool or one account, beside the automatic pick. at minimum, the pool is choosable
- capacity is read per credential, left + reset, the way `brains.auth.usage` reads it
- rotation spends the soonest reset first, by usage and by expiry; no capacity is left unspent
- long-lived tokens live in keyrack, fetched per `--reach`
- the vision cites and reconciles the named specs, each read whole
- deliverable: the vision on a pr in ehmpathy/rhachet by [time]; the link in the report
