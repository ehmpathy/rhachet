# research.internal.keyrack-for-pool-tokens

> scope: which keyrack vault + key shape hold a long-lived claude oauth token (`claude setup-token`, ~1yr), and how a headless grove unlocks it with no human. read 2026-11-07 at worktree HEAD 6e3b6771 (v1.51.0). paths are repo-relative. issues are ehmpathy/rhachet.

## 1. vaults and mechs

keyrack is a firewall + dispatcher + broker, not a vault (`.agent/repo=.this/role=keyrack/briefs/define.keyrack-identity.md.min`).

vault union = 8: `os.envvar | os.direct | os.secure | os.daemon | 1password | aws.config | aws.params | github.secrets` (`src/domain.objects/keyrack/KeyrackHostVault.ts:22-30`).

| vault | what it holds | unlock | mechs | reach |
|---|---|---|---|---|
| os.secure | age-encrypted `.age` file per key at `~/.rhachet/keyrack/vault/os.secure/owner=$owner/$hash.age` (`vaultAdapterOsSecure.ts:43-67`) | needs an age identity (ssh prikey) in context (`:107-115`, `:145-151`) | REPLICA, GITHUB_APP (`:97-99`) | ADDRESSED |
| os.direct | plaintext json `~/.rhachet/keyrack/vault/os.direct/owner=$owner/keyrack.direct.json` (`vaultAdapterOsDirect.ts:41-57`) | none | REPLICA only (per `define.vault-mech-adapters.md:166-171`) | ADDRESSED |
| os.daemon | in-memory session cache; `set` stores with `EPHEMERAL_VIA_SESSION`, 9h default (`vaultAdapterOsDaemon.ts:119-137`) | n/a | SESSION | ADDRESSED |
| 1password | pointer (exid) to an `op://` item (`define.vault-types-owned-vs-refed.md`) | op signin (human) | REPLICA, GITHUB_APP | ADDRESSED |
| aws.config | sso profile name only | browser sso (human) | AWS_SSO | via mech |
| aws.params | ssm SecureString; keyrack writes AND reads it (`vaultAdapterAwsParams.ts:196-222`) | ambient IAM, no human (`:57-62`) | REPLICA, GITHUB_APP (`isKeyrackAwsParamMech.ts:10-13`) | UNADDRESSABLE |
| os.envvar | process env, read-only, always checked first (`spec.key-get-behavior.md:9-20`) | none | n/a | UNADDRESSABLE |
| github.secrets | write-only gh actions secret | n/a | n/a | UNADDRESSABLE |

- owned = keyrack holds the secret (os.secure, os.direct, os.daemon); refed = keyrack holds a pointer (1password, aws.config) (`define.vault-types-owned-vs-refed.md`). aws.params is a hybrid: keyrack writes the SSM param itself (`setKeyrackAwsParamReplica`, `vaultAdapterAwsParams.ts:196-209`) and reads it with the ambient identity.
- mech = credential transformation, vault = storage. `acquireForSet` (prompt -> source) and `deliverForGet` (source -> secret) (`define.vault-mech-adapters.md:116-131`).
- the mech a long-lived claude token wants is `PERMANENT_VIA_REPLICA`: `deliverForGet` is identity, never sets `expiresAt` (`mechAdapterReplica.ts:109-117`). its firewall rejects only `ghp_ gho_ ghu_ ghr_ AKIA` prefixes (`:11-26`); an `sk-ant-oat…` token matches none, so it passes. (the token prefix itself is UNVERIFIED here: it comes from outside this repo.)
- the claude cli already reads `CLAUDE_CODE_OAUTH_TOKEN` as a brain-auth env credential (`src/domain.operations/brain/auth/isBrainAuthViaEnv.ts:9`, `assertBrainAuthNotDead.ts:13`).
- `claude setup-token` mints a one-year token: stated in #575's body as a prior to RE-VERIFY (q4/q5 of #324). UNVERIFIED in this pass.

### the reach axis already exists and was built for this

