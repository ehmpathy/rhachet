import { ConstraintError } from 'helpful-errors';

import type { KeyrackGrantAttempt } from '@src/domain.objects/keyrack/KeyrackGrantAttempt';

import { asKeyrackKeySlug } from './asKeyrackKeySlug';
import { isValidKeyrackEnv } from './constants';
import type { ContextKeyrackGrantGet } from './genContextKeyrackGrantGet';
import { getKeyrackKeyGrant } from './getKeyrackKeyGrant';

/**
 * .what = grant a single key from keyrack
 * .why = reusable operation for CLI and SDK single-key grant flow
 *
 * .note = handles both raw key names and full slugs
 * .note = uses manifest for slug construction when available
 * .note = falls back to org param when no manifest
 */
export const getOneKeyrackGrantByKey = async (
  input: {
    key: string;
    env: string | null;
    org?: string;
    allow?: { dangerous?: boolean };
  },
  context: ContextKeyrackGrantGet,
): Promise<KeyrackGrantAttempt> => {
  // construct slug from key input
  const { slug } = (() => {
    // @all bypasses manifest validation (access keys across orgs)
    if (input.org === '@all') {
      const parts = input.key.split('.');
      const isFullSlug = parts.length >= 3 && isValidKeyrackEnv(parts[1] ?? '');
      if (isFullSlug) {
        return { slug: input.key };
      }
      const envFallback = input.env ?? 'all';
      return { slug: `@all.${envFallback}.${input.key}` };
    }

    // if manifest exists, use asKeyrackKeySlug for full validation
    if (context.repoManifest) {
      // fail fast if org param doesn't match manifest org
      if (input.org && input.org !== context.repoManifest.org) {
        throw new ConstraintError(
          `org '${input.org}' does not match manifest org '${context.repoManifest.org}'`,
        );
      }
      return asKeyrackKeySlug({
        key: input.key,
        env: input.env,
        manifest: context.repoManifest,
      });
    }

    // no manifest - check if full slug format
    const parts = input.key.split('.');
    const isFullSlug = parts.length >= 3 && isValidKeyrackEnv(parts[1] ?? '');
    if (isFullSlug) {
      return { slug: input.key };
    }

    // no manifest but org provided - construct slug
    if (input.org) {
      const envFallback = input.env ?? 'all';
      return { slug: `${input.org}.${envFallback}.${input.key}` };
    }

    // no manifest, no full slug, no org - cannot construct
    // provide sudo-specific hint when env is sudo
    if (input.env === 'sudo') {
      throw new ConstraintError(
        'no keyrack.yml found in repo. for sudo credentials without keyrack.yml, use --org @all',
      );
    }
    throw new ConstraintError(
      `cannot construct slug for key '${input.key}' without keyrack.yml. use full slug format (org.env.KEY) or add keyrack.yml to repo.`,
    );
  })();

  return getKeyrackKeyGrant(
    { for: { key: slug }, allow: input.allow },
    context,
  );
};
