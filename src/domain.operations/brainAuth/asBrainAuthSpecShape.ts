import { BadRequestError } from 'helpful-errors';

import type {
  BrainAuthSpecShape,
  BrainAuthSpecWords,
} from '@src/domain.objects/BrainAuthSpec';

/**
 * .what = parse BrainAuthSpecWords string into BrainAuthSpecShape
 * .why = CLI input is a string; orchestrators need typed shape
 *
 * formats:
 * - 'pool(keyrack://org/env/KEY_*)' → { strategy: 'pool', source: 'keyrack://org/env/KEY_*' }
 * - 'solo(keyrack://org/env/KEY)' → { strategy: 'solo', source: 'keyrack://org/env/KEY' }
 * - 'keyrack://org/env/KEY' → { strategy: 'default', source: 'keyrack://org/env/KEY' }
 * - '' or null → { strategy: 'default', source: null }
 */
export const asBrainAuthSpecShape = (input: {
  spec: BrainAuthSpecWords | null;
}): BrainAuthSpecShape => {
  // empty or null = default strategy with no source
  if (!input.spec || input.spec.trim() === '') {
    return { strategy: 'default', source: null };
  }

  const spec = input.spec.trim();

  // check for strategy(source) format
  const strategyMatch = spec.match(/^(pool|solo)\((.+)\)$/);

  if (strategyMatch) {
    const strategy = strategyMatch[1] as 'pool' | 'solo';
    const source = strategyMatch[2]!;

    // validate source is a keyrack URI
    if (!source.startsWith('keyrack://')) {
      throw new BadRequestError(
        `invalid auth spec source: expected keyrack:// URI, got '${source}'`,
        { code: 'INVALID_SOURCE', spec, source },
      );
    }

    return { strategy, source };
  }

  // check for raw keyrack:// URI (default strategy)
  if (spec.startsWith('keyrack://')) {
    return { strategy: 'default', source: spec };
  }

  // invalid format
  throw new BadRequestError(
    `invalid auth spec format: expected 'pool(keyrack://...)' or 'keyrack://...', got '${spec}'`,
    { code: 'INVALID_FORMAT', spec },
  );
};