- `KeyrackKeyReach { exid }` = "the external reach a credential opens ... a key is cut per reach" with `.example = { exid: 'beav@ehmpathy.com' } // a claude account juggle` (`src/domain.objects/keyrack/KeyrackKeyReach.ts:3-24`). shipped in PR #462 (merged 2026-08-12) "--reach, cut a key per territory".
- a replica honors a reach: "it is what lets one key name hold N copies, one per account (the claude-account juggle)" (`mechAdapterReplica.ts:89-93`).
- address = `$slug@$exid`; `@` in an email is allowed, whitespace is not (`asKeyrackKeyReach.ts:16-50`, `asKeyrackKeySlugAtReach.ts:18-24`). a reach exid is opaque plaintext (`asKeyrackKeyReachFromFlag.ts:28-29`).
- per-vault verdict is a typed table, `KEYRACK_VAULT_REACH_POLICY` (`src/domain.objects/keyrack/KeyrackVaultReachPolicy.ts:54-92`): os.secure, os.direct, os.daemon, 1password = ADDRESSED; os.envvar, github.secrets, **aws.params = UNADDRESSABLE**.
- aws.params refuses a reach on read and write: `--reach does not apply to aws.params: its storage address carries no reach` with hint "cut this key under its own key name (or an explicit --exid), then ask for it without --reach" (`assertKeyrackReachAddressable.ts:51-93`, `vaultAdapterAwsParams.ts:73-77,141-145`). the table's own note: "a `/v2/` template with a reach segment would make this `ADDRESSED`, and v1 params stay readable meanwhile" (`KeyrackVaultReachPolicy.ts:77-80`); `asKeyrackAwsParamName.ts:10-12` keeps the `/v1/` marker for exactly this.

## 2. key slug shape and manifest

- slug = `$org.$env.$KEY`; env in `sudo|prod|prep|test|all`; key name may hold dots (`rule.require.full-slug-key-input.md:39-44`). `--key` takes a raw name or a full slug (`:5-9`).
- grain: `--org @all` = machine-wide, no repo manifest, slug `@all.$env.$KEY`; a named org = tree-wide from `.agent/keyrack.yml` (`define.keyrack-org-scope.grove-vs-tree.md:5-17`; `getAllKeyrackSlugsForUnlock.ts:104-152`).
- address with reach = `@all.prep.BRAINS_AUTH@casey@ahbode.com` (`getAllMachineWideSlugsForEnv.test.ts:120-127`). one key name, N copies, one per account.
- a per-account key NAME also works but only where the charset allows: ssm names are `[a-zA-Z0-9_.-/]` (`isKeyrackAwsParamName.ts:5-21`). an email has `@`, so `alice@x.com` would need legalizing (e.g. `alice_at_x_com`). a reach exid skips this problem (os.* vaults take any non-whitespace exid).
- aws.params path = `/keyrack/infra/vault/aws.params/v1/$owner/$orgSegment/$env/$key`; `@all` is legalized to `_all_` (`asKeyrackAwsParamName.ts:13-41`, `rule.require.aws-params-sentinel-legalization.md:11-26`). owner is mandatory (`vaultAdapterAwsParams.ts:148-153`).
- `keyrack.yml` declares key NAMES per env (`.agent/keyrack.yml` in this repo: `org: ehmpathy`, `extends:`, `env.prep: [EHMPATHY_SEATURTLE_GITHUB_TOKEN, ...]`). `org:` may be a list = allowlist, first = default (`define.keyrack-org-allowlist.md:5-27`).
- a manifest may declare reaches per key, hand-authored: `KeyrackKeySpec.reaches: KeyrackKeyReach[]`, "a MINIMUM", all unconditional for `fill` (`KeyrackKeySpec.ts:46-59`; the on-disk yaml form is a flat `reaches:` list under a key, see `fillKeyrackKeys.integration.test.ts:870-877`; exact yaml shape UNVERIFIED, not read from the parser). `keyrack set --reach` never writes the repo manifest (`setKeyrackKeyHost.ts:32`, `:231`).
- a machine-wide `@all` key is NOT declared in any repo manifest; it lives in the host manifest only (`asResolvedAttempt.ts:29-32`). so a pool in `creds.yml` can name `@all` keys without a keyrack.yml line.

### gap for the pool: the brain-creds read path is reachless

- `getSdkCredsFromBrainSupplies` -> `getKeyrackKeySecrets({ for: { keys }, with: { unlock: true }, owner, env })` (`getSdkCredsFromBrainSupplies.ts:66-73`). get-or-unlock: a locked key is auto-unlocked (`:19`).
- `getKeyrackKeySecrets` returns a flat `{ KEY: secret }` map and "cannot carry a reach"; reach-held keys are filtered out and not even announced (`getKeyrackKeySecrets.ts:36-57`, `:155-162`).
- the layer below does take one reach for one key: `getKeyrackKeyGrants({ for: { keys: [k] }, reach, ... })`, and it refuses a reach on a multi-key or repo ask (`getKeyrackKeyGrants.ts:76`, `:110-116`). so a pool read needs a new reach-aware, one-key-per-call surface; it cannot reuse `getKeyrackKeySecrets` unchanged.

## 3. unattended unlock

what `unlock` needs, by vault:

