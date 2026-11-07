# research.external.claude-auth-and-usage

researched 2026-11-07. tags: VERIFIED = official doc fetched / cli output. OBSERVED = community writeup or github issue, not official. UNVERIFIED = no source found, or sources conflict.

method note: `claude` on this box is aliased to `rhx enroll claude`, so `claude --version` / `claude setup-token --help` spawned clones and printed no help. cli help text was NOT captured; all claims below come from docs, not binary output. no credential file was read.

doc roots: https://code.claude.com/docs/en/ (docs.claude.com 301-redirects there).

---

## 1. `claude setup-token`

- VERIFIED: mints a one-year oauth token. "generate a one-year OAuth token with `claude setup-token`". same browser flow as `/login`; token prints to terminal after approval. [authentication#generate-a-long-lived-token](https://code.claude.com/docs/en/authentication)
- VERIFIED: it does not store the token. "It does not save the token anywhere; copy it and set it as the `CLAUDE_CODE_OAUTH_TOKEN` environment variable wherever you want to authenticate." (same page)
- VERIFIED: headless use is the stated purpose: ci pipelines and other hosts where "interactive browser login isn't available". the mint itself needs a browser, once, on some machine; the token is then a plain env var.
- VERIFIED: carries the subscription: "authenticates with your Claude subscription and requires a Pro, Max, Ultra, Team, or Enterprise plan". (same page)
- VERIFIED: model requests only: "can only make model requests, so it can't establish Remote Control sessions or fetch claude.ai connectors. MCP servers you configure locally still work."
- VERIFIED: `--bare` mode ignores it: "Bare mode does not read `CLAUDE_CODE_OAUTH_TOKEN`."
- VERIFIED: setup-token enforces `forceLoginMethod` but not `forceLoginOrgUUID`, "so they can mint a token in a different organization". [authentication#restrict-login-to-your-organization]
- OBSERVED: prefix `sk-ant-oat01-`. [CodexBar#1894](https://github.com/steipete/CodexBar/issues/1894) (request shows `authorization: Bearer sk-ant-oat01-…`); qcode.cc writeup.
- OBSERVED: scope is `user:inference` only. CodexBar#1894: setup-token returns 403 on `GET /api/oauth/usage` because that needs `user:profile`; `POST /v1/messages` works. => the minted token cannot read the usage endpoint, but can read the unified rate-limit headers off a real inference call (see 3).
- OBSERVED: the plain messages api (api-key route) rejects it; it works only through claude code / the oauth beta header. (qcode.cc summary; not first-party.)
- UNVERIFIED: "one active long-lived token per subscription; re-running setup-token invalidates the previous". source is a community gist only (https://gist.github.com/coenjacobs/d37adc34149d8c30034cd1f20a89cce9). matters for design: test with two mints before relying on N tokens per account.
- UNVERIFIED: exact ttl (docs say "one-year"; no expiry field documented). no refresh token: on revoke/expiry requests 401 (OBSERVED, qcode.cc). docs error strings: `OAuth token has expired`, `OAuth token revoked` ([errors](https://code.claude.com/docs/en/errors)).

## 2. credential precedence and reload

VERIFIED precedence, [authentication#authentication-precedence](https://code.claude.com/docs/en/authentication), first match wins:
1. cloud provider creds (`CLAUDE_CODE_USE_BEDROCK` / `_VERTEX` / `_FOUNDRY`)
2. `ANTHROPIC_AUTH_TOKEN` (bearer)
3. `ANTHROPIC_API_KEY` (x-api-key; interactive mode asks approval once, `-p` always uses it)
4. `apiKeyHelper` command output
5. `CLAUDE_CODE_OAUTH_TOKEN` (long-lived token from setup-token)
6. anthropic profile / federation creds (`ANTHROPIC_PROFILE` etc.)
7. subscription oauth from `/login` (keychain on macos; `~/.claude/.credentials.json` mode 0600 on linux)

consequences for rotation (VERIFIED from the list): a stray `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN` or `apiKeyHelper` outranks `CLAUDE_CODE_OAUTH_TOKEN`. a pool must unset ranks 2/3/4 in the clone env.

- VERIFIED: `CLAUDE_CONFIG_DIR` relocates the login store: ".credentials.json file under that directory instead ... and keys the macOS Keychain entry to that directory too". docs show per-account config dirs as the supported multi-account pattern ("Log in with multiple accounts"). [authentication]
- VERIFIED: env var set => "If you run `/login` while the variable is set, Claude Code switches the current session to the new login." (precedence #5 note)
- VERIFIED hot reload, only for `apiKeyHelper`: "Claude Code caches the credential and reruns the command only when it expires or a 401 response indicates it's no longer valid." [settings-reference#apikeyhelper](https://code.claude.com/docs/en/settings-reference). settings docs also say edits to `apiKeyHelper` apply to a running session without restart. [settings#when-edits-take-effect]
  - caveat: the apiKeyHelper path is documented as an *API credential* (x-api-key / bearer). whether its output may be an oauth `sk-ant-oat01-` token is UNVERIFIED.
- UNVERIFIED: no doc says a running process re-reads `CLAUDE_CODE_OAUTH_TOKEN` (env is fixed at process start; a parent cannot change a child's env) or re-reads `.credentials.json` on 401/429. docs only say stored `/login` creds auto-refresh ("Claude Code refreshes the profile's login automatically"; `Login expired · Please run /login` when refresh fails). => assume a running process holds its credential; rotation means a new process (restart / new clone) unless apiKeyHelper proves usable with oauth tokens.
- VERIFIED: a 429 is not a credential trigger: "Temporary 429 throttles" are retried; session/weekly exhaustion surfaces as `You've hit your session limit` / `weekly limit` (errors page). no documented auto-switch of accounts.

## 3. reading per-account capacity

### 3a. in-session, official (VERIFIED)
- `/usage` (aliases `/cost`, `/stats`): "Show session cost, plan usage limits, and activity stats." interactive; no machine output documented. [commands](https://code.claude.com/docs/en/commands)
- `/status`: version, model, account, connectivity; shows `Login` row `Expired — log in again` for dead logins. [authentication#renew-an-expiring-login]
- statusline stdin json, official and the supported machine-readable path: [statusline](https://code.claude.com/docs/en/statusline)
  - `rate_limits.five_hour.used_percentage` / `rate_limits.seven_day.used_percentage` — "from 0 to 100"
  - `rate_limits.five_hour.resets_at` / `rate_limits.seven_day.resets_at` — "Unix epoch seconds"
  - present "only for claude.ai Pro, Max, and Ultra subscribers", "only after the first API response in the session"; each window "may be independently absent, and Claude Code drops a window once its `resets_at` time passes".
  - a running clone with a statusline command can therefore report its own account's windows with no extra network call. caveat: needs one api response first (cold start has none).

### 3b. oauth usage endpoint — UNOFFICIAL / UNDOCUMENTED (OBSERVED)
- `GET https://api.anthropic.com/api/oauth/usage`, headers `Authorization: Bearer <oauth access token>` + `anthropic-beta: oauth-2025-04-20`; some reports add `User-Agent: claude-code/<ver>`. [anthropics/claude-code#31637](https://github.com/anthropics/claude-code/issues/31637), [#31021](https://github.com/anthropics/claude-code/issues/31021), crate https://crates.io/crates/claude-usage, [openclient#29](https://github.com/ntoporcov/openclient/issues/29)
- shape (conflicting reports): `{ "five_hour": { "utilization": 8.0, "resets_at": "<ISO8601>" }, "seven_day": { ... } }` (claude-usage crate, ISO string); #31637 shows `rate_limits.five_hour.{used_percentage,resets_at: <epoch>}` (likely statusline-derived). treat shape as UNVERIFIED; parse defensively. either window may be null; idle account: `five_hour: { utilization: 0, resets_at: null }` ([get-bb/bb#7149](https://github.com/get-bb/bb/issues/7149)).
- auth scope: needs `user:profile`; a setup-token (`user:inference`) gets 403 (CodexBar#1894). so it works with a `/login` access token, not with a setup-token.
- rate limit: aggressive. ~30 req/hour/account per [claude-swap#500](https://github.com/realiti4/claude-swap/issues/500); #31637 reports ~5 requests per access token then persistent 429 (30+ min), no `Retry-After`; closed "not planned", no anthropic staff reply.
- stability risk: no first-party doc, no stability promise, shape already inconsistent across reports. one issue argues third-party use of oauth tokens here may breach consumer terms ([claude-hud#287](https://github.com/jarrodwatts/claude-hud/issues/287)); see 5.

### 3c. unified rate-limit response headers (OBSERVED, not documented)
on `POST https://api.anthropic.com/v1/messages` with `Authorization: Bearer <oauth token>`, `anthropic-version: 2023-06-01`, `anthropic-beta: oauth-2025-04-20`. sources: CodexBar#1894 (live capture), claude-swap#500, [ssdnodes writeup](https://www.ssdnodes.com/learn/claude-api-rate-limit-headers-explained), [claude-rate-monitor](https://github.com/nsanden/claude-rate-monitor).
- `anthropic-ratelimit-unified-5h-utilization` (fraction 0–1 in captures, e.g. `0.01`; sources disagree 0–1 vs 0–100)
- `anthropic-ratelimit-unified-5h-reset` (epoch s, e.g. `1783180800`)
- `anthropic-ratelimit-unified-5h-status` (`allowed` / `allowed_warning` / `rejected`)
- `anthropic-ratelimit-unified-7d-utilization|-reset|-status` (same)
- `anthropic-ratelimit-unified-status`, `-reset` (overall)
- `anthropic-ratelimit-unified-representative-claim` (`five_hour` | `seven_day`; the binding window)
- `-fallback-percentage`, `-overage-status`, `-overage-disabled-reason` also seen
- works with a setup-token: CodexBar#1894 minimal call (claude-haiku, `max_tokens:1`, ~1 output token per poll) returned 200 with the headers while `/api/oauth/usage` gave 403. => cheapest pool probe that works with `user:inference` tokens, per-account, no usage-endpoint throttle.
- stability: unofficial; opencode#49653 shows tools mis-parse `-utilization`/`-status`. header names could change without notice.

recommendation shape for the vision (not a claim): prefer (1) statusline `rate_limits` from live clones, (2) headers from a 1-token probe per account, (3) `/api/oauth/usage` only as a best-effort extra, never required.

## 4. window model

- OBSERVED (third-party explainers citing the help center; official support article not fetched): two limits at once — a session limit that "resets every five hours" and a separate weekly limit that "resets at a fixed day and time assigned to your account". 5h window starts at the session's first message (one source). pooled across surfaces: web, desktop, mobile and claude code share one pool. sources: https://contextbolt.com/blog/claude-usage-limits/, https://sessionwatcher.com/guides/claude-code-rate-limits-explained, https://www.ssdnodes.com/learn/can-you-reset-claude-usage-limits
- OBSERVED: plan names in flux (Max 5x/20x vs "Ultra"); Max/Ultra have a separate weekly limit for one model line. weekly-exhausted means a 5h reset does not help.
- VERIFIED: official `/usage` and statusline expose both windows, `used_percentage` + `resets_at` (3a). docs error text: `You've hit your session limit`, `weekly limit`, `Opus limit`, `Sonnet limit`. [errors]
- VERIFIED: advertised limits "assume ordinary, individual usage of Claude Code and the Agent SDK". [legal-and-compliance#acceptable-use]
- reset times known via: statusline `resets_at` (VERIFIED), unified `-reset` headers (OBSERVED), oauth usage endpoint (OBSERVED), `/usage` ui (VERIFIED). a window with no activity has `resets_at: null` / is dropped — "soonest reset" must treat idle-window accounts as fully available.
- UNVERIFIED: per-account vs per-ip. no doc found for ip-based limiting; all docs and tools key utilization to the account/token. treat as per-account (OBSERVED by implication: every tool tracks per token) but not confirmed against ip.
- UNVERIFIED: official docs do not say how long a 429 mid-window lasts vs a hard `rejected` status.

## 5. terms of service (stated neutrally; not legal advice)

- consumer terms (effective 2025-10-08), https://www.anthropic.com/legal/consumer-terms, section 2: "You may not share your Account login information, Anthropic API key, or Account credentials with anyone else." and "You also may not make your Account available to anyone else." (VERIFIED, fetched)
- consumer terms, section 3: prohibits accessing the Services "through automated or non-human means, whether through a bot [...] or otherwise", except "when you are accessing our Services via an Anthropic API Key or where we otherwise explicitly permit it"; also "bypassing any of our systems or protective measures". (VERIFIED, fetched; section numbering per fetch summary, third-party reads cite it as 3.7; `[...]` elides one word)
- the fetch found no clause on multiple accounts per person or on circumvention of usage limits by name. (VERIFIED absence in fetched text; reread the full terms before relying on that.)
- claude code legal page, https://code.claude.com/docs/en/legal-and-compliance (VERIFIED):
  - "OAuth authentication is intended exclusively for purchasers of Claude Free, Pro, Max, Ultra, Team, and Enterprise subscription plans and is designed to support ordinary use of Claude Code and other native Anthropic applications."
  - "Anthropic does not permit third-party developers to offer Claude.ai login into their own applications, or to route requests through Free, Pro, Max, or Ultra plan credentials on behalf of their users." and developers "may not collect, store, or intermediate Claude.ai credentials or session tokens".
  - "Customers may not pay for, resell, or intermediate Claude usage on their end users' behalf. Each end user must authenticate with their own Anthropic API key, Claude subscription plan credentials, or 3P inference provider credential."
  - not restricted: "an end user from signing in to the unmodified Claude Code binary with their own Claude subscription".
  - "Anthropic reserves the right to take measures to enforce these restrictions and may do so without prior notice."
- OBSERVED enforcement context: jan 2026 server-side blocks of third-party tools using subscription oauth; docs clarified feb 2026 ([The Register](https://www.theregister.com/software/2026/02/20/anthropic-clarifies-ban-on-third-party-tool-access-to-claude/5014546)).
- reading relevant to the pool, without a verdict: the documented, endorsed path is one human's own subscription driving the unmodified claude code binary; `setup-token` is documented for ci and non-interactive hosts. open questions the vision must put to the wisher:
  - (a) are all N accounts the operator's own, each logged in by the account owner?
  - (b) does an unattended fleet count as "ordinary, individual usage"?
  - (c) rotation to evade a limit vs use of the accounts for their own seats; section 3 "bypassing ... protective measures" may be read against limit-evasion.
  - (d) calling `/api/oauth/usage` or `/v1/messages` directly with the oauth token from non-claude-code code is the use that the legal page and claude-hud#287 flag as most exposed; prefer reading limits only through the unmodified claude code binary (statusline `rate_limits`).
- for a defensible variant, consider api-key (console) auth or a Team/Enterprise plan under commercial terms for fleet work; not evaluated here.

---

## sources index
- https://code.claude.com/docs/en/authentication
- https://code.claude.com/docs/en/settings, /settings-reference, /commands, /errors, /statusline, /legal-and-compliance
- https://www.anthropic.com/legal/consumer-terms
- https://github.com/steipete/CodexBar/issues/1894
- https://github.com/realiti4/claude-swap/issues/500
- https://github.com/anthropics/claude-code/issues/31637 , /31021
- https://github.com/jarrodwatts/claude-hud/issues/287
- https://github.com/get-bb/bb/issues/7149
- https://crates.io/crates/claude-usage
- https://gist.github.com/coenjacobs/d37adc34149d8c30034cd1f20a89cce9
- https://qcode.cc/en/claude-code-headless-oauth-token-expired
- https://www.theregister.com/software/2026/02/20/anthropic-clarifies-ban-on-third-party-tool-access-to-claude/5014546
