import { BadRequestError } from 'helpful-errors';

import { daoKeyrackRepoManifest } from '@src/access/daos/daoKeyrackRepoManifest';
import { inferMechFromVault } from '@src/infra/inferMechFromVault';
import { withStdoutPrefix } from '@src/infra/withStdoutPrefix';

import { setOsSecureSessionIdentity } from './adapters/vaults/vaultAdapterOsSecure';
import { asKeyrackKeyName } from './asKeyrackKeyName';
import { genContextKeyrackGrantGet } from './genContextKeyrackGrantGet';
import { genContextKeyrackGrantUnlock } from './genContextKeyrackGrantUnlock';
import { genKeyrackHostContext } from './genKeyrackHostContext';
import { getAllKeyrackSlugsForEnv } from './getAllKeyrackSlugsForEnv';
import { getKeyrackKeyGrant } from './getKeyrackKeyGrant';
import { inferKeyrackVaultFromKey } from './inferKeyrackVaultFromKey';
import { unlockKeyrackKeys } from './session/unlockKeyrackKeys';
import { setKeyrackKey } from './setKeyrackKey';

/**
 * .what = result for a single key × owner fill attempt
 * .why = enables per-key outcome reports
 */
type FillKeyResult = {
  slug: string;
  owner: string;
  status: 'set' | 'skipped' | 'failed';
};

/**
 * .what = fills keyrack keys from repo manifest for specified owners
 * .why = eliminates adhoc fill commands; manifest becomes source of truth
 *
 * .note = for each key × each owner: set → unlock → get (roundtrip verification)
 * .note = skips already-configured keys unless --refresh
 * .note = outputs tree-format progress to console
 */
