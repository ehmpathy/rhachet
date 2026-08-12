import { fromSSO } from '@aws-sdk/credential-provider-sso';
import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { genLogMethods } from 'sdk-logs';

import type {
  KeyrackGrantMechanism,
  KeyrackGrantMechanismAdapter,
  KeyrackHostVaultAdapter,
  KeyrackKeyHostMetaAwsConfig,
} from '@src/domain.objects/keyrack';
import { KeyrackKeyGrant } from '@src/domain.objects/keyrack';
import { mechAdapterAwsSso } from '@src/domain.operations/keyrack/adapters/mechanisms/aws.sso/mechAdapterAwsSso';
import {
  getAwsSsoProfileConfig,
  logoutAwsSsoSession,
} from '@src/domain.operations/keyrack/adapters/mechanisms/aws.sso/setupAwsSsoProfile';
import {
  createSsoTimeoutError,
  isSsoTimeout,
} from '@src/domain.operations/keyrack/adapters/mechanisms/aws.sso/withSsoTimeout';
import { asKeyrackSlugParts } from '@src/domain.operations/keyrack/asKeyrackSlugParts';
import { inferKeyGrade } from '@src/domain.operations/keyrack/grades/inferKeyGrade';
import { inferKeyrackMechForSet } from '@src/domain.operations/keyrack/inferKeyrackMechForSet';
import { assertKeyrackReachAbsent } from '@src/domain.operations/keyrack/reach/assertKeyrackReachAbsent';

