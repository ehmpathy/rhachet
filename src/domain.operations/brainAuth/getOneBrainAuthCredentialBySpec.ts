import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';

import type { BrainAuthAdapter } from '@src/domain.objects/BrainAuthAdapter';
import type { BrainAuthCredential } from '@src/domain.objects/BrainAuthCredential';
import type {
  BrainAuthSpecShape,
  BrainAuthSpecWords,
} from '@src/domain.objects/BrainAuthSpec';
import type { BrainAuthSupplied } from '@src/domain.objects/BrainAuthSupplied';

import { asBrainAuthSpecShape } from './asBrainAuthSpecShape';
import { asBrainAuthTokenSlugs } from './asBrainAuthTokenSlugs';

/**
 * .what = context required for brain auth operations
 * .why = enables keyrack lookup and credential supply
 */
export interface ContextBrainAuth {
  /**
   * brain auth adapter for the target brain
   */
  adapter: BrainAuthAdapter;

  /**
   * keyrack dao for credential lookup
   */
  keyrack: {
    /**
     * list available key names for pattern match
     */
    listKeys(input: { org: string; env: string }): Promise<string[]>;

    /**
     * get credential by slug
     */
    getCredential(input: { slug: string }): Promise<BrainAuthCredential | null>;
  };

  /**
   * optional state for round-robin rotation
   */
  rotationState?: {
    /**
     * get last used credential index for a pool
     */
    getLastIndex(input: { poolKey: string }): Promise<number>;

    /**
     * set last used credential index for a pool
     */
    setLastIndex(input: { poolKey: string; index: number }): Promise<void>;
  };
}

/**
 * .what = select best credential from pool via round-robin
 * .why = simple rotation strategy for spike; capacity-based can be added later
 */
const selectCredentialRoundRobin = async (input: {
  credentials: BrainAuthCredential[];
  poolKey: string;
  context: ContextBrainAuth;
}): Promise<BrainAuthCredential> => {
  const { credentials, poolKey, context } = input;

  if (credentials.length === 0) {
    throw new UnexpectedCodePathError('no credentials in pool', { poolKey });
  }

  if (credentials.length === 1) {
    return credentials[0]!;
  }

  // get last used index (default to -1 so first selection is index 0)
  const lastIndex = context.rotationState
    ? await context.rotationState.getLastIndex({ poolKey })
    : -1;

  // round-robin to next index
  const nextIndex = (lastIndex + 1) % credentials.length;

  // persist index for next rotation
  if (context.rotationState) {
    await context.rotationState.setLastIndex({ poolKey, index: nextIndex });
  }

  return credentials[nextIndex]!;
};

/**
 * .what = get one brain auth credential by spec
 * .why = orchestrates spec parse, keyrack lookup, and credential selection
 *
 * @example
 * // solo: exact key
 * spec: 'keyrack://ehmpathy/prod/ANTHROPIC_API_KEY_1'
 * returns: { credential, formatted: 'sk-ant-...' }
 *
 * @example
 * // pool: wildcard pattern with rotation
 * spec: 'pool(keyrack://ehmpathy/prod/ANTHROPIC_API_KEY_*)'
 * returns: { credential, formatted: 'sk-ant-...' } (rotates each call)
 */
export const getOneBrainAuthCredentialBySpec = async (
  input: {
    spec: BrainAuthSpecWords;
  },
  context: ContextBrainAuth,
): Promise<BrainAuthSupplied> => {
  // parse spec string to shape
  const specShape: BrainAuthSpecShape = asBrainAuthSpecShape({
    spec: input.spec,
  });

  // default strategy with no source = error (should use env var instead)
  if (specShape.strategy === 'default' && !specShape.source) {
    throw new BadRequestError(
      'auth spec has no source; use ANTHROPIC_API_KEY env var directly',
      { code: 'NO_SOURCE', spec: input.spec },
    );
  }

  // expand source pattern to key slugs
  const { slugs, org, env } = asBrainAuthTokenSlugs({
    source: specShape.source!,
    availableKeys: await context.keyrack.listKeys({ org: '', env: '' }), // TODO: proper org/env extraction
  });

  // solo strategy: must have exactly one slug
  if (specShape.strategy === 'solo' && slugs.length !== 1) {
    throw new BadRequestError(
      `solo strategy requires exactly one key, but pattern matched ${slugs.length}`,
      { code: 'SOLO_MULTIPLE', slugs },
    );
  }

  // load credentials from keyrack
  const credentials: BrainAuthCredential[] = [];
  for (const slug of slugs) {
    const credential = await context.keyrack.getCredential({ slug });
    if (!credential) {
      throw new BadRequestError(`credential not found in keyrack: ${slug}`, {
        code: 'CREDENTIAL_NOT_FOUND',
        slug,
      });
    }
    credentials.push(credential);
  }

  // select credential based on strategy
  let selectedCredential: BrainAuthCredential;

  if (specShape.strategy === 'pool') {
    // pool: round-robin rotation
    const poolKey = specShape.source!;
    selectedCredential = await selectCredentialRoundRobin({
      credentials,
      poolKey,
      context,
    });
  } else {
    // solo or default: use first (only) credential
    selectedCredential = credentials[0]!;
  }

  // supply formatted credential via adapter
  const supplied = await context.adapter.auth.supply({
    credential: selectedCredential,
  });

  return supplied;
};
