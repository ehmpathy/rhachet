# research.priors

> groundwork for the credential-pool-rotation vision. every prior below is cross-referenced, never built on (issue ehmpathy/rhachet#575). read 2026-11-07.
> verdict tags per #324 finding: `holds` (likely still true), `re-verify` (docs-sourced or stale), `changed` (contradicted or superseded by a later source).

---

## 1. ehmpathy/rhachet#324 — `vlad/enroll-auth-swap` (april 2026)

### what it is

- pr #324 `feat(enroll): add enroll-auth-swap behavior vision and research`. state OPEN, never merged, +18216/-55 (`gh pr view 324 --repo ehmpathy/rhachet`).
- route dir `.behavior/v2026_04_10.enroll-auth-swap-spike/` on branch `vlad/enroll-auth-swap`. stones 0.wish → 1.vision → 2.x criteria → 3.1.1 research (q1–q10) → 3.3.1 blueprint → 4.1 roadmap → 5.1 execution → 5.3 verification. (`git ls-tree` of the branch.)
- wish (`0.wish.md`): 3x claude 20x-max subscriptions, 5hr limits "time out too fast", each cap means "open the others and cycle all the terminals". asks: rotate on limit "as a start", get "smarter later" from usage stats; asks for a poc of "a long lived token we can stamp in an env var".

### provenance caveat that governs every finding below

- every q1–q10 yield cites docs pages (code.claude.com/docs/en/authentication, platform.claude.com/docs/en/api/{errors,rate-limits}), not a measurement. q6 and q7 each end `[wisher] empirical test` and no later artifact on the branch closes either (`3.1.1.research.external.q6…yield.md`, `…q7…yield.md`).
- `5.3.verification.yield.md` proves phases 0–4 by unit/integration tests only; the real-claude acceptance suite is `describe.skip` ("cannot run inside nested Claude sessions"). no end-to-end swap or rotate was ever observed.
- the claude-code adapter's capacity read is a stub: `src/_topublish/rhachet-brains-anthropic/src/auth/genBrainAuthAdapterForClaudeCode.ts` returns `{ used: 0, limit: 100, left: 100, refreshAt: null }` for every credential, with a comment that the real call "would" parse rate-limit headers.

### research findings (q1–q10), verdicts

| q | #324 finding (cite: `…/3.1.1.research.{external|internal}.qN…yield.md`) | verdict | note |
|---|---|---|---|
| q1 | rate limit is http `429 rate_limit_error` (api errors doc) | holds for the raw api; re-verify for the cli | nheuron shows the cli surfaces a subscription cap as a screen banner, not a status code a wrapper sees: `You've hit your limit · resets HH:MM (UTC)` (`uladkasach/nheuron:.agent/repo=.this/role=any/briefs/define.invariant.crew.ratelimit.healable-transient.md:31`); weekly form `You've hit your weekly limit · resets Oct 20, 5pm (UTC)` (`…/src/stream/2026.Q4/2026-10-13.experiment=director-foreman.declapract.decisions.md:1331`). |
| q2 | `apiKeyHelper` runs on ttl (default 5 min, `CLAUDE_CODE_API_KEY_HELPER_TTL_MS`) or on 401; not on 429 | re-verify | docs quote only. no poc on the branch. also unproven there: that an `apiKeyHelper` return of a subscription oauth token (`sk-ant-oat01…`) is accepted as a subscription credential rather than treated as an api key; the adapter just prints `credential.token` (`genBrainAuthAdapterForClaudeCode.ts`, `supply()`). measure both before the vision leans on it. |
| q3 | env precedence: cloud vars > `ANTHROPIC_AUTH_TOKEN` > `ANTHROPIC_API_KEY` > `apiKeyHelper` > `CLAUDE_CODE_OAUTH_TOKEN` > subscription login | re-verify against claude-code 2.1.280 | today's code names the same three env keys as outranking the login file (`src/domain.operations/brain/auth/isBrainAuthViaEnv.ts`) but does not mention `apiKeyHelper`; it was read for 2.1.280. |
| q4 | `claude setup-token` exists; mints a one-year oauth token for ci/headless; no browser on the consumer box | holds as to existence; changed as to usefulness | nheuron measured 2026-09-05: setup-token scope is `user:inference` alone (a `/login` token also has `org:create_api_key user:profile user:sessions:claude_code user:mcp_servers user:file_upload`); "whether it drives a full repl is UNVERIFIED" (`uladkasach/nheuron:.agent/repo=.this/role=any/skills/git.grove.auth.sh:89-98`). minting it still needs a tty and a browser leg (same file, `--mech token`). |
| q5 | validity 1 year; annual manual re-mint is acceptable | re-verify | only the docs sentence "one-year". no expiry observed. dev-env-setup records that setup-token is rejected by the usage endpoint "since ~2026-02-20" (see §3), so even a live one cannot report its own capacity. |
| q6 | limits are per organization (api) / per subscription, not per ip | holds (likely), unproven by #324 | consistent with nheuron: "usage budget follows the account, never the token" (`term=auth.swap`) and a swap to an account with headroom unblocked a capped grove (§2). #324's own `[wisher] empirical` note was never closed. |
| q7 | auth is process-scoped; each terminal reads its own `settings.json`/`apiKeyHelper` | changed | clones on a box now share ONE login file by design (#571, §4); settings are per actor dir, credentials are not. the process-scoped premise only survives for an env credential (`CLAUDE_CODE_OAUTH_TOKEN`/`ANTHROPIC_API_KEY`), which today bypasses the shared login (`isBrainAuthViaEnv.ts`, `assertBrainAuthNotDead.ts:26`). |
| q8 | rate-limit response headers (`anthropic-ratelimit-*-remaining`, `retry-after`) allow proactive rotation; cli may not expose them; reactive-on-429 acceptable for the spike | changed | a different capacity source exists in practice: the undocumented `GET https://api.anthropic.com/api/oauth/usage` returns `five_hour`/`seven_day`/`seven_day_opus`/`limits`/`spend` windows with reset times (dev-env-setup, §3). headers on a subscription call were never observed in #324. capacity for a pool is therefore a 2+ window read, not one `left` number. |
| q9 | keyrack has no glob support; creds uri must list explicit key names (`unlockKeyrackKeys.ts` slug filter) | re-verify | keyrack changed a lot since (vaults, mechs, reach). see sibling `research.internal.keyrack-for-pool-tokens.md` rather than trust q9. the blueprint also planned `globKeyrackHostKeys.ts` to add glob, so q9 and the blueprint disagree. |
| q10 | env creds are read once at spawn and not re-read; only `apiKeyHelper` re-reads mid-session, so rotation of a live session needs `apiKeyHelper` | re-verify | docs only. conflicts with a measured claim: nheuron says a credential-file swap is "global and hot-reloaded", every live clone reads it mid-turn (`term=auth.swap`), while dev-env-setup's own help says open sessions "keep the OLD token in memory — restart them" (`brains.auth.sh` §9 help). two first-party sources disagree; the vision must measure it. |

### vision, as written (`1.vision.yield.md`)

- ioc split: rhachet defines `BrainAuthAdapter`; brain suppliers implement it (symmetric to `BrainHooksAdapter`); `rhx enroll --auth 'pool(keyrack://owner/env/K1,K2,K3)'` and `npx rhachet init --auth …` (repo default vs per-enroll override, "mirrors `--roles`").
- strategies `default | solo | pool`; sources `env://` and `keyrack://`; claude impl writes `apiKeyHelper` into `settings.json` pointing at `npx rhachet brains auth get --from <spec> --into claude.apiKeyHelper`.
- pool state in `~/.rhachet/brain/auth/state.json` (`activeTokenKey`, `limited{since,until}`); reactive rotation on 429→401; proactive/usage dashboard/team pools/auto-refresh all "out of scope".
- enrollment hash includes `auth` (config file `.claude/settings.enroll.$hash.local.json`).
- the blueprint then diverges from the vision: "stateless — no local state file; capacity queried fresh on each call", a "stateless parallel probe — try all tokens in parallel, first healthy wins" (`3.3.1.blueprint.product.yield.md` summary + design principles).

### blueprint domain objects and cli — what they were, what still fits

built on the branch: phases 0–4 only (domain objects, transformers, orchestrator, `invokeBrainsAuth`); phases 5–8 (`--auth` on enroll, real adapters, acceptance, docs) unchecked in `5.1.execution.phase0_to_phaseN.yield.md`. cli as built is `rhx brains auth supply|status --spec <spec> [--owner]` (`src/contract/cli/invokeBrainsAuth.ts`), not the vision's `brains auth get`; its rotation state is an in-memory `lastIndex` that dies with the process.

| object / op | what it was | fits today? |
|---|---|---|
| `BrainAuthSpec` (`Words`/`Shape`: `strategy` default\|solo\|pool, `source` keyrack uri) | a pool declared as a string flag | partly. the pool concept fits #575. a flag-string spec does not: #575 wants a declared file per actor plus custom sets, and the actor/clone law says config is the actor's, never per-run (`.agent/repo=.this/role=any/briefs/catalog.of=actor-clone-design._.md`, `rule.forbid.per-clone-config`). `solo` is a pool of one. |
| `BrainAuthCredential` `{slug, token}` | a keyrack key plus its secret value as a plain string | slug-by-ref fits. a bare `token` string does not: the stable credential for subscription accounts is an oauth refresh token that rotates on use (§3), and the setup-token variant carries only `user:inference` (§1 q4). |
| `BrainAuthCapacity` `{credential, tokens{unit:'percentage',used,limit,left}, refreshAt}` | per-credential headroom and reset time | the idea (headroom plus a reset instant) is exactly #575's pick rule. the shape is too thin: real reads have 5-hour, 7-day, and 7-day-opus windows, each with its own reset (§3). |
| `BrainAuthCapacityDao` (readonly `get.one/all`) | supplier-implemented capacity read | fits as a seam; the claude impl was a stub. |
| `BrainAuthAdapter` + `BrainAuthAdapterDao` (spec CRUD that writes `apiKeyHelper` into brain settings) + `BrainAuthSupplied` (credential formatted per brain) | supplier writes auth config into the brain's settings | does not fit. settings now live only in actor brain dirs under one layout (`define.brain-dir-layout-is-one-for-every-actor`), and no supplier writes there at enroll. keep only the supplier-owned read/format seams if the vision needs them. |
| `BrainAuthError` | typed codes `ALL_EXHAUSTED \| KEYRACK_LOCKED \| NO_SPEC \| INVALID_SPEC \| NO_BRAIN_ENROLLED` | superseded by `helpful-errors` `ConstraintError`/`MalfunctionError` as `rule.require.failloud` now demands; `ALL_EXHAUSTED` carrying `refreshAt` is still a good idea. |
| enrollment manifest `auth` field in the hash | auth splits enrollment identity | conflicts with today's identity model: the hash form is `sha256({brain, roles})` (`catalog.of=actor-clone-design._.md`, row 2). a pool is actor config; whether it joins identity is a decision for the vision, not an inheritance. |

- name collision to avoid: `src/domain.operations/brain/auth/*` in today's main already owns the `BrainAuth*` prefix for the shared-login file (`asBrainAuthState`, `isBrainAuthLive`, `assertBrainAuthNotDead`, `getBrainAuthPath`, `withBrainAuthWriteLock`). reusing #324's `BrainAuthCredential`/`BrainAuthCapacity` names would blur two concepts (`rule.forbid.domain-term-ambiguity`; qualify by boundary, `rule.require.boundary-qualified-terms`).

---

## 2. uladkasach/nheuron — `term=auth.swap` and `git.grove.auth`

all paths below are in `uladkasach/nheuron` @ origin/main, read 2026-11-07.

### term=auth.swap (`.agent/repo=.this/role=any/briefs/domain.terms/term=auth.swap._.choice._.md`)

- definition: "to **replace the account a machine is signed in as**. the machine stays; the identity changes." (l.15)
- swap vs rotate (l.27-38): rotate changes the **token** and holds the account ("same `email`, same `orgId`"); swap changes the **account** and holds the machine. "`keyrack fill --refresh` and `--repair` are rotates. `brains.auth.use --reach <email>` is a swap." and "usage budget follows the account, never the token."
- the swap can land naught (l.54-81): "a no-op swap … `✔ signed in as X` — *identical*"; the browser, not the caller, picks the account; "only a before/after on **both** `email` AND `orgId` can" part a real swap from a no-op. measured 2026-09-08 on `grove-ahbode-v20260901`: `beaver@`→`beaver@` twice (orgId unmoved), then `beaver@`→`vlad@ahbode.com` (orgId `8f414231…`→`580539f3…`).
- a refused code looks the same as a no-op (l.83-129): `auth status` "is blind to a failure BY CONSTRUCTION"; the repair reads the live pane for `OAuth error`, "the ORDER is the repair".
- global and hot (l.142-165): "the credential is machine-wide and **hot-reloaded**. the instant a swap lands, every clone on that grove reads the new account — mid-turn, parked, or idle alike." stated as a human correction of an unmeasured "restart needed" claim. (see the §1 q10 conflict with dev-env-setup's help text.)
- `cycle` is named and left unpaved (l.174): "a cycle is a *policy over* swaps ('move to the next account with headroom'). one swap is a step; a cycle is the whole loop."
- related: `…/.dream/2026_09_04.cycle-groves-by-account-headroom.dream.md` — the exact #575 policy, not built. body is "three reads and one act: sweep usage across stored accounts → drop any whose budget is spent → swap to the survivor with the most headroom → verify by comparison"; `--mode plan` is "the load-bearing half". blocked on three unverified setup-token properties: does it rotate; does `CLAUDE_CODE_OAUTH_TOKEN` grant full repl/agent/tools behavior; "🔴 **can one token serve N groves at once?**" ("if 3 is no … one token per (account × grove), never one per account"). also names the policy itself a fulcrum (most 7-day headroom vs 5-hour vs round-robin vs pinned order).
- `…/briefs/rule.require.spend-only-on-sponsored-trees.md:63`: "an `auth.swap` puts the whole grove onto **one** account" — the box is today's unit of choice, and which account is spent is a consent matter.

### git.grove.auth (`.agent/repo=.this/role=any/skills/git.grove.auth.sh`, 1635 lines)

- purpose (header l.3-18): sign a brain in on a grove from the human's own browser; a grove's sign-in "is a property of the MACHINE" (l.22): claude writes its credential to `~/.claude`, "one sign-in authorizes EVERY duct on that grove" — consistent with #571.
- two legs: leg 1 finds/raises the oauth prompt, lifts the url across, validates it carries `code_challenge=` and `state=`, `xdg-open`s it locally; leg 2 (`--code '<code>'`) pastes the browser-returned code back into the grove's prompt. `--mech oauth|attach|token` (`term=mech`): oauth boots its own duct, attach answers a prompt already up, token runs `claude setup-token` and "ends with a token printed on STDOUT and the grove unchanged" (l.75-98). swap on an already-authed box sends `/login` and meets the trust-folder screen at startup, not after sign-in (`term=auth.swap` l.40-52).
- verification limits (l.100-108; `term=partial-audit` ~l.758-773): `claude auth status` under `CLAUDE_CODE_OAUTH_TOKEN=<a fake token value>` returns `loggedIn: true`; "a token is proven by a call that spends it, never by a status line". under a `/login` it returns a real `email`/`orgId`.
- who runs it: director briefs make the swap a surdirector-only, two-leg human act (`rule.always.surdirector-runs-the-grove-auth-swap`, `rule.forbid.a-director-runs-the-grove-auth-swap`). #575's "no human sign-in" is a reversal of that policy and of the browser leg.
- the browserless twin is dev-env-setup (§3); `git.grove.auth --mech keyrack` was the dream's missing piece and is not in the file (mechs are oauth/attach/token only).

---

## 3. uladkasach/dev-env-setup — `brains.auth.use --reach <email>`

repo @ origin/main, read 2026-11-07. impl is one bash namespace, `src/grove.provision/2.shell/2.7.aliases/brains.auth.sh` (3305 lines; §1–§13 map in its header l.58-60); `.agent/repo=.this/role=any/skills/brains.auth.{use,usage,set}.sh` are thin proxies. vision `.behavior/v2026_07_28.brain-budget-utilization/1.vision.yield.md`.

### where per-account tokens live

- the global keyrack (reachable from any repo): owner `ehmpath`, env `prep`, ONE key `BRAINS_AUTH__OF__CLAUDE_CODE_OAUTH_TOKEN`, slug `@all.prep.BRAINS_AUTH__OF__CLAUDE_CODE_OAUTH_TOKEN`, **cut per account at a "reach" = the account's own email** (`brains.auth.sh` l.35-50, 77-79; `term=brains.auth.reach`).
- the stored secret is the oauth **refresh token** (`sk-ant-ort01-…`, ~108 chars), captured by `brains.auth.set` from an isolated `CLAUDE_CONFIG_DIR` browser login — NOT a `claude setup-token` (`hazard.claude-oauth-refresh-rotation.md` "implication for brains.auth.*").

### a swap, step by step (`_brains_auth_use`, §9, l.1806-2122)

1. derive who is signed in from the live token, never from a record: `GET https://api.anthropic.com/api/oauth/profile` with the live access token; fallback `~/.claude.json` `.oauthAccount.emailAddress` may only label, never authorize a write (it was measured confidently wrong, 2026-08-31).
2. refuse if identity is unknown or unverified; no-op (exit 0) if already on the target reach; refuse if a leftover `~/.claude/.credentials.json.bak` holds a sole token.
3. read the target's refresh token from the keyrack; read the live refresh token (`.claudeAiOauth.refreshToken`) as the "park read".
4. mint: `POST https://platform.claude.com/v1/oauth/token` `{grant_type:"refresh_token", refresh_token, client_id:"9d1c250a-e61b-44d9-88ed-5944d1962f5e"}` with header `anthropic-beta: oauth-2025-04-20` and a pinned `User-Agent: claude-cli/2.1.280 (external, cli)` (an unrecognized UA lands on a persistent-429 path). reply holds a fresh access token and a rotated refresh token.
5. compare-and-swap: re-read the live refresh token; abort (re-filing the rotated token to the keyrack) if it changed mid-flight.
6. write files: byte-verified `.credentials.json.bak`, then an atomic temp+`chmod 600`+rename of **`~/.claude/.credentials.json`** with `.claudeAiOauth = {accessToken, refreshToken, expiresAt, scopes, subscriptionType}` (`_brains_auth_install_creds`, `_brains_auth_write_secret`).
7. then, never before, park the account swapped off: write its token to the keyrack ("install-then-park", so a refresh token has exactly one holder at every instant).
8. sync claude's own profile: write `~/.claude.json` `.oauthAccount = {accountUuid, emailAddress}` from a fresh `/api/oauth/profile` read of the new token.

- verification: step 8's profile read of the installed token is the landing check; exit 0 landed, 1 our break or stale profile view, 2 needs a human (help text in `_brains_auth_use`). it is not literally a before/after email+orgId compare, but it re-derives the account from the new token, which meets the same bar against the no-op hazard.
- hot or restart: help ends "open claude sessions keep the OLD token in memory — restart them after." (l.1841, 2114, 2120). compare nheuron's "global and hot". unresolved, see §1 q10.
- deliberately not an automation surface: `brains.auth.use.sh` header l.21-30 withholds a `--json` contract because "a machine-readable credential swap invites an unattended caller to drive it". #575 asks for exactly that unattended caller.

### capacity read — `brains.auth.usage`

- `GET https://api.anthropic.com/api/oauth/usage?cedar_ember=1&at_wall=1` with a freshly minted access token; windows `five_hour`, `seven_day`, `seven_day_opus`, `limits`, `spend`; reset-grant fields `cedar_ember`/`juniper_tide` are opt-in and gated by the cli-shaped user-agent (`hazard.claude-usage-endpoint-is-undocumented.md`). a sweep is `--reach @all`.
- hazards that bind a pool design: the endpoint is undocumented and may vanish; the long-lived setup-token is rejected here ("Invalid bearer token" since ~2026-02-20, `hazard.claude-oauth-refresh-rotation.md`); the live account's usage must be read from its own access token with zero refreshes, parked accounts refresh freely and must write the rotated token back.

### hazards the rotation design inherits (`.agent/repo=.this/role=any/briefs/creds/`)

- `hazard.claude-oauth-refresh-rotation.md`: refresh tokens are single-use with server rotation; 2026-07-31 a probe refreshed the live token and locked the human out; a rotated value dropped by a decode bug stranded three accounts on 2026-08-31. rule: rotation code runs once, on one expendable subject, with stderr visible.
- `hazard.claude-oauth-one-holder-per-token.md`: "two holders of one refresh token cannot both stay live"; partition by holder (active in `~/.claude`, parked in keyrack); never record "who is active", derive it.
- relevance to #575: any design that gives N actors/clones their own copy of one account's refresh token recreates the two-holder lockout. long-lived setup-tokens avoid rotation but cannot report capacity and carry only `user:inference`.

---

## 4. ehmpathy/rhachet#569 and #571 — one shared claude login per box

- **#571** `fix(enroll): share one claude login across clones` — MERGED 2026-10-01. spawns every clone with `CLAUDE_SECURESTORAGE_CONFIG_DIR=""` (empty, not unset; `src/domain.operations/enroll/asBrainCliSpawnEnv.ts`) so all clones read and refresh one `~/.claude` login under claude-code's own locks; migrates 1.48.0 per-actor credential symlinks into the shared login under the claude-code write lock (`~/.claude/.storage-write.lock`, `withBrainAuthWriteLock.ts`, stale 15s, refreshed every 5s); refuses to spawn on a dead shared login with a `/login` hint (`assertBrainAuthNotDead.ts`), unless the spawn env supplies `CLAUDE_CODE_OAUTH_TOKEN`/`ANTHROPIC_API_KEY`/`ANTHROPIC_AUTH_TOKEN` (`isBrainAuthViaEnv.ts`); tests include lock cases 1–7, a migration integration test, and a shared-brain-auth acceptance test.
- **#569** is an issue, not a pr: `🎙️ task - fix-shared-brain-credential-blanking: one clone refresh de-auths every clone on the box`; state OPEN as read 2026-11-07. it records the defect #571 answers: 18 clone dirs symlinked to one `.credentials.json`; at [timestamp] the shared file's `accessToken`/`refreshToken` were blanked to `""` (`expiresAt: 0`, `refreshTokenExpiresAt` and `subscriptionType` kept) 3m24s before access-token expiry; two own-file actors refreshed fine 86s earlier ("the sharing is the variable"); claude-code owns the bad write, rhachet owns the amplifier. its candidate directions: serialize refresh, per-actor real credentials, a refresh broker, atomic-no-blank write, detect and self-heal. #571's body does not claim to close #569 and the issue is still open, so whether the lock model fully ends the blanking is unproven.
- consequences for #575: (a) the unit of credential choice is the box unless a clone is spawned with an env credential, which is the one extant per-clone seam (`isBrainAuthViaEnv`); (b) a swap of `~/.claude/.credentials.json` (the dev-env-setup mechanism) is naturally box-global and rides the same lock; (c) per-actor logins re-open the N-logins and blanking trade space that #569 priced; (d) a pool of several accounts means several refresh tokens, each of which tolerates exactly one holder.