import { exec, spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, unlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

/**
 * .what = lookup mech adapter by mechanism name
 * .why = vault needs to call mech.deliverForGet for secret transformation
 */
const getMechAdapter = (
  mech: KeyrackGrantMechanism,
): KeyrackGrantMechanismAdapter => {
  const adapters: Partial<
    Record<KeyrackGrantMechanism, KeyrackGrantMechanismAdapter>
  > = {
    EPHEMERAL_VIA_AWS_SSO: mechAdapterAwsSso,
  };

  const adapter = adapters[mech];
  if (!adapter) {
    throw new MalfunctionError(`no adapter for mech: ${mech}`, { mech });
  }
  return adapter;
};

const execAsync = promisify(exec);

/**
 * .what = check if a profile exists in ~/.aws/config
 * .why = fail-fast on typos for --exid case (no active session required)
 *
 * .returns = true if profile section exists in config file
 */
const checkProfileExists = (profileName: string): boolean => {
  const configPath = join(homedir(), '.aws', 'config');
  if (!existsSync(configPath)) return false;
  const content = readFileSync(configPath, 'utf-8');
  // match either [profile name] or [name] (default profile)
  const profilePattern = new RegExp(
    `^\\[profile\\s+${profileName}\\]|^\\[${profileName}\\]`,
    'm',
  );
  return profilePattern.test(content);
};

/**
 * .what = validate SSO token with AWS SSO servers via SDK
 * .why = fromSSO is opaque — wrapper clarifies its purpose:
 *        - creates credential provider that contacts AWS SSO
 *        - validates token is still valid on AWS servers
 *        - throws CredentialsProviderError if expired or revoked
 *
 * .note = this makes a network call to AWS SSO (not local cache)
 * .note = fromSSO validates per-profile credentials, not domain session
 * .note = call `aws sso login --profile X` BEFORE this function:
 *         - domain session may be valid even if profile credentials are not
 *         - sso login reuses domain session to generate profile credentials
 *         - only then can fromSSO find the cached profile credentials
 */
const validateSsoTokenWithAwsSdk = async (
  profileName: string,
): Promise<void> => {
  // .note = ignoreCache forces a fresh read of ~/.aws/config
  //         the @smithy/core config loader caches file contents in a
  //         process-lifetime module-level map (filePromises), keyed by path.
  //         a profile written earlier this same run would otherwise be served
  //         from the stale cache → CredentialsProviderError "Profile X not found",
  //         even though the cli (a fresh subprocess) sees it fine.
  await fromSSO({ profile: profileName, ignoreCache: true })();
};

/**
 * .what = extract the sso username from an aws caller-identity arn
 * .why = the username is the last segment of an assumed-role arn
 *        e.g. arn:aws:sts::123456789012:assumed-role/RoleName/username@domain
 */
const extractUsernameFromArn = (input: { arn: string }): string => {
  const segments = input.arn.split('/');
  return segments[segments.length - 1] ?? 'unknown';
};

/**
 * .what = validate SSO session via AWS SDK
 * .why = cache cannot be trusted:
 *        - export-credentials returns cached STS creds even when SSO expired
 *        - local cache misses remote revocation (admin disables session)
 *        - local cache misses format drift (AWS changes cache format)
 *        - SDK validates against AWS SSO servers = source of truth
 *        - see: https://github.com/aws/aws-cli/issues/9845
 *
 * .note = this is required because cache can lie (original defect)
 *
 * .returns = { valid: true, username } if session valid, { valid: false } if expired or invalid
 */
/**
 * .what = list the filenames cached in ~/.aws/sso/cache (not contents)
 * .why = sso token files are named sha1(session_name).json; the set of
 *        filenames reveals whether a token landed under the real profile's
 *        session vs the temp guided-setup session — key to diagnose the
 *        cli-vs-sdk divergence
 *
 * .note = filenames only; never logs token contents (secrets)
 */
const getAwsSsoCacheFileNames = (): string[] => {
  const cacheDir = join(homedir(), '.aws', 'sso', 'cache');
  if (!existsSync(cacheDir)) return [];
  return readdirSync(cacheDir);
};

const log = genLogMethods();

/**
 * .what = emit which validateSsoSession gate returned invalid
 * .why = pinpoints which of the three validation gates returns invalid,
 *        so cli-vs-sdk divergence can be diagnosed without guesswork
 *
 * .note = level depends on caller context:
 *         - info on the error path (set), where invalid → ConstraintError,
 *           so the failure surfaces by default
 *         - debug on the normal path (unlock/isUnlocked), where an expired
 *           session is expected and triggers a re-login, not a failure
 */
const emitSsoGateInvalid = (input: {
  gate: 'fromSSO' | 'export-credentials' | 'sts';
  profileName: string;
  error: unknown;
  level: 'info' | 'debug';
}): void => {
  log[input.level](
    '🐈 keyrack.vaultAdapterAwsConfig.validateSsoSession: gate invalid',
    {
      gate: input.gate,
      valid: false,
      profileName: input.profileName,
      ssoCacheFiles: getAwsSsoCacheFileNames(),
      error:
        input.error instanceof Error
          ? { name: input.error.name, message: input.error.message }
          : input.error,
    },
  );
};

const validateSsoSession = async (
  profileName: string,
  options?: { onInvalidLevel?: 'info' | 'debug' },
): Promise<{ valid: true; username: string } | { valid: false }> => {
  // level for the gate-invalid log: debug by default (expired session is a
  // normal re-login trigger), info when the caller treats invalid as a failure
  const level = options?.onInvalidLevel ?? 'debug';

  // validate SSO via AWS SDK — cache cannot be trusted
  // .note = skip SDK validation in mock mode (AWS_SDK_MOCK=1)
  //         SDK reads cache files directly and makes network calls to AWS
  //         mock CLI cannot intercept SDK behavior, only CLI commands
  if (!process.env.AWS_SDK_MOCK) {
    try {
      await validateSsoTokenWithAwsSdk(profileName);
      // SDK validated token with AWS SSO servers — session is valid
    } catch (error) {
      // CredentialsProviderError = SSO expired or revoked remotely
      if (
        error instanceof Error &&
        (error.name === 'CredentialsProviderError' ||
          error.message.includes('expired') ||
          error.message.includes('invalid'))
      ) {
        emitSsoGateInvalid({ gate: 'fromSSO', profileName, error, level });
        return { valid: false };
      }
      // unknown error - fail fast
      throw new MalfunctionError(
        'validateSsoTokenWithAwsSdk failed with unexpected error',
        { profileName, error },
      );
    }
  }

  // refresh STS cache — ensures CLI has fresh credentials for subsequent commands
  // .note = fromSSO validated SSO token, but STS cache may still be stale
  // .note = this pre-warms the credential cache for CLI use
  try {
    await execAsync(
      `aws configure export-credentials --profile "${profileName}" --format env-no-export`,
    );
  } catch (error) {
    // export-credentials failed after SSO validated — STS refresh issue
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    const isExpiredError =
      message.includes('expired') ||
      message.includes('invalid') ||
      message.includes('unauthorized') ||
      message.includes('does not exist') ||
      message.includes('refreshed credentials are still expired');

    if (isExpiredError) {
      emitSsoGateInvalid({
        gate: 'export-credentials',
        profileName,
        error,
        level,
      });
      return { valid: false };
    }

    // unknown error - fail fast
    throw new MalfunctionError(
      'aws configure export-credentials failed with unexpected error',
      { profileName, error },
    );
  }

  // sts call — only needed for username extraction, not validation
  // .note = fromSSO + export-credentials already validated, this extracts username from ARN
  try {
    const { stdout } = await execAsync(
      `aws sts get-caller-identity --profile "${profileName}"`,
    );
    // .cast = aws sts json shape at external boundary; only Arn is consumed
    // .removal = drop the cast once an aws sdk typed client replaces the cli call
    const identity = JSON.parse(stdout) as { Arn: string };
    const username = extractUsernameFromArn({ arn: identity.Arn });
    return { valid: true, username };
  } catch (error) {
    // rethrow our own error types (code defects, invalid requests)
    if (error instanceof MalfunctionError) throw error;
    if (error instanceof ConstraintError) throw error;

    // allow expected errors: command failed = session expired or profile invalid
    // .note = aws cli exits non-zero for expired sessions and invalid profiles
    if (error instanceof Error && 'code' in error) {
      emitSsoGateInvalid({ gate: 'sts', profileName, error, level });
      return { valid: false };
    }
    throw error;
  }
};

/**
 * .what = trigger sso login for a profile via portal flow
 * .why = refreshes the sso session via browser auth
 *
 * .note = uses --profile flag for portal flow (standard "Sign in" / "Allow")
 * .note = portal flow is the same experience as direct visit to aws sso portal
 * .note = captures output to detect timeout vs other failures
 */
const triggerSsoLogin = async (profileName: string): Promise<void> => {
  return new Promise((accept, reject) => {
    const child = spawn('aws', ['sso', 'login', '--profile', profileName], {
      stdio: 'pipe',
    });

    // .note = deliberate mutation: these accumulate across async child events
    //         (stdout/stderr chunks + timeout fire), which const cannot express
    let outputBuffer = '';
    let timedOut = false;

    // kill process after 3 minutes if no response
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, 180_000); // 3 minutes

    child.stdout?.on('data', (data: Buffer) => {
      outputBuffer += data.toString();
    });
    child.stderr?.on('data', (data: Buffer) => {
      outputBuffer += data.toString();
    });

    child.on('close', (code) => {
      clearTimeout(timeout);

      if (code === 0) {
        accept();
      } else if (timedOut || isSsoTimeout(outputBuffer)) {
        reject(
          createSsoTimeoutError({
            profileName,
            exitCode: code,
            output: outputBuffer,
          }),
        );
      } else {
        reject(
          new MalfunctionError('aws sso login failed', {
            profileName,
            exitCode: code,
            output: outputBuffer,
            hint: 'check network connectivity or aws cli configuration',
          }),
        );
      }
    });

    child.on('error', (error) => {
      reject(
        new ConstraintError('aws sso login failed', {
          profileName,
          error,
          hint: 'ensure aws cli is installed',
        }),
      );
    });
  });
};