- os.secure: the host manifest AND each `.age` blob open with an age identity. prikey discovery = ssh-agent keys first, then `~/.ssh/id_ed25519|id_rsa|id_ecdsa`, then `--prikey` supplements; all tried until one decrypts (`spec.prikey-discovery-behavior.md:18-51`). no identity -> fail (`:92-107`).
- a passphrase-LESS ssh key (`-N ""`) is the headless case: `initKeyrack` stores a native age recipient and needs no `age` cli (`initKeyrack.ts:150-163`, `:178`). a passphrase-protected key shells out to `age` + ssh-agent (`ageRecipientCrypto.ts:82-83,167-169`; `initKeyrack.ts:165-180`).
- PR #562 (OPEN, not merged) reworks passphrased keys to ssh-agent sign-as-KDF with an attributed askpass dialog: a human prompt (https://github.com/ehmpathy/rhachet/pull/562). it does not touch the passphrase-less path.
- aws.params: no secret, no prikey. `--org @all` -> IMDS instance role ONLY; a named org -> that org's `AWS_PROFILE` from the manifest; never ambient sso (`define.keyrack-org-scope.grove-vs-tree.md:44-60`, `define.aws-params-account-selection.md:34-57`). `isUnlocked` is always false so every unlock re-fetches from SSM (`vaultAdapterAwsParams.ts:62`). "the identity IS the unlock" (#432 body).
- 1password: needs `op` signin. aws.config: browser sso (human); headless device-code is #499/#716, both open (see 4).
- the ssm read needs `ssm:GetParameter` on the param + `kms:Decrypt` on the key behind `alias/aws/ssm`; a distinct failfast names each grant (`define.aws-params-account-selection.md:152-153`, b6/b7). region is not ambient: from `AWS_REGION`, else the profile, captured in `meta.region` at set (`vaultAdapterAwsParams.ts:161-167`).

robot owner and ttl:

