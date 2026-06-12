import { BadRequestError } from 'helpful-errors';

import { keyrack } from '@src/contract/sdk.keyrack';
import type { BrainSuppliesCreds } from '@src/domain.objects/BrainSuppliesCreds';

/**
 * .what = lookup credentials from brain supplier creds config
 * .why = shared helper for all brain suppliers to get creds from keyrack or getter
 *
 * .example
 *   const creds = await getSdkCredsFromBrainSupplies({
 *     creds: supplies.creds,
 *     keys: ['FIREWORKS_API_KEY'],
 *   });
 *   // creds = { FIREWORKS_API_KEY: '...' }
 *
 * .note
 *   - no env fallback — creds must be explicit via keyrack or getter
 *   - throws if keyrack key not found
 */
export const getSdkCredsFromBrainSupplies = async <
  TKeys extends Record<string, string>,
>(input: {
  creds: BrainSuppliesCreds<TKeys>;
  keys: (keyof TKeys)[];
}): Promise<TKeys> => {
  // guard: validate creds shape
  if (typeof input.creds !== 'function' && !input.creds?.keyrack)
    throw new BadRequestError(
      'invalid creds shape: expected function or { keyrack: { owner, env } }. pass creds as async getter function or keyrack config object',
      {
        received: typeof input.creds,
      },
    );

  // handle getter mode
  if (typeof input.creds === 'function') {
    try {
      return await input.creds();
    } catch (error) {
      throw new BadRequestError(
        `brain supplier credential getter failed: ${error instanceof Error ? error.message : String(error)}. check your credential source (vault, kms, db) and ensure it is accessible`,
        {
          cause: error instanceof Error ? error : undefined,
          fix: 'verify your credential getter function has access to the credential source and that the source is available',
        },
      );
    }
  }

  // guard: validate keyrack config has required fields
  const { owner, env } = input.creds.keyrack;
  if (!owner || !env)
    throw new BadRequestError(
      `invalid keyrack config: ${!owner ? 'owner' : 'env'} absent. pass { keyrack: { owner, env } }`,
      {
        received: input.creds.keyrack,
      },
    );
  const results = await Promise.all(
    input.keys.map(async (key) => {
      const { attempt, emit } = await keyrack.get({
        for: { key: String(key) },
        env,
        owner,
      });
      if (attempt.status !== 'granted')
        throw new BadRequestError(emit.stdout, {
          status: attempt.status,
          key: String(key),
        });
      return [key, attempt.grant.key.secret] as const;
    }),
  );
  return Object.fromEntries(results) as TKeys;
};