/**
 * .what = validate the post-login session and recover from cross-username once
 * .why = the browser may auto-sign-in as a cached/wrong user; one logout+retry
 *        loop handles the common case
 *
 * .note = mode 1 = session invalid (wrong user authed, lacks profile access)
 * .note = mode 2 = session valid but username mismatch
 * .note = the wrong-user auth created a fresh token, so logout now succeeds
 * .note = recovery needs ssoStartUrl for the domain-scoped logout
 */
const confirmSsoSessionForUser = async (input: {
  profileName: string;
  expectedUsername: string;
  ssoStartUrl: string | null;
}): Promise<{ valid: true; username: string } | { valid: false }> => {
  const { profileName, expectedUsername, ssoStartUrl } = input;

  // accept immediately when the correct user already holds a valid session
  const firstResult = await validateSsoSession(profileName);
  if (firstResult.valid && firstResult.username === expectedUsername)
    return firstResult;

  // cannot recover without the domain url for a scoped logout
  if (!ssoStartUrl) return firstResult;

  // announce the wrong-user case (mode 2) before recovery
  if (firstResult.valid) {
    console.log('   ├─ ⚠ wrong user, logout browser session...');
    console.log(`   │  ├─ expected: ${expectedUsername}`);
    console.log(`   │  └─ observed: ${firstResult.username}`);
  }

  // announce the invalid-session case (mode 1) before recovery
  if (!firstResult.valid)
    console.log('   ├─ ⚠ session invalid, logout browser session...');

  // logout server-side session, then retry login and validate once more
  await logoutAwsSsoSession({ ssoStartUrl });
  console.log('   ├─ ✓ logged out, retry login...');
  await triggerSsoLogin(profileName);
  return validateSsoSession(profileName);
};