- owner = per-owner isolation of host manifest, vault dir (`owner=$owner`), and daemon socket (`asKeyrackOwnerDir.ts`; `spec.daemon-prune-behavior.md:37-50`; `vaultAdapterOsDaemon.ts:114-117`). the booted mechanic rule: always `--owner ehmpath` (a robot rack) or you hit the human's yubikey-protected rack (`.agent/repo=ehmpathy/role=mechanic/briefs/practices/work.flow/tools/howto.keyrack.[lesson].md.min`). example: `rhx keyrack unlock --owner ehmpath --env prep`.
- ttl: `unlock` default `9h` (`30m` for env=sudo), `--duration` overrides (`unlockKeyrackKeys.ts:112-116`; `invokeKeyrack.ts:1955`). a grant expires at `min(requested, host maxDuration, mech expiry)` (`unlockKeyrackKeys.ts:429-445`, `computeExpiresAt.ts`). replica sets no expiry, so it lives the full 9h.
- the daemon holds unlocked keys in memory; it idle-exits when it holds no keys AND no demand for the window (default 15 min; `KEYRACK_DAEMON_IDLE_TIMEOUT_MS`) (`scheduleAutoTermination.ts:46-87`).
- a pool consumer therefore re-unlocks at most every 9h. that is cheap and unattended for aws.params (an SSM read). for os.secure it is cheap only if the prikey is passphrase-less.
- is there a headless path TODAY? yes, two:
  1. os.secure/os.direct + a passphrase-less prikey on the grove (`get-or-unlock` auto-unlocks, `getSdkCredsFromBrainSupplies.ts:66-72`). the VALUE must be placed on the box once: a `set` reads the secret from stdin and accepts a pipe when stdin is not a tty (`promptHiddenInput`, per #522 body citing `promptHiddenInput.js:61`; `mechAdapterReplica.ts:100-104`). an `.age` copy is not portable: it is sealed to the recipient set at write time (#522 body).
  2. aws.params with `--org @all` on an EC2 grove (IMDS). no secret is placed on the box. the value is written once from a human/laptop session (`set` runs as the org identity, `define.keyrack-org-scope.grove-vs-tree.md:81-112`).
- what is NOT headless: an ephemeral mech source. `EPHEMERAL_VIA_GITHUB_APP` set throws on a non-tty because the pem prompt cannot answer (#522; `mechAdapterGithubApp.ts:162-171`). irrelevant to a REPLICA token.

## 4. keyrack tasks

| # | title | state | what it proposes | merged work |
|---|---|---|---|---|
| 432 | add an aws.secrets vault so a cloud box bootstraps from its IAM role | OPEN (https://github.com/ehmpathy/rhachet/issues/432) | a vault read by proof of IMDS, no manifest, no recipient key. a 2026-07-27 amendment: (a) the ask cannot protect the github app private key (a vault read means the box holds the master); right for credentials with NO derived form, "anthropic (api key, or a 1yr `claude setup-token`) ... vault read — `aws.params` is exactly right"; (b) make `aws.params` co-equal and default to it: free for standard tier, hierarchical, one grant on `/ehmpathy/grove/*` | `aws.params` shipped: PR #453 (MERGED 2026-08-04) "add aws.params vault backed by AWS SSM Parameter Store", hardened by #459 (MERGED 2026-08-07). no `aws.secrets` vault exists (not in `KeyrackHostVault`). the issue stayed OPEN. `aws.secrets` is unbuilt |
| 522 | place an ephemeral mech source unattended, so a headless box can converge | OPEN (https://github.com/ehmpathy/rhachet/issues/522) | `keyrack set --source @stdin` / `get --output source` / a first-class entry transfer, for `EPHEMERAL_VIA_GITHUB_APP` (the app pem has no read or write path). usecase: `uladkasach/dev-env-setup` places keys box-to-box over ssh; every `PERMANENT_VIA_REPLICA` row converges unattended TODAY, only the ephemeral github rows cannot | none found (`gh pr list --search`: no linked pr) |
| 499 | device-code sso login, for headless boxes | OPEN (https://github.com/ehmpathy/rhachet/issues/499) | `aws.config` unlock/set: pass `--use-device-code`, stream the verification url + code to stderr on the success path, default to device-code where no browser can open | none found |
| 716 | keyrack unlock: device-code sso so the human can approve from any device | OPEN (https://github.com/ehmpathy/rhachet/issues/716) | same need, a field report (2026-11-05: six seat prompts timed out, a grove stayed dark all day): a `--device-code` flag that prints url + code before the wait | none found |

- #499/#716 concern `aws.config` (sso). a long-lived claude token in aws.params or os.secure never touches sso, so neither blocks the pool. they matter only if the grove's AWS identity for a NAMED org is an sso profile.
- #575 itself is OPEN; its 2026-10-04 amendment says every pool credential comes from keyrack and a pool that names an absent key fails loud with the `keyrack set` that fills it. its body names #432 and #522 as the keyrack tasks that bear on this.

## 5. the absent-key hint today

three renders, all `ConstraintError` (exit 2) or a status tree; each already prints a runnable `keyrack set`:

1. reach-ask, no key cut at that reach (the closest to the pool case). thrown from bulk `unlockKeyrackKeys` when `--reach` is given (`src/domain.operations/keyrack/session/unlockKeyrackKeys.ts:219-245`):
   - message: `credential at reach '<exid>' does not exist — each reach needs its own key`
   - metadata `hint`: `cut the key — rhx keyrack set[ --owner <owner>] --key <KEY> --env <env>[ --org @all] --reach <exid>`
   - the `--org @all` is appended for a machine-wide slug on purpose (`:232-243`). no `--vault` in this hint.
2. keyed ask, key not declared (`getAllKeyrackSlugsForUnlock.ts`):
   - `key not found in manifest: <K>`, fix `rhx keyrack set --key <K> --env <env>` (`:212-217`)
   - `machine-wide key not found: <K>`, fix `rhx keyrack set --key <K> --env <env> --org @all --vault ...` (`:143-149`)
   - `sudo key not found: <K>`, fix `... --env sudo --vault <vault>` (`:95-99`)
3. status tree, absent: `status: absent 🫧` + `hint: rhx keyrack set --key API_KEY --env test` (`spec.key-unlock-behavior.md:130-141`, `spec.key-get-behavior.md:99-119`). for omissions in a bulk unlock the tip comes from `asKeyrackOmittedKeyTip` and is `rhx keyrack set[ --owner o] --key K --env E[ --org @all][ --reach R] --vault V[  # also cut at: ...]` (`asKeyrackOmittedKeyTip.ts:159-175`). `asResolvedAttempt` adds `--vault <inferred or <vault>>` (`:56-61`).

hazard for the pool: `asKeyrackOmittedKeyTip` has an inversion. if the rack already holds the slug at ANOTHER reach and the omission reason is `absent`, it tips `rhx keyrack unlock ... --reach <the OTHER held reach>` instead of `set` (`asKeyrackOmittedKeyTip.ts:137-138`). a pool that names account B while the rack holds only account A would be pointed at A. the pool's own failure must therefore name `set ... --reach <pool exid>` itself (render 1 already does, but only on the `--key --reach` unlock path).

## summary of the open design facts (for the vision)

- today a reach per claude account works on os.secure / os.direct / 1password / os.daemon; it is refused on aws.params.
- the only vault with a human-free unlock AND no secret at rest is aws.params (@all + IMDS), and it has no reach segment (v1 path).
- no code path serves the pool: the brain-creds read is reachless and flat.
- #432 (`aws.secrets`) was not built; #453 (`aws.params`) is its shipped, preferred form. #522/#499/#716 are all open and none block a REPLICA token.