export const fillKeyrackKeys = async (
  input: {
    env: string;
    owners: string[];
    /**
     * .what = supplemental prikeys to consider for manifest decryption
     * .why = extends default discovery (ssh-agent, ~/.ssh/id_ed25519, etc)
     */
    prikeys: string[];
    key: string | null;
    refresh: boolean;
    repair: boolean;
    allowDangerous: boolean;
  },
  context: {
    gitroot: string;
    /**
     * .what = emit a line to stdout
     * .why = enables tests without emit mocks; separates orchestration from output
     */
    emit?: (line: string) => void;
  },
): Promise<{
  results: FillKeyResult[];
  summary: { set: number; skipped: number; failed: number };
}> => {
  // load repo manifest
  const repoManifest = await daoKeyrackRepoManifest.get({
    gitroot: context.gitroot,
  });
  if (!repoManifest) {
    throw new BadRequestError('no keyrack.yml found in repo', {
      gitroot: context.gitroot,
    });
  }

  // get all keys for env
  const allSlugs = getAllKeyrackSlugsForEnv({
    manifest: repoManifest,
    env: input.env,
  });

  // filter to specific key if requested
  const slugs = input.key
    ? allSlugs.filter((s) => asKeyrackKeyName({ slug: s }) === input.key)
    : allSlugs;

  // handle empty or not found
  if (slugs.length === 0) {
    if (input.key) {
      throw new BadRequestError(
        `key ${input.key} not found in manifest for env=${input.env}`,
      );
    }
    (context.emit ?? console.log)('');
    (context.emit ?? console.log)(`🔐 keyrack fill (env: ${input.env})`);
    (context.emit ?? console.log)('   └─ no keys found');
    (context.emit ?? console.log)('');
    return { results: [], summary: { set: 0, skipped: 0, failed: 0 } };
  }

  // fail-fast: verify all owners have accessible manifests BEFORE user input
  // .note = also eliminates duplicate manifest loads per key × owner
  type OwnerContexts = {
    owner: string | null;
    ownerInput: string;
    ownerLabel: string;
    host: Awaited<ReturnType<typeof genKeyrackHostContext>>;
    unlock: Awaited<ReturnType<typeof genContextKeyrackGrantUnlock>>;
    get: Awaited<ReturnType<typeof genContextKeyrackGrantGet>>;
  };
  const contextsByOwner = new Map<string, OwnerContexts>();
  for (const ownerInput of input.owners) {
    const owner = ownerInput === 'default' ? null : ownerInput;
    const ownerLabel = owner ?? 'default';
    try {
      contextsByOwner.set(ownerInput, {
        owner,
        ownerInput,
        ownerLabel,
        host: await genKeyrackHostContext({ owner, prikeys: input.prikeys }),
        unlock: await genContextKeyrackGrantUnlock({
          owner,
          gitroot: context.gitroot,
          prikeys: input.prikeys,
        }),
        get: await genContextKeyrackGrantGet({
          owner,
          gitroot: context.gitroot,
        }),
      });
    } catch (error) {
      throw new BadRequestError(`no available prikey for owner=${ownerLabel}`, {
        owner: ownerLabel,
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  // emit header
  (context.emit ?? console.log)('');
  (context.emit ?? console.log)(
    `🔐 keyrack fill (env: ${input.env}, keys: ${slugs.length}, owners: ${input.owners.length})`,
  );

  // for each key
  const results: FillKeyResult[] = [];
  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i]!;
    const keyName = asKeyrackKeyName({ slug });
    (context.emit ?? console.log)('');
    (context.emit ?? console.log)(
      `🔑 key ${i + 1}/${slugs.length}, ${keyName}, for ${input.owners.length} owner${input.owners.length > 1 ? 's' : ''}`,
    );

    // for each owner
    for (let ownerIdx = 0; ownerIdx < input.owners.length; ownerIdx++) {
      const ownerInput = input.owners[ownerIdx]!;
      const contexts = contextsByOwner.get(ownerInput)!;
      const {
        owner,
        ownerLabel,
        host: hostContext,
        unlock: unlockContext,
        get: getContext,
      } = contexts;
      const isLastOwner = ownerIdx === input.owners.length - 1;
      const ownerPrefix = isLastOwner ? '└─' : '├─';
      const branchContinue = isLastOwner ? '   ' : '│  ';
      (context.emit ?? console.log)(
        `   ${ownerPrefix} for owner ${ownerLabel}`,
      );

      const ownerFlag = ` --owner ${ownerLabel}`;
      const prikeyFlag =
        input.prikeys.length > 0
          ? input.prikeys.map((p) => ` --prikey ${p}`).join('')
          : '';

      // set the identity for this owner before vault operations
      // .note = sessionIdentity is global; must be set per-owner before each unlock/set
      setOsSecureSessionIdentity(hostContext.identity);

      // try unlock → get to check if key is already configured
      // .note = unlock may fail (vault file absent), but daemon may still have key from prior session
      try {
        await unlockKeyrackKeys(
          { owner, env: input.env, key: keyName },
          unlockContext,
        );
      } catch (error) {
        // allow expected errors: vault file absent, key not configured, decryption failure
        // .note = we check daemon next; if daemon has key, we're good; if not, we set it
        // .note = check message FIRST — raw age errors are plain Errors, not HelpfulErrors
        if (!(error instanceof Error)) throw error;
        const msg = error.message ?? '';
        const isExpectedError =
          msg.includes('vault file absent') ||
          msg.includes('key not found') ||
          msg.includes('no identity matched') ||
          msg.includes('failed to decrypt');
        if (!isExpectedError) throw error;
      }

      // check if daemon has key (even if unlock failed — daemon may have it from prior session)
      const checkGrant = await getKeyrackKeyGrant(
        { for: { key: slug } },
        getContext,
      );

      // handle blocked keys — fail-fast unless user opts in
      if (checkGrant.status === 'blocked') {
        if (input.repair) {
          // --repair: overwrite the blocked key
          (context.emit ?? console.log)(
            `   ${branchContinue}├─ 🟡 blocked (dangerous), will repair`,
          );
          // continue to set below
        } else if (input.allowDangerous) {
          // --allow-dangerous: accept blocked key as-is
          (context.emit ?? console.log)(
            `   ${branchContinue}└─ 🟡 found vaulted under ${checkGrant.slug} dangerously, allowed via --allow-dangerous`,
          );
          results.push({ slug, owner: ownerInput, status: 'skipped' });
          continue;
        } else {
          // fail-fast: user must explicitly choose
          (context.emit ?? console.log)(
            `   ${branchContinue}├─ ✗ blocked (dangerous token detected)`,
          );
          (context.emit ?? console.log)(
            `   ${branchContinue}└─ hint: use --repair to overwrite or --allow-dangerous to accept as-is`,
          );
          throw new BadRequestError(
            `key ${keyName} is blocked (dangerous token detected)`,
            { slug, owner: ownerInput },
          );
        }
      }

      // skip if key is already granted (unless --refresh)
      if (checkGrant.status === 'granted' && !input.refresh) {
        (context.emit ?? console.log)(
          `   ${branchContinue}└─ 🟢 found vaulted under ${checkGrant.grant.slug}`,
        );
        results.push({ slug, owner: ownerInput, status: 'skipped' });
        continue;
      }

      // infer vault if not prescribed
      const keySpec = repoManifest.keys[slug];
      const vaultInferred = inferKeyrackVaultFromKey({ keyName });
      const vault = vaultInferred ?? 'os.secure';
      const mechInferred = inferMechFromVault({ vault });
      const mech = keySpec?.mech ?? mechInferred ?? 'PERMANENT_VIA_REPLICA';

      // emit "set the key" section with treebucket open
      (context.emit ?? console.log)(`   ${branchContinue}├─ set the key`);
      (context.emit ?? console.log)(`   ${branchContinue}│  ├─`);
      (context.emit ?? console.log)(`   ${branchContinue}│  │`);

      // set key (stdout prefixed for tree-format output)
      const bucketIndent = `   ${branchContinue}│  │  `;
      await withStdoutPrefix(bucketIndent, async () => {
        await setKeyrackKey(
          {
            key: keyName,
            env: input.env,
            org: repoManifest.org,
            vault,
            mech,
            repoManifest,
          },
          hostContext,
        );
      });

      // close treebucket
      (context.emit ?? console.log)(`   ${branchContinue}│  │`);
      (context.emit ?? console.log)(`   ${branchContinue}│  └─`);

      // emit "get after set, to verify" section
      (context.emit ?? console.log)(
        `   ${branchContinue}└─ get after set, to verify`,
      );

      // regenerate unlock context after set
      // .note = setKeyrackKey updated the host manifest on disk
      // .note = the cached unlockContext has the OLD manifest (before set)
      // .note = we must reload to see the newly set key
      const unlockContextAfterSet = await genContextKeyrackGrantUnlock({
        owner,
        gitroot: context.gitroot,
        prikeys: input.prikeys,
      });

      // unlock key
      await unlockKeyrackKeys(
        { owner, env: input.env, key: keyName },
        unlockContextAfterSet,
      );
      (context.emit ?? console.log)(
        `   ${branchContinue}   ├─ ✓ rhx keyrack unlock --key ${keyName} --env ${input.env}${ownerFlag}${prikeyFlag}`,
      );

      // verify roundtrip via get
      const attempt = await getKeyrackKeyGrant(
        { for: { key: slug } },
        getContext,
      );

      // fail-fast if roundtrip verification fails — this is a defect, not recoverable
      if (attempt.status !== 'granted') {
        (context.emit ?? console.log)(
          `   ${branchContinue}   └─ ✗ rhx keyrack get --key ${keyName} --env ${input.env}${ownerFlag}`,
        );
        throw new BadRequestError(
          `roundtrip verification failed: key ${keyName} was set and unlocked but get returned status=${attempt.status}`,
          { slug, owner: ownerInput, status: attempt.status },
        );
      }

      (context.emit ?? console.log)(
        `   ${branchContinue}   └─ ✓ rhx keyrack get --key ${keyName} --env ${input.env}${ownerFlag}`,
      );
      results.push({ slug, owner: ownerInput, status: 'set' });
    }
  }

  // summary
  const summary = {
    set: results.filter((r) => r.status === 'set').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    failed: results.filter((r) => r.status === 'failed').length,
  };

  const verified = summary.set + summary.skipped;
  const total = slugs.length * input.owners.length;
  (context.emit ?? console.log)('');
  (context.emit ?? console.log)(
    `🔐 keyrack fill complete (${verified}/${total} keys verified)`,
  );
  (context.emit ?? console.log)('');

  return { results, summary };
};
