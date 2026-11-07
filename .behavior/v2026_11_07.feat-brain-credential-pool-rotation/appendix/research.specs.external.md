# research.specs.external

external specs read whole, 2026-11-07. cited by repo + path. no credential value read or quoted.

## ehmpathy/rhachet#531 — enroll detects ratelimits (open task)

src: `gh issue view 531 --repo ehmpathy/rhachet` (no comments).

says:
- a provider throttle on a `rhx enroll` subprocess surfaces only as `💥 malfunction: review timed out after N minutes`. ratelimit and slowness look the same.
- caller (route guard peer-review lane) needs to retry-with-backoff on a ratelimit, but narrow or widen the timeout on a real timeout.

bars (each owes a test):
1. classify: provider 429 / `rate_limit_error` / "overloaded" gives a DISTINCT ratelimit-classed error naming "ratelimit". not a timeout, not a silent hang.
2. distinguishable: distinct exit code and/or stable message token, so a parent can tell ratelimit from timeout without a substring guess.
3. retry-after: surface `Retry-After` / `retry_after` (e.g. 30s) in the error.
4. no failhide: a ratelimit never becomes a clean/empty verdict. non-zero exit, named error.

implies for pool rotation:
- the ratelimit class from #531 is the TRIGGER signal for rotation: a clone on credential A hits 429 / overloaded, enroll classifies it, the pool picks credential B.
- retry-after gives a cooldown stamp per credential: mark A cooled until now+retry_after, skip it in the pick.
- a rotation must never hide a ratelimit: if every pool member is cooled, fail loud with the named class (bar 4), not a timeout.
- caution: the dev-env-setup UA hazard (below) shows a 429 can be a request-shape rejection, not a volume throttle. classify must not assume "429 = quota"; a wrong-shape 429 never clears, so rotate-and-retry loops forever.

## ehmpathy/rhachet#675 — no test or seat bills the anthropic api (open task)

src: `gh issue view 675 --repo ehmpathy/rhachet` (no comments).

says:
- the $100 anthropic api credit (granted 2026-10-18) is spent; no top-up. ehmpathy/rhachet#649 and ehmpathy/rhachet-roles-bhrain#728 are red on "Credit balance too low".
- six repos declare `ANTHROPIC_API_KEY` in keyrack (rhachet `role=test` env.test; bhrain; bhuild; rhight x2; mhedic; brains-anthropic).
- hypothesis: `keyrack unlock --env test` (and `git.repo.test`, which unlocks for integration and acceptance) puts `ANTHROPIC_API_KEY` in the env of a process that then spawns claude code, so claude code bills the api, not the subscription.
- known api callers: rhachet `blackbox/.test/infra/brainDirBootJourney.ts` (spawns `claude -p --model haiku`); bhrain `stepReview.caseBrain.claude-sonnet.integration.test.ts`; bhrain `reflect` default brain `anthropic/claude/sonnet-4`; brains-anthropic integration suites.

outcome required:
1. measured ranked table of every caller of `ehmpathy.test.ANTHROPIC_API_KEY` since 2026-10-18 (repo, suite/seat, model, calls). from evidence, a gap is named.
2. cure at source: tests that need claude code run on `CLAUDE_CODE_OAUTH_TOKEN` (subscription). rhachet `isBrainAuthViaEnv` already accepts it. no unlock or test run leaves `ANTHROPIC_API_KEY` in an env that spawns claude code. `ANTHROPIC_API_KEY` leaves every env.test unless a test proves it cannot run another way (each named with proof).
3. one human act left (a ci secret for the oauth token) proven to the last reachable step, handed up as one command.

done means: a clamp red without the cure (test env that spawns claude code holds no `ANTHROPIC_API_KEY`; claude code journey passes on `CLAUDE_CODE_OAUTH_TOKEN`); ranked caller table; a pr per repo, `git.release --watch` green or named gated on the one secret.
bounds: no api top-up; no swap of a real-brain test to a fake brain; a test whose subject is claude code still spawns real claude code.

