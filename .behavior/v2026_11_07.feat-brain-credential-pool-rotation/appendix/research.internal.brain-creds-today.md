# research.internal.brain-creds-today

what is true today in `ehmpathy/rhachet` @ `beav/feat-brain-credential-pool-rotation` (base 6e3b6771, v1.51.0), for the vision on #575. paths are repo-relative. UNVERIFIED marks a claim not checked against code or a live run.

## 1. how a claude brain-cli clone gets its credential

two distinct "brain" paths exist. keep them apart.

- **a. clone path (a `claude` cli process, the subject of #575).** spawn env is built in one place, `asBrainCliSpawnEnv`:
  - starts from spinup defaults (`ENABLE_CLAUDEAI_MCP_SERVERS=false`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`, `DISABLE_AUTOUPDATER=1`, `DISABLE_TELEMETRY=1`, `DISABLE_ERROR_REPORTING=1`) — src/domain.operations/enroll/asBrainCliSpawnEnv.ts:38-44
  - then the caller env minus parent-session markers and handoff keys — asBrainCliSpawnEnv.ts:11-21, 66-71
  - then forces `CLAUDE_CONFIG_DIR = <actor brain dir>` and `CLAUDE_SECURESTORAGE_CONFIG_DIR = ''` (empty, not unset) — asBrainCliSpawnEnv.ts:72-73
  - the caller value of `CLAUDE_SECURESTORAGE_CONFIG_DIR` is always overridden — src/domain.operations/enroll/asBrainCliSpawnEnv.test.ts:33-46
- **no credential env var is set by rhachet.** `CLAUDE_CODE_OAUTH_TOKEN`, `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN` are not written anywhere in non-test src. they pass through only when already in the enroller's `process.env` (the filter drops only parent-session + handoff keys) — asBrainCliSpawnEnv.ts:66-71; proven by a test that keeps `ANTHROPIC_API_KEY` — asBrainCliSpawnEnv.test.ts:49-90.
- **`apiKeyHelper`: zero hits in src** (grepsafe over `src`; only the three env names + `CLAUDE_*CONFIG_DIR` matched). rhachet never writes it. claude-code's own `apiKeyHelper` semantics are UNVERIFIED here (see #324 q2).
- **env credential outranks the login file** (claude-code 2.1.280, per rhachet's own reading): `CLAUDE_CODE_OAUTH_TOKEN`, `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`; an empty value counts as absent — src/domain.operations/brain/auth/isBrainAuthViaEnv.ts:8-21.
- **absent env credential → the clone reads the shared login file** `~/.claude/.credentials.json` — src/domain.operations/brain/auth/getBrainAuthPath.ts:8-9. the key is `claudeAiOauth.refreshToken`; the dead state is an emptied `refreshToken` — asBrainAuthOauth.ts:12-27, asBrainAuthState.ts:14-24.
- **spawn sites (both call `asBrainCliSpawnEnv`):**
  - pty clone: src/domain.operations/clone/pty/genBrainCliPtyClone.ts:123-136, spawn at :147-153
  - plain clone: src/domain.operations/clone/pty/genBrainCliPlainClone.ts:43-63
  - choice between them: src/domain.operations/clone/genCloneSpawn.ts:100-131
  - command is `claude` for brain `claude` / `claude-code` — src/domain.operations/brain/getSupportedBrainCommand.ts:40-43
  - enroll driver: src/contract/cli/invokeEnroll.ts (brain dir at :540-546; spawn via `genCloneOndisk` at :645-663)
- **env is fixed at spawn.** the child's env cannot change after `pty.spawn` / `spawn`. only the shared login file is live-reloadable: "one `/login` heals every live clone at once", "every live clone recovers on the refill, with no respawn" — src/domain.operations/brain/auth/assertBrainAuthNotDead.ts:6-12, :33. a re-pick by env var would need a respawn; a re-pick by file write would not. (claude-code hot-reload of the file is taken from these comments, UNVERIFIED against a live run.)
- **enroll refuses a dead shared login** unless an env credential is set — assertBrainAuthNotDead.ts:20-35; called at invokeEnroll.ts:612-613. an absent login only warns — invokeEnroll.ts:614-615, :670-671.
- **the brain-dir `.credentials.json` is legacy** (1.48.0 per-actor login). enroll retires it: kept while a clone lives, else adopted into the shared login if that is dead or absent, then removed — src/domain.operations/actor/enrolled/setBrainDirAuthMigrated.ts:25-68; path owner getBrainDirAuthPath.ts:8-9; called at invokeEnroll.ts:572-588.
- **the codepath brief verified (and its scope).** `.agent/repo=.this/role=any/briefs/define.brain-creds-codepath.md` describes the **sdk brain** path (fireworks etc.), not the claude-cli clone path:
  - `genContextBrain({ creds })` → `genContextBrainSupplier` → brain package → `getSdkCredsFromBrainSupplies` → keyrack — src/domain.operations/context/genContextBrain.ts:48-142, src/domain.operations/brain/getSdkCredsFromBrainSupplies.ts:22-74
  - creds type is `{ keyrack: { owner, env } } | (() => Promise<TKeys>)`, no env fallback — src/domain.objects/BrainSuppliesCreds.ts:10-12, getSdkCredsFromBrainSupplies.ts:17
  - the brief omits `CLAUDE_*` env and the claude login entirely. a pool for claude-cli clones does not touch this path.
  - `rhachet-brains-anthropic` 0.4.3 is a devDependency (package.json:176) — the sdk anthropic atom/repl. whether it takes `ANTHROPIC_API_KEY` via keyrack creds: UNVERIFIED (package not read).

## 2. the shared-login model (PR #569 → #571)

- #571 "fix(enroll): share one claude login across clones", MERGED (`gh pr view 571`). summary lines: spawn clones with `CLAUDE_SECURESTORAGE_CONFIG_DIR=""`; migrate 1.48.0 per-actor symlinks into the shared login under the claude-code write lock; refuse a dead shared login with a `/login` hint; tests lock cases 1-7, migration integration, shared-brain-auth acceptance.
- **in code:**
  - one login per box: `~/.claude/.credentials.json` — getBrainAuthPath.ts:8-9; rationale asBrainCliSpawnEnv.ts:56-60 ("one login file under one lock set for every clone").
  - config stays per actor via `CLAUDE_CONFIG_DIR` (the actor brain dir) — asBrainCliSpawnEnv.ts:72.
  - write lock speaks claude-code's own protocol: proper-lockfile dir `~/.claude/.storage-write.lock`, stale 15s, mtime heartbeat every 5s, 20 tries with linear backoff, inode-checked release — src/domain.operations/brain/auth/withBrainAuthWriteLock.ts:28-60, :62-64, :133-143. (claude-code's `.oauth_refresh.lock` is the heartbeat model, per the comment at :20-23.)
  - the only rhachet writer under that lock today is the legacy adoption — setBrainDirAuthMigrated.ts:45-58 (`setFileAtomic`, mode 0o600).
  - acceptance: blackbox/cli/enroll.shared-brain-auth.acceptance.test.ts
- **consequence for #575.** the unit of credential choice today is the box (one file), not the actor or clone. a per-actor / per-clone pick can only be realised two ways:
  1. an env credential (`CLAUDE_CODE_OAUTH_TOKEN` / `ANTHROPIC_API_KEY`) injected into the spawn env — wins over the file (isBrainAuthViaEnv.ts:14-21), per clone, fixed for that clone's life; or
  2. a write of the shared file under `withBrainAuthWriteLock` — box-wide, live for all clones.
  - both compose with #571 without break. option 1 leaves the shared file alone; option 2 reuses the lock. no code today picks either.
- **the spawn env is built from the enroller's `process.env`.** an env credential for a clone must be injected by the caller or inside `asBrainCliSpawnEnv`'s `env` argument at the two spawn sites; there is no hook for it yet.

## 3. actor dir layout, and where a pool declaration would fit

- **root:** `<repo>/.agent/.actors` — src/domain.operations/actor/enrolled/getActorsRootDir.ts:18-19.
- **actor dir:** `.agent/.actors/actor.via.<exid>` (`repo=ambient`, `hash=<h>`, `slug=<s>`, derived `slug=<base>._.delta=<h>`) — getActorOndiskDir.ts:17-24; repo actor exid `repo=ambient` — src/domain.operations/actor/enrolled/constants.ts:43.
- **brain dir:** `<actorDir>/brain/.claude` — getBrainOndiskDir.ts:7-8. this is each clone's `CLAUDE_CONFIG_DIR`.
- **layout rules (briefs in `.agent/repo=.this/role=any/briefs/`):**
  - one layout for every actor; content (boot.md, settings.of.repo.json) is the only difference — define.brain-dir-layout-is-one-for-every-actor.md
  - an actor owns config, a clone references it; a per-clone copy of what derives from `{ brain, roles }` is a blocker — rule.forbid.per-clone-config.md
  - the test: "does this derive from `{ brain, roles }` or from this run?" — catalog.of=actor-clone-design._.md, rule.forbid.per-clone-config.md
  - add a file to every actor's brain dir or to none — rule.forbid.brain-dir-layout-divergence.md (cited by the layout brief; not read here)
- **fit for `brain/creds.yml` (a per-actor pool declaration):** a pool is config an actor owns, not a run artifact, so by the test it sits in the actor's brain dir (or the actor dir beside `brain/`), never under `clones/`. checks the layout brief forces:
  - "every actor's, or none": a `creds.yml` in the brain dir is a new file in the layout, so it must exist in every actor dir (or be absent as a defined case), per rule.forbid.brain-dir-layout-divergence.
  - **the brain dir is claude's config dir.** the repo actor's brain dir is git-tracked through an allowlist; only boot doors and four settings names are re-included, all else is ignored — src/domain.operations/init/boots/setRepoActorBrainDir.ts:32-41. a tracked `creds.yml` at the repo actor needs a new `!/creds.yml` line there (and the retired-lines pass at :49-56 stays correct). every other actor dir is ignored whole.
  - the repo actor dir is the only one git sees (setRepoActorBrainDir.ts:111-115). a hash actor dir is derived from `{brain, roles}` and is not a place a repo can hand-author. a per-actor, repo-declared pool therefore needs a declared-by-slug home. the nearest extant shape is `.agent/repo=.this/actors.yml` (`.agent/repo=.this/role=user/briefs/actors/howto.author-actors-yml.md:14-31`) — **but `actors.yml` has zero hits in src** (grepsafe `actors\.ya?ml|actorsYml` over `src` → 0 matches). the brief describes a manifest the code does not read. the `actor://` form exists only as an address parse (src/domain.operations/clone/asActorRef.ts:18,48). treat `actors.yml` as UNVERIFIED / not wired.
- **secrets must not live in the brain dir.** the repo actor's brain dir is tracked. the pool file should name credentials by keyrack key, never hold a token. (design inference, not a code fact.)

## 4. extant BrainAuth* / auth / creds / pool / capacity / usage code

- **`BrainAuth*` names are only the shared-login operations** (all under src/domain.operations/brain/auth/): `asBrainAuthAbsentLine`, `asBrainAuthOauth`, `asBrainAuthState`, `assertBrainAuthNotDead`, `getBrainAuthPath`, `isBrainAuthLive`, `isBrainAuthViaEnv`, `withBrainAuthWriteLock`. plus actor-side `getBrainDirAuthPath`, `isBrainDirAuthAdoptable`, `setBrainDirAuthMigrated`, `asBrainDirAuthMigratedLine` (src/domain.operations/actor/enrolled/).
- **none of #324's artifacts exist:** no `BrainAuthSpec`, `BrainAuthCredential`, `BrainAuthCapacity`, no `rhx brains auth`. grepsafe over `src` for `BrainAuth[A-Z]` returns only the operations above. #324 is **OPEN, never merged** (`gh pr view 324`: title "feat(enroll): add enroll-auth-swap behavior vision and research", state OPEN). its `.behavior/v2026_04_10.enroll-auth-swap-spike/` is on that branch, not on main (`git.repo.get` at origin/main → 0 files). its q1-q10 research files were not read here.
- **no capacity / rate-limit / quota / usage-budget code.** `capacity` hits are unrelated: `BrainSpec` "context window capacity" (src/domain.objects/BrainSpec.ts:10,82) and `BrainEpisode`. `usage` hits are `context.config.usage` (the role-registry config) and `showInitUsageInstructions`. no `rate-limit`, `ratelimit`, `quota` code in non-keyrack src.
- **no `pool` of credentials.** the only `pool` hit is a comment about history-link candidates — src/domain.operations/clone/genCloneHistoryLink.ts:27,32,71.
- **no `rhx brains` cli command.** registered commands: `init, repo, roles, list, readme, run, enroll, actor, clone, choose, ask, act, upgrade, update, keyrack` — src/contract/cli/invoke.ts:33-55. `choose` is unrelated (picks an attempt file) — src/contract/cli/invokeChoose.ts:14-23. `src/domain.operations/brains/` exists but holds claude settings io (`claudeCodeSettings`), not a command — referenced at setRepoActorBrainDir.ts:7, genBrainCliConfigArtifact.ts:6-10.
- **no `setup-token` code.** grepsafe `setup-token|SETUP_TOKEN` over src → none in non-test code.
- **no auth-swap / account compare.** no code reads `email` / `orgId` from claude; `claudeAiOauth` is read only for `refreshToken` emptiness (asBrainAuthOauth.ts:24-26). the "before/after account compare" of #575 has no extant hook. the rest of the login file's shape is UNVERIFIED (a sample fixture at src/.test/assets/genSampleBrainAuth.ts holds `expiresAt`; file not read).
- **what a human does today on a dead login:** the hint names `run /login in any claude on this box (or \`rhx git.grove.auth\` on a grove)` or set `CLAUDE_CODE_OAUTH_TOKEN` / `ANTHROPIC_API_KEY` — assertBrainAuthNotDead.ts:33. `git.grove.auth` is foreign (nheuron), not in this repo.

## 5. keyrack from rhachet code — the call shape

- **sdk export `rhachet/keyrack`:** src/contract/sdk.keyrack.ts (usage comment :7-11). `keyrack.get`:

  ```ts
  import { keyrack } from 'rhachet/keyrack';
  const { attempt } = await keyrack.get({
    for: { key: 'ANTHROPIC_POOL_A_TOKEN' }, // or { repo: true }
    env: 'prep',            // string | undefined
    owner: 'ehmpath',       // string | null | undefined
    org: 'ehmpathy',        // optional, key selector only
    reach: undefined,       // optional plaintext reach label
    with: { unlock: true }, // opt-in auto-unlock of a locked key; default false
  });
  if (attempt.status === 'granted') attempt.grant.key.secret; // the token
  ```

  signature and defaults — sdk.keyrack.ts:74-142 (`with.unlock` defaults false :100; `owner`/`env` default `null` :131-132). the key name above is illustrative.
- **result type:** discriminated union `granted | absent | locked | blocked` — src/domain.objects/keyrack/KeyrackGrantAttempt.ts:10-14, :19-22 (granted holds `grant: KeyrackKeyGrant`), :42-43, :52-53, :62-63. the grant carries `slug`, `key` (secret + grade), `source: { vault, mech }`, `env`, an optional `expiresAt` — src/domain.objects/keyrack/KeyrackKeyGrant.ts:15-50; the optional `expiresAt` is seen in the test fixture src/.test/assets/genMockKeyrackKeyGrant.ts:17,40.
- **the secrets projection** (flat `{ NAME: secret }`, errors on absent/blocked/locked): `getKeyrackKeySecrets({ for: { keys: [...] }, with: { unlock: true }, owner, env })` — src/domain.operations/keyrack/getKeyrackKeySecrets/getKeyrackKeySecrets.ts:28-33; absent/blocked → `ConstraintError`, still-locked after unlock → `MalfunctionError` (:21-24). this is what a brain creds shorthand `{ keyrack: { owner, env } }` calls — getSdkCredsFromBrainSupplies.ts:66-73.
- **cli:** `rhx keyrack unlock --owner ehmpath --env prep`, `rhx keyrack status --owner ehmpath`, `rhx keyrack fill --owner ehmpath` (define.brain-creds-codepath.md:54-58).
- **mechs / vaults relevant to a long-lived token:** `PERMANENT_VIA_REPLICA` (passthrough; validates it is **not** a long-lived token pattern — KeyrackGrantMechanism.ts:10), `PERMANENT_VIA_REFERENCE`, `EPHEMERAL_VIA_SESSION`, `EPHEMERAL_VIA_GITHUB_APP`, `EPHEMERAL_VIA_AWS_SSO`, `EPHEMERAL_VIA_GITHUB_OIDC` — KeyrackGrantMechanism.ts:6-23. **note:** the `PERMANENT_VIA_REPLICA` description says it validates "not a long-lived token pattern". whether that validation rejects a `claude setup-token` one-year oauth token is UNVERIFIED — read the replica mech adapter before the vision assumes `PERMANENT_VIA_REPLICA` fits. there is no claude-token mech.
- **reach axis:** a key can be cut per reach (`reach` field) — sdk.keyrack.ts:81-92, KeyrackGrantAttempt.ts:25-37. a pool of N accounts could be N key names, or one key name at N reaches. the flat secrets map and `sourceAllKeysIntoEnv` leave reach-held keys out (getKeyrackKeySecrets.ts:48-57), so a pool of reaches cannot ride that surface; it needs `keyrack.get({ for: { key }, reach })` per member.
- **key listing for a pool:** `keyrack.get({ for: { repo: true } })` sweeps the repo manifest, one attempt per key (sdk.keyrack.ts:108-125). whether a manifest can express "these N keys are one pool" is not modeled (UNVERIFIED; manifest schema not read).
- **vaults:** `aws.params` vault exists in code (src/domain.operations/keyrack/adapters/vaults/aws.params/). `aws.secrets` (#432) and the unattended headless mech (#522) are cited by the issue; not checked here.

## 6. daemon / scheduler / hourly mechanism

none that could host an hourly re-pick as built. what exists:

- **keyrack daemon (per login session):** a unix-socket server that holds unlocked keys in memory; src/domain.operations/keyrack/daemon/{svc,sdk}/. its only timer is `scheduleAutoTermination`: a `setInterval` (default 15 min check, 15 min idle window; env `KEYRACK_DAEMON_TERMINATION_CHECK_MS`, `KEYRACK_DAEMON_IDLE_TIMEOUT_MS`) that **exits** the daemon when it holds no keys and has served no demand — scheduleAutoTermination.ts:51-93. it schedules shutdown, not work. its command handlers are get/unlock/relock/status (daemon/svc/src/domain.operations/handle*Command.ts). a re-pick would be a new command or a new process, not a reuse.
- **clone host (the detached process that owns a clone's pty + socket):** lives as long as its clone. it has only a diagnostic `setInterval` (event-loop lag watch, `unref`'d) — src/domain.operations/clone/genCloneLoopLagWatch.ts:53 (purpose :1-26). `isDetachedHost` marks the re-entered host path — invokeEnroll.ts:259, :455, :692, :731. a re-pick timer here would be per clone, not per box or per actor; #571 made the login per box, so a per-clone timer would duplicate work.
- `setInterval` appears in exactly three non-test places: `withBrainAuthWriteLock.ts:47` (lock heartbeat), `genCloneLoopLagWatch.ts:53`, `scheduleAutoTermination.ts:71`. no cron, no scheduler, no timer loop for periodic work.
- **a repeat via cron is external.** enroll's json handoff is written for "a supervisor/cron" reader (invokeEnroll.ts:726-730), so an hourly cron around `rhx` is the pattern the code already assumes; rhachet has no cron of its own. a systemd timer / cron that calls a new `rhx brains …` verb (not extant) is the shape that fits today's code. a self-hosted loop would be new infra.
- a live clone's env cannot be re-picked in flight (section 1). an hourly re-pick can affect: (a) clones spawned after the pick (env path), or (b) every live clone at once only via the shared-file write (lock path).

## unverified, to settle before the vision leans on it

- claude-code behaviour: `apiKeyHelper` ttl and 429 behavior; hot-reload of `.credentials.json` after an external write; whether `CLAUDE_CODE_OAUTH_TOKEN` is honored per process while `CLAUDE_SECURESTORAGE_CONFIG_DIR=''` is set (rhachet treats the env credential as winning — isBrainAuthViaEnv.ts:14-17 — but no run was made here).
- whether `PERMANENT_VIA_REPLICA` accepts a setup-token (one-year oauth) value.
- #324's research q1-q10 (not read; the issue says re-verify rather than trust).
- the rest of the login file's shape (email, orgId) for a before/after account compare.
- `actors.yml` is described in a brief but not read by src.