/**
 * .what = vault adapter for aws sso profile references
 * .why = handles sso unlock/relock flow; profile names stored as exid in host manifest
 *
 * .note = no separate storage file — exid from the encrypted host manifest is the source of truth
 * .note = unlock validates sso sessions, triggers login for expired
 * .note = profile names are 'reference' protection (no secrets touch keyrack)
 */
export const vaultAdapterAwsConfig: KeyrackHostVaultAdapter<
  'readwrite',
  'aws.config'
> = {
  mechs: {
    supported: ['EPHEMERAL_VIA_AWS_SSO'],
  },

  /**
   * .what = check if sso session is valid for the given profile and user
   * .why = validates via aws sts get-caller-identity
   *
   * .note = uses exid (profile name) from the host manifest
   * .note = uses meta.awsSsoUsername to verify same user
   * .note = returns true if no exid provided (no profile = unlocked)
   * .note = returns false if meta.awsSsoUsername absent (needs re-set)
   */
  isUnlocked: async (input) => {
    const profileName = input?.exid;
    if (!profileName) return true;

    // extract expected username from meta
    const expectedUsername = input?.meta?.awsSsoUsername ?? null;

    // if meta.awsSsoUsername is absent, key needs re-set
    if (!expectedUsername) return false;

    const result = await validateSsoSession(profileName);
    if (!result.valid) return false;

    // session valid but wrong user = not unlocked for this key
    return result.username === expectedUsername;
  },

  /**
   * .what = validate sso session and trigger login if needed
   * .why = ensures the profile has a valid session for the expected user
   *
   * .flow:
   *   1. try sso login first (may reuse domain session without browser)
   *   2. validate session and check username
   *   3. if username mismatch → clear domain cache and retry
   *   4. if username matches → done
   *
   * .note = passphrase is ignored (sso uses browser auth)
   * .note = uses exid (profile name) from the host manifest
   */
  unlock: async (input: {
    identity: string | null;
    silent?: boolean;
    exid?: string | null;
    meta?: KeyrackKeyHostMetaAwsConfig | null;
    slug?: string | null;
    owner?: string | null;
  }) => {
    const profileName = input.exid;
    if (!profileName) return;

    // extract expected username from meta
    const expectedUsername = input.meta?.awsSsoUsername ?? null;

    // failfast if meta.awsSsoUsername is absent — key needs re-set
    if (!expectedUsername) {
      if (!input.silent) {
        console.log('   ├─ with sso prior?');
        console.log('   │  └─ ✗ key lacks awsSsoUsername; re-set required');
      }

      // parse slug for actionable hint
      const parts = input.slug
        ? asKeyrackSlugParts({ slug: input.slug })
        : null;
      const owner = input.owner ?? '<owner>';
      const hint = parts
        ? `run: rhx keyrack set --owner ${owner} --env ${parts.env} --key ${parts.keyName} --vault aws.config`
        : `run: rhx keyrack set --owner ${owner} --env <env> --key <key> --vault aws.config`;

      throw new ConstraintError(
        'key lacks awsSsoUsername metadata; re-set the key',
        {
          profileName,
          hint,
        },
      );
    }

    const profileConfig = await getAwsSsoProfileConfig({ profileName });

    // step 1: check if session already valid and username matches
    const initialResult = await validateSsoSession(profileName);

    if (initialResult.valid && initialResult.username === expectedUsername) {
      // session valid + correct user → reuse without login
      // .note = the CLI unlocks silent (it prints its own results summary after),
      //         so this reuse tree only surfaces when a caller asks for verbose.
      if (!input.silent) {
        console.log(`🔓 keyrack unlock ${input.slug ?? profileName}`);
        console.log('   ├─ with sso prior?');
        console.log(`   │  ├─ ✓ ${initialResult.username}, access confirmed`);
        console.log('   │  └─ ✓ will reuse');
        // consistent terminal confirmation across all success paths
        console.log(`   └─ ✓ authenticated as ${initialResult.username}`);
      }
      return;
    }

    // step 2: session invalid or username mismatch → need to login
    // .note = recovery is a live interactive event (the user must re-auth in the
    //         browser), so it renders regardless of silent. otherwise the CLI —
    //         which unlocks with silent:true and prints its own summary after —
    //         would show orphaned recovery fragments with no header or closer.
    // .note = a per-key progress header owns these "logs taken to get there" and
    //         attributes them to a key — distinct from the final "🔓 keyrack unlock"
    //         results summary the CLI prints after. mirrors guided `set` output,
    //         where the mechanism prints its own header before the wizard logs.
    console.log(`🔓 keyrack unlock ${input.slug ?? profileName}`);
    console.log('   ├─ with sso prior?');
    if (!initialResult.valid) {
      console.log('   │  └─ ✗ clear, no prior session');
    } else {
      console.log(`   │  ├─ ✗ session user mismatch`);
      console.log(`   │  │  ├─ expected: ${expectedUsername}`);
      console.log(`   │  │  └─ observed: ${initialResult.username}`);
      console.log('   │  └─ ✓ cleared, re-auth triggered');
    }

    // step 3: clear domain cache if username mismatch
    if (initialResult.valid && profileConfig?.ssoStartUrl) {
      // logout to force fresh auth with correct user (may fail if token expired)
      await logoutAwsSsoSession({
        ssoStartUrl: profileConfig.ssoStartUrl,
      });
    }

    // step 4: trigger login
    await triggerSsoLogin(profileName);

    // step 5: validate after login, with one cross-username recovery retry
    // .note = covers mode 1 (session invalid after wrong-user auth) and
    //         mode 2 (session valid but username mismatch)
    const sessionResult = await confirmSsoSessionForUser({
      profileName,
      expectedUsername,
      ssoStartUrl: profileConfig?.ssoStartUrl ?? null,
    });

    if (!sessionResult.valid) {
      throw new ConstraintError('sso login failed; session still invalid', {
        profileName,
        hint: 'complete browser auth',
      });
    }

    if (sessionResult.username !== expectedUsername) {
      throw new ConstraintError(
        'sso login completed but username mismatch persists',
        {
          profileName,
          expected: expectedUsername,
          observed: sessionResult.username,
          hint: 're-authenticate with the correct user',
        },
      );
    }

    // confirm the authenticated identity for the user
    // .note = the "aha" payload: makes the correct user explicit after login/recovery
    // .note = always render to close the recovery tree coherently (see step 2 note)
    console.log(`   └─ ✓ authenticated as ${sessionResult.username}`);
    // blank line separates the recovery progress block from the results summary
    console.log('');

    // force STS credential refresh after SSO login
    // .note = aws sso login refreshes SSO token but not STS cache
    // .note = export-credentials forces botocore to fetch fresh STS creds
    try {
      await execAsync(
        `aws configure export-credentials --profile "${profileName}" --format env-no-export`,
      );
    } catch (error) {
      // if export-credentials still fails after fresh SSO login, clear the CLI cache and retry
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      const isStillExpired = message.includes('expired');

      if (isStillExpired) {
        // clear stale STS cache for this profile
        const cliCacheDir = join(homedir(), '.aws', 'cli', 'cache');
        if (existsSync(cliCacheDir)) {
          const cacheFiles = readdirSync(cliCacheDir);
          for (const file of cacheFiles) {
            // cache files are named with profile hash, remove all to be safe
            unlinkSync(join(cliCacheDir, file));
          }
        }

        // retry export-credentials after cache clear
        await execAsync(
          `aws configure export-credentials --profile "${profileName}" --format env-no-export`,
        );
      } else {
        throw error;
      }
    }
  },

  /**
   * .what = retrieve credential from aws.config vault
   * .why = profile name stored as exid; AWS SDK resolves credentials at usage time
   *
   * .note = returns profile name as secret, not credentials
   * .note = validates sso session is active (triggers browser login if expired)
   * .note = AWS SDK resolves actual credentials from profile when used
   */
  get: async (input) => {
    const source = input.exid ?? null;
    if (!source) return null;

    const mech = input.mech ?? 'EPHEMERAL_VIA_AWS_SSO';

    // .why a reach is refused on READ too, not only on `set` = the refusal in `set` is what
    //      makes a reach-held aws.config entry unreachable through the CLI TODAY. that is a
    //      property of one write path, not of this vault — a hand-edited manifest, or any
    //      future write that does not route through `vault.set`, would produce an entry this
    //      read would answer. and it would answer it with the REACHLESS sso profile, which is
    //      a live credential for a reach the caller never asked for (e18's class)
    // .note = every other vault already holds this line structurally: `os.envvar` and
    //         `github.secrets` assert on read, and `os.direct` / `os.secure` bake the reach
    //         into the storage ADDRESS, so a mismatched reach cannot retrieve the wrong entry.
    //         this vault trusted "no caller will ever do that" instead, which is the one form
    //         of the guarantee the design does not accept anywhere else
    // .note = `Absent` rather than `Addressable`, and the axis matters. a vault-address refusal
    //         would say "aws.config's address carries no reach" — which is FALSE here, since
    //         its host entry is addressed by composite address like any other. the true reason
    //         is the MECH: `EPHEMERAL_VIA_AWS_SSO` mints against an sso profile, its own
    //         reach concept, so a reach would move where the value is filed yet leave what
    //         it opens untouched (e13). this is the same refusal `set` makes, on the same axis
    assertKeyrackReachAbsent({ reach: input.reach, mech });

    // get expiration time from mech adapter
    // .note = sso session validation happens in unlock, not here
    const mechAdapter = getMechAdapter(mech);
    const { expiresAt } = await mechAdapter.deliverForGet({ source });

    // compute grade from vault + mech
    const grade = inferKeyGrade({ vault: 'aws.config', mech });

    // extract env/org from slug
    const { env, org } = asKeyrackSlugParts({ slug: input.slug });

    // return profile name as secret — AWS SDK resolves credentials from profile
    return new KeyrackKeyGrant({
      slug: input.slug,
      key: { secret: source, grade },
      source: { vault: 'aws.config', mech },
      env,
      org,
      expiresAt,
    });
  },

  /**
   * .what = derive profile name for storage in host manifest
   * .why = derives profile name from exid or guided setup
   *
   * .note = the caller (setKeyrackKeyHost) persists the exid to the encrypted host manifest
   * .note = vault handles its own input: uses exid if present, else runs guided setup
   * .note = expiresAt is ignored (sso tokens self-expire)
   */
  set: async (input, context) => {
    // get identity from context for roundtrip verification
    const identity =
      (await context?.identity?.getOne({ for: 'manifest' })) ?? null;

    // infer mech if not supplied
    const mech =
      input.mech ??
      (await inferKeyrackMechForSet({ vault: vaultAdapterAwsConfig }));

    // check mech compat (aws.config only supports aws sso mech)
    if (!vaultAdapterAwsConfig.mechs.supported.includes(mech)) {
      throw new ConstraintError(`aws.config does not support mech: ${mech}`, {
        mech,
        supported: vaultAdapterAwsConfig.mechs.supported,
        hint: 'aws.config is for aws sso only; try --vault os.secure for other mechs',
      });
    }

    // refuse a reach up front, not merely on the guided-setup branch below — that branch
    // is skipped whenever --exid is supplied, which would drop the reach in silence
    assertKeyrackReachAbsent({ reach: input.reach, mech });

    // derive profile name from exid, else from guided setup on a tty
    const profileName =
      input.exid ??
      (process.stdin.isTTY
        ? (
            await getMechAdapter(mech).acquireForSet({
              keySlug: input.slug,
              reach: input.reach,
              mech,
            })
          ).source
        : null);
    if (!profileName) {
      throw new ConstraintError(
        'aws.config set requires a profile name (--exid or guided setup)',
        {
          slug: input.slug,
          hint: 'provide --exid or run in tty for guided setup',
        },
      );
    }

    // validate the profile exists in aws config (fail-fast on typos for --exid case)
    // .note = --exid case checks profile exists in config file
    // .note = guided setup skips validation here — roundtrip verification below proves it works
    if (input.exid) {
      const profileExists = checkProfileExists(profileName);
      if (!profileExists) {
        throw new ConstraintError(
          `aws profile '${profileName}' not found in ~/.aws/config`,
          { slug: input.slug, profileName, hint: 'check the profile name' },
        );
      }
    }

    // capture awsSsoUsername from ARN BEFORE roundtrip verification
    // .why = unlock requires meta.awsSsoUsername; we pass it immediately
    // .note = info level: here invalid → ConstraintError, a real failure
    const stsResult = await validateSsoSession(profileName, {
      onInvalidLevel: 'info',
    });
    if (!stsResult.valid) {
      throw new ConstraintError('sso session not valid; run aws sso login', {
        profileName,
        hint: `run: aws sso login --profile ${profileName}`,
      });
    }
    const meta = { awsSsoUsername: stsResult.username };

    // roundtrip verification
    // .note = proves unlock + get + relock work
    const isGuidedSetup = !input.exid;
    if (isGuidedSetup) {
      console.log('   │');
      console.log("   └─ perfect, now let's verify...");
    }

    // 1. unlock — prove sso session is valid
    await vaultAdapterAwsConfig.unlock({
      identity,
      exid: profileName,
      silent: true,
      meta,
    });
    if (isGuidedSetup) console.log('      ├─ ✓ unlock');

    // 2. get — prove stored profile name matches
    const grantRead = await vaultAdapterAwsConfig.get({
      slug: input.slug,
      exid: profileName,
    });
    if (!grantRead || grantRead.key.secret !== profileName) {
      throw new MalfunctionError(
        'roundtrip failed: get returned different profile',
        {
          slug: input.slug,
          expected: profileName,
          actual: grantRead?.key.secret ?? null,
        },
      );
    }
    if (isGuidedSetup) console.log('      ├─ ✓ get');

    // 3. relock — clear session, leave vault locked after setup
    await vaultAdapterAwsConfig.relock?.({
      slug: input.slug,
      exid: profileName,
    });
    if (isGuidedSetup) console.log('      └─ ✓ relock');

    // return mech, derived exid, and meta so caller can persist to the host manifest
    return {
      mech,
      exid: profileName,
      meta: { awsSsoUsername: stsResult.username },
    };
  },

  /**
   * .what = no-op for aws.config
   * .why = profile names live in the encrypted host manifest, not a separate store
   */
  del: async () => {
    // no-op — host manifest handles deletion
  },

  /**
   * .what = clear aws sso cached credentials for a profile
   * .why = enables true relock; clears sso token and cli credential caches
   *
   * .note = uses exid (profile name) from the host manifest
   * .note = uses targeted cache deletion to preserve other domains
   */
  relock: async (input) => {
    const profileName = input.exid;
    if (!profileName) return;

    // get the sso start url for this profile
    const profileConfig = await getAwsSsoProfileConfig({ profileName });
    if (!profileConfig?.ssoStartUrl) return;

    // logout server-side session + clear disk cache for this domain only
    await logoutAwsSsoSession({ ssoStartUrl: profileConfig.ssoStartUrl });
  },
};