implies for pool rotation:
- the pool member kind is a subscription oauth credential, never `ANTHROPIC_API_KEY`. a pool that can fall back to an api key re-opens the billing leak. the pool must refuse (or never hold) an `sk-ant-api…` member for claude code.
- `isBrainAuthViaEnv` / `CLAUDE_CODE_OAUTH_TOKEN` is the extant env-injection seam; per-clone credential selection can ride that seam (set the env for the spawned brain-cli only).
- the clone spawn env must be scrubbed of `ANTHROPIC_API_KEY` when a pool credential is chosen (the issue's own hypothesis is that the api key wins and bills the api).
- ci needs one oauth secret; a pool of N means N secrets or a keyrack-backed read. out of scope to solve, but name it.

## ehmpathy/rhachet-roles-bhuild#522 — board shows auth usage per subscription (open task)

src: `gh issue view 522 --repo ehmpathy/rhachet-roles-bhuild` (no comments).

says:
- the fleet board shows one row per auth subscription: capacity, use, % used, reset time. sits beside the concurrency-cut table because the cut is set by usage.
- today no one sees saturation until a pane's cap line says so; the commander sets each cut by hand-read usage on one machine.
- source exists: global `brains.auth.usage` (dev-env-setup, role=any). per account, % used per window (`five_hour`, `seven_day`, …) and each window's reset. every call appends one json line to a durable log: `~/.rhachet/storage/repo=dev-env-setup/role=any/.log/brains.auth.usage/usage.<YYYY-MM-DD>.jsonl`.
- hazard stated: a live `brains.auth.usage` call WRITES. it rotates each account's refresh token and stores it back to keyrack; help asks for no more than one poll per 5 minutes. a board render must not add a second churn of the credential store.

done means: one row per subscription (capacity, use, %, reset); each row says how old its read is, stale marked never shown as current; no token value read, rendered, logged, quoted anywhere; clamp red when the source holds a subscription the board omits or a stale read shown as fresh; pr waits on commander review.
bounds: home orgs only; source is the acceleration premises (subrock://rhachet/acceleration) via the surdirector.

implies for pool rotation:
- the usage jsonl log is the READ-ONLY feed for headroom-aware picks: a pool picker reads the log, never calls `brains.auth.usage` live per clone spawn (rotation churn + 5-min floor).
- staleness is first-class: a pick based on a stale read must say so (age on the read), and fall back to a policy that needs no fresh read (round-robin / last-ratelimit cooldown).
- the board and the pool picker share one source of truth for per-credential usage; two readers of a rotating token is the lockout hazard below.
- a pool member = a subscription keyed by its reach (email); the board row key and the pool member key should be the same name.
- no token value in any pick log or clone record.

## uladkasach/dev-env-setup `.behavior/v2026_07_28.brain-budget-utilization/`

src: `0.wish.md`, `1.vision.yield.md` (595 lines), `5.1.execution.from_vision.yield.md` (738 lines). no blueprint stone in the route (stones: 1.vision, 5.1.execution.from_vision, 5.3.verification).

wish (0.wish.md): a bash alias to see the usage left on any claude code subscription, by auth token sourced from keyrack `--org @all`. `claude /usage` in a subshell is acceptable if needed. (the vision later struck the tui fallback, 2026-09-02: "no tui fallback".)

### brains.auth.usage — what shipped

- endpoint: `GET https://api.anthropic.com/api/oauth/usage` (undocumented, reverse-engineered; `hazard.claude-usage-endpoint-is-undocumented.md` records the risk).
- auth: `Authorization: Bearer <access_token>`, `anthropic-beta: oauth-2025-04-20`, `User-Agent: claude-code/<ver>` (pinned, see UA hazard), `Content-Type: application/json`. token rides stdin / scoped env, never argv (`/proc/<pid>/cmdline` is world-readable).
- response (`5.1…yield` + `hazard.claude-oauth-refresh-rotation.md` l.37-40): 200 json with `five_hour` / `seven_day` / `seven_day_opus` / `limits` / `spend` windows. shape gate requires `.five_hour` and `.seven_day` objects with a NUMERIC `.utilization` (a non-number "n/a" once rendered as a confident "0% used"; null caught by the type check). reset times per window. the field is the share SPENT (utilization), rendered "% used". `--json` passes the endpoint body through keyed by reach email: `.["kai@example.com"].five_hour.utilization`.
- the setup-token (`sk-ant-oat01` from `claude setup-token`) is REJECTED by the usage endpoint ("Invalid bearer token") since ~2026-02-20. only a freshly refreshed access token works.
- mint path per parked account: `POST https://platform.claude.com/v1/oauth/token` (not `console.anthropic.com`, which 404/301s), body `{grant_type:"refresh_token", refresh_token, client_id:"9d1c250a-e61b-44d9-88ed-5944d1962f5e"}`, `Content-Type: application/json`. returns a short-lived `access_token` plus a ROTATED `refresh_token`. no `-L` on the mint (a redirect would re-POST the long-lived token body to an unvetted host).
- throttle: help states a 5-minute floor, one poll per 5 min. each read mints and writes one keyrack entry per account, so a 60s statusline tick churns the credential store. `@all` sweep is sequential; the vision's open question on whether a burst trips a shared limit is not closed in the yield.
- exit codes: 0 at least one account read; 1 all failed and at least one failure is ours; 2 all failed and every failure is the caller's. error classes split: 429 / 5xx (`usage_server_error`, malfunction) / other 4xx (`usage_rejected`, constraint, e.g. 403 token without usage scope). a 5xx on the mint never means "token dead".
- account name = REACH = the email the token reports (`/api/oauth/profile`). one keyrack key per reach in the global keyrack (`--org @all`); the earlier `--sub <slug>` / `BRAINS_AUTH__OF__CLAUDE_CODE_OAUTH_TOKEN__FOR__<slug>` scheme is retired (`--sub` still parses, warns on stderr). reach is validated as an email; `@all` is the only non-email value.
- keyrack discovery: `keyrack list` takes no `--org` and lists the whole host; owner/env are two constants. one keyrack unlock per account per command (memo), because a 4N unlock multiplier once filled zram via daemon accumulation.

### brains.auth.use --reach — how the swap is done

- `brains.auth.use [--reach <email>]` swaps the GLOBAL claude login (`~/.claude/.credentials.json` + profile block in `~/.claude.json`). no args reports who is signed in. no `--json` on purpose (an unattended caller that drives a credential swap is a footgun).
- sequence: read live refresh token (`park_read`) before overwrite; mint target (rotates server-side); write a `.bak` restore point (verified byte-identical, 0600; copy failure REFUSES install); install target creds; park the prior account's token to keyrack AFTER install (install-then-park, never park-then-install: that leaves one token in two places); `sync_profile` rewrites `~/.claude.json`. a failed install files the target's rotated token back.
- guards: compare-and-swap (re-read live refresh token right before install; refuse if it is not the one parked; abort, never re-park the newcomer; file the target's rotated token back); strand guard (a leftover `.bak` that holds an account's last token blocks the next swap, before keyrack read and mint); identity must be api-VERIFIED to authorize a swap; a lagged profile-file identity may label, never authorize. no lock (a stale lockfile wedges; and no lock stops a human `claude /login`).
- for pool rotation: this swap is machine-global and single-holder. it is NOT a per-clone mechanism. per-clone selection needs a per-clone `CLAUDE_CONFIG_DIR` (see `brains.auth.creds.get --dir`, and the isolated login `set` uses) or `CLAUDE_CODE_OAUTH_TOKEN` env on the spawn, never an edit of `~/.claude`.

### brains.auth.creds.get (`.agent/repo=.this/role=any/skills/brains.auth.creds.get.sh`)

- read-only report of where a login landed; `--dir <path>` reads any claude config dir (default `~/.claude`). never writes, never refreshes, never prints a token. reports only kind by prefix: `sk-ant-ort` (refresh) / `sk-ant-oat` (access) / other shape; plus mtimes, top keys, `subscriptionType`, and account email. account file is `$dir/.claude.json`, except the global dir, which uses `~/.claude.json`. for the global dir it asks the api who the live token belongs to ("verified by the api" vs "UNVERIFIED — from the lagged account file").
- shape of the creds file: `.claudeAiOauth.{refreshToken,accessToken,expiresAt,subscriptionType}`.
- implies: a per-clone brain dir can hold its own `.credentials.json` of the same shape; creds.get is the verification probe for "did this clone's dir get the credential I meant".

### why refresh tokens (not setup-tokens) per reach in keyrack

- setup-token is rejected by the usage endpoint since ~2026-02-20 (above). only a refreshed access token reads usage.
- a refresh token captured from an ISOLATED login (`CLAUDE_CONFIG_DIR=<mktemp -d>`, chmod 700, separate account) is independent of the global session, so rotating it is safe. `set` files the ROTATED token, never the captured one, because the identity mint (`/api/oauth/profile`) rotates too. an unchecked `mktemp -d` failure once risked writing the login into `~/.claude`; now refused at the boundary.
- the nheuron dream (below) lists "does a setup-token rotate / grant full behavior / serve N groves at once" as UNVERIFIED, so the setup-token cannot yet stand in.

### hazards (`.agent/repo=.this/role=any/briefs/creds/hazard.claude-oauth-*.md`, all three read whole)

1. refresh-token single-use rotation (`hazard.claude-oauth-refresh-rotation.md`): a refresh returns a new access token AND a new refresh token, and invalidates the old one server-side. 2026-07-31: a probe refreshed the token read from live `~/.claude/.credentials.json`; the open session held the dead token and got 401; human locked out. rules: never read or refresh the refresh token out of the global creds; capture via isolated login; every mint owns its write-back, even a mint made only to learn identity; to test the refresh path, target an isolated `CLAUDE_CONFIG_DIR`.
   - trap: a stored token that refreshes after weeks idle proves none of it (every read writes the current value back). only a known-superseded token tests invalidation (A→B, retry A). the lockout is that experiment run by accident: the old token dies.
   - 2026-08-31: a jq parse error AFTER a successful http mint dropped the rotated value for three accounts in one sweep; keyrack kept the dead copy. rule: code that rotates or overwrites a credential runs ONCE against ONE expendable subject with every error stream visible, never a sweep, never stderr muted; never mute stderr on a decode downstream of a successful mutation.
2. two holders, one token (`hazard.claude-oauth-one-holder-per-token.md`): two holders of one refresh token cannot both stay live; whoever refreshes second is rejected and the human is logged out. partition by holder, never duplicate: ACTIVE (global cli signed in) = live token in `~/.claude/.credentials.json`, refreshed by `claude` alone; PARKED = keyrack, refreshed by the budget reader alone. a keyrack copy of an active account is stale by construction. "keep the two copies in sync" is the tell to stop: a single-use secret has no consistent two-copy state, only a race with a loser.
   - never record "which slug is active"; derive it from the live credential each time (api `/api/oauth/profile` with the live access token, no refresh). profile-file fallback can be CONFIDENTLY WRONG (measured 2026-08-31: file named one email, token belonged to another). an identity read has 3 outcomes: known / unknown (refuse) / confidently wrong (label only, never authorize a mutation).
   - an active-account read issues zero refreshes; an expired access token is claude's to renew. a parked-account read refreshes freely and writes back. a swap parks before it installs (harvest then overwrite), or the prior account is orphaned and needs a full browser re-auth.
3. UA 429 (`hazard.claude-oauth-user-agent-429.md`): the token and usage endpoints reject an unrecognized `User-Agent` into a persistent `429 rate_limit_error` that never clears with time (proof 2026-08-02: same account/token/URL/header/body; `claude-code/2.0.1` → 200, `claude-code/2.1.87` from `claude --version` → 429 across a full day). a 429 rejects at the gate and never reads the token: re-auth does not help. rule: pin a known-accepted UA (not from `claude --version`), as a single overridable constant (`BRAINS_AUTH_UA`), and treat a persistent 429 as "suspect UA first". pinned value `_BRAINS_AUTH_UA_PINNED='claude-code/2.0.1'`. debug lever: `BRAINS_AUTH_DEBUG=1` prints the raw non-200 body.
4. also in the yield: rotation race between two overlapped sweeps (the loser's rejection looks like a dead token). cure is no lock: on rejection re-read the keyrack (polled, bounded); a CHANGED stored value proves another holder rotated it, retry once; a byte-identical value means truly dead. test-suite hazard: fixtures that write via path variables with real-dotfile defaults clobbered the human's live `~/.claude.json` (`hazard.test-fixtures-leak-to-real-dotfiles.md`); any pool test must prove its redirect, and `wc -c` the real file either side.

implies for a per-clone pool rotation design:
- the pool is a set of PARKED credentials; each is held by exactly one refresher. if a clone runs on a pool member, that clone's brain-cli becomes the sole refresher of that member (it writes the rotated refresh token into its OWN dir), and the keyrack copy goes stale by construction. rotation therefore needs an explicit holder lease per member: one clone holds a member at a time, or the design must put the single refresher outside the clones.
- one member shared by N concurrent clones = N holders of one single-use refresh token = a lockout race. the nheuron dream names this unverified and decisive ("one token per (account × grove), never one per account" if N-at-once fails). treat 1 member ↔ ≤1 live clone as the safe default until measured with a known-superseded token.
- `CLAUDE_CODE_OAUTH_TOKEN` with a long-lived `sk-ant-oat` setup token would skip refresh-token rotation, but it is unverified for rotation, full repl/agent/tool behavior, and N-at-once use, and the usage endpoint rejects it. so headroom reads cannot ride on it.
- identity of a member comes from the credential via api profile, not from a recorded slug; the pool record must not hold "who holds what" as a remembered fact that goes stale behind a human `/login`.
- an assignment must be install-then-park with compare-and-swap, a strand guard, a verified `.bak`, and a rotated token always written back. a lease path that drops a rotated token strands the member with no live copy anywhere.
- first run of any new rotate/overwrite code: once, one expendable account, stderr visible; never a fleet sweep.
- pin the UA for any direct oauth call; a pool "ratelimited, rotate" rule must rule out UA 429 first or it cycles through every member forever.

## uladkasach/nheuron `.dream/2026_09_04.cycle-groves-by-account-headroom.dream.md`

src: `rhx git.repo.get lines --in uladkasach/nheuron --paths '.dream/2026_09_04.cycle-groves-by-account-headroom.dream.md'` (91 lines). a caught dream, not built. kind=build, owner nheuron (grove surface) with a read from dev-env-setup, caught 2026-09-04.

says:
- cue: a grove ran low on budget mid-fleet; the human asked for a swap. the swap is paved (`term=auth.swap`), the CHOICE of account is not: today it lives in a human's head.
- gap: three facts that do not meet: per-account budget used per window (`brains.auth.usage --reach @all`: 5-hour %, 7-day %, opus %, resets) · the set of stored accounts (global keyrack, cut per email) · the act that moves a grove to one (`git.grove.auth`, or its browserless twin). no policy joins them.
- shape: `rhx git.grove.cycle <grove> --brain claude` picks the freshest account and swaps; `--mode plan` says which it WOULD pick and why. body = sweep usage across stored accounts → drop any whose budget is spent → swap to the survivor with most headroom → verify by comparison. `--mode plan` is the load-bearing half (safe-by-default; a human must be able to disagree before it moves a live fleet).
- naming: a swap is a step ("become this account", account named); a cycle is a policy over swaps ("become whichever is freshest", account derived). so NOT `--reach auto`: an auto-valued flag hides a policy where it cannot be planned, argued, or tested apart from the act.
- not done because not safe yet. three unverified properties of a `setup-token`: (1) does it rotate? ("long-lived" is anthropic's word, not a guarantee) (2) does `CLAUDE_CODE_OAUTH_TOKEN` grant a clone FULL behavior (repl, agent, tools)? (3) 🔴 can one token serve N groves at once? if no, a shared vault inverts into a race and the topology changes to one token per (account × grove), never one per account. the policy itself is a fulcrum: most 7-day headroom vs most 5-hour vs round-robin vs pinned order; a wrong pick strands a fleet on a spent account.
- must land first: `git.grove.auth --mech keyrack` (browserless swap a policy can drive) and keyrack reach on a grove (september reported `daemon: not found`, so no stored account readable there). ⇒ cycle is the third rung: persist, then swap browserlessly, then choose automatically.

implies for a per-clone pool-rotation design:
- split policy from step, as the dream does: a `pick` verb with a plan mode (shows which credential and why, changes none) apart from the act that installs it into a clone. do not hide the policy in an auto-valued flag.
- the pick policy is a fulcrum to flag, not to decide silently: headroom axis (5h vs 7d vs opus), round-robin, pinned order. fail safe: plan first.
- the three unverified setup-token properties are the open research the design must close or route around: rotation, full behavior under `CLAUDE_CODE_OAUTH_TOKEN`, N-at-once. if N-at-once fails, the pool needs a lease per (credential × clone), which fits the one-holder hazard above.
- a clone must be able to reach the pool store (keyrack reach). the dream's blocker "no stored account readable on a grove" is the same precondition for a clone: the clone spawn path must read the credential without a browser and without the human's global keyrack session.
- verify by comparison after a pick: confirm the clone's dir now holds the chosen account (creds.get-style kind/email report), never trust the write alone.
