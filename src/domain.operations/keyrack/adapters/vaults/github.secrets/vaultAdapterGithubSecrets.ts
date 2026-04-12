import { UnexpectedCodePathError } from 'helpful-errors';

import type {
  KeyrackGrantMechanism,
  KeyrackGrantMechanismAdapter,
  KeyrackHostVaultAdapter,
} from '@src/domain.objects/keyrack';
import { mechAdapterGithubApp } from '@src/domain.operations/keyrack/adapters/mechanisms/mechAdapterGithubApp';
import { mechAdapterReplica } from '@src/domain.operations/keyrack/adapters/mechanisms/mechAdapterReplica';
import type { ContextKeyrack } from '@src/domain.operations/keyrack/genContextKeyrack';
import { inferKeyrackMechForSet } from '@src/domain.operations/keyrack/inferKeyrackMechForSet';

import { getGithubRepoFromContext } from './getGithubRepoFromContext';
import { ghSecretDelete } from './ghSecretDelete';
import { ghSecretSet } from './ghSecretSet';

/**
 * .what = lookup mech adapter by mechanism name
 * .why = vault needs to call mech.acquireForSet for guided setup
 */
const getMechAdapter = (
  mech: KeyrackGrantMechanism,
): KeyrackGrantMechanismAdapter => {
  const adapters: Partial<
    Record<KeyrackGrantMechanism, KeyrackGrantMechanismAdapter>
  > = {
    PERMANENT_VIA_REPLICA: mechAdapterReplica,
    EPHEMERAL_VIA_GITHUB_APP: mechAdapterGithubApp,
  };

  const adapter = adapters[mech];
  if (!adapter) {
    throw new UnexpectedCodePathError(`no adapter for mech: ${mech}`, { mech });
  }
  return adapter;
};

/**
 * .what = vault adapter for github actions secrets
 * .why = enables set of secrets into github via gh secret set
 *
 * .note = write-only vault: github secrets api does not support retrieval
 * .note = get is null to signal write-only behavior
 * .note = supports EPHEMERAL_VIA_GITHUB_APP and PERMANENT_VIA_REPLICA mechs
 */
export const vaultAdapterGithubSecrets: KeyrackHostVaultAdapter<'onlywrite'> = {
  mechs: {
    supported: ['EPHEMERAL_VIA_GITHUB_APP', 'PERMANENT_VIA_REPLICA'],
  },

  /**
   * .what = check if github cli is authenticated
   * .why = gh secret set requires authenticated session
   *
   * .note = returns true if gh auth status succeeds
   */
  isUnlocked: async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { execSync } = require('node:child_process');
      execSync('gh auth status', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * .what = noop for github secrets
   * .why = gh cli handles auth via gh auth login
   */
  unlock: async () => {
    // noop — gh cli handles auth separately
  },

  /**
   * .what = null — github secrets cannot be retrieved
   * .why = github secrets api does not support secret retrieval
   *
   * .note = null signals write-only vault to callers
   * .note = unlockKeyrackKeys handles null get by skip with 'remote' reason
   */
  get: null,

  /**
   * .what = set secret into github actions secrets
   * .why = enables keyrack to push secrets to github
   *
   * .note = uses gh secret set under the hood
   * .note = mech.acquireForSet gets the secret value
   * .note = no roundtrip verification — github secrets are write-only
   */
  set: async (
    input: {
      slug: string;
      mech?: KeyrackGrantMechanism | null;
      exid?: string | null;
      expiresAt?: string | null;
    },
    context?: ContextKeyrack,
  ) => {
    // infer mech if not supplied
    const mech =
      input.mech ??
      (await inferKeyrackMechForSet({ vault: vaultAdapterGithubSecrets }));

    // check mech compat
    if (!vaultAdapterGithubSecrets.mechs.supported.includes(mech)) {
      throw new UnexpectedCodePathError(
        `github.secrets does not support mech: ${mech}`,
        {
          mech,
          supported: vaultAdapterGithubSecrets.mechs.supported,
          hint: 'github.secrets supports EPHEMERAL_VIA_GITHUB_APP and PERMANENT_VIA_REPLICA',
        },
      );
    }

    // get github repo from context
    const repo = getGithubRepoFromContext({ gitroot: context?.gitroot });

    // acquire source credential via mech guided setup
    const mechAdapter = getMechAdapter(mech);

    // emit vault header for ephemeral mechs (they have guided setup)
    if (mech === 'EPHEMERAL_VIA_GITHUB_APP') {
      console.log(`🔐 keyrack set ${input.slug} via ${mech}`);
    }

    // mech guided setup to get the source credential
    const { source: secret } = await mechAdapter.acquireForSet({
      keySlug: input.slug,
    });

    // extract secret name from slug (format: $org.$env.$key)
    const secretName = input.slug.split('.').slice(2).join('.');

    // push to github secrets
    ghSecretSet({
      name: secretName,
      repo,
      secret,
    });

    // emit write-only notice (no roundtrip — github secrets cannot be read back)
    if (mech === 'EPHEMERAL_VIA_GITHUB_APP') {
      console.log('   │');
      console.log(
        '   └─ ✓ pushed to github.secrets (no roundtrip — write-only vault)',
      );
      console.log('\u2800'); // braille blank for visual space (survives PTY)
    }

    // return mech + exid (repo stored in exid for del operation)
    return { mech, exid: repo };
  },

  /**
   * .what = delete secret from github actions secrets
   * .why = enables keyrack to remove secrets from github
   *
   * .note = uses gh secret delete under the hood
   * .note = requires exid (repo) to be set during set operation
   */
  del: async (input: {
    slug: string;
    exid?: string | null;
    owner?: string | null;
  }) => {
    // guard: exid (repo) required
    if (!input.exid) {
      throw new UnexpectedCodePathError(
        'exid (repo) required for github.secrets del',
        {
          slug: input.slug,
          hint: 'exid should be set during vault.set operation',
        },
      );
    }

    // extract secret name from slug (format: $org.$env.$key)
    const secretName = input.slug.split('.').slice(2).join('.');

    // delete from github secrets
    ghSecretDelete({
      name: secretName,
      repo: input.exid,
    });
  },
};
