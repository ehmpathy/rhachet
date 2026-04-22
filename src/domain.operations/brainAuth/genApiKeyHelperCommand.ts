import type { BrainAuthSpecShape } from '@src/domain.objects/BrainAuthSpec';

/**
 * .what = generate shell command for claude code api_key_helper config
 * .why = claude code calls this command to fetch auth credentials dynamically
 *
 * @example
 * spec: { strategy: 'default', source: null }
 * returns: null (use default env var)
 *
 * @example
 * spec: { strategy: 'solo', source: 'keyrack://ehmpathy/prod/ANTHROPIC_API_KEY_1' }
 * returns: 'rhx keyrack get --key ANTHROPIC_API_KEY_1 --env prod --owner ehmpath --output token'
 *
 * @example
 * spec: { strategy: 'pool', source: 'keyrack://ehmpathy/prod/ANTHROPIC_API_KEY_*' }
 * returns: 'rhx brains auth supply --spec "pool(keyrack://ehmpathy/prod/ANTHROPIC_API_KEY_*)"'
 */
export const genApiKeyHelperCommand = (input: {
  spec: BrainAuthSpecShape;
  owner?: string;
}): string | null => {
  const owner = input.owner ?? 'ehmpath';

  // default strategy with no source = use env var directly
  if (input.spec.strategy === 'default' && !input.spec.source) {
    return null;
  }

  // solo or default with source = direct keyrack get
  if (
    input.spec.strategy === 'solo' ||
    (input.spec.strategy === 'default' && input.spec.source)
  ) {
    // parse keyrack URI to extract key and env
    const match = input.spec.source!.match(
      /^keyrack:\/\/([^/]+)\/([^/]+)\/(.+)$/,
    );

    if (!match) {
      // fallback to pool command if URI parse fails
      return `rhx brains auth supply --spec "${input.spec.source}" --owner ${owner}`;
    }

    const [, , env, keyName] = match;

    return `rhx keyrack get --key ${keyName} --env ${env} --owner ${owner} --output token`;
  }

  // pool strategy = use brains auth supply command with rotation
  if (input.spec.strategy === 'pool') {
    const specWords = `pool(${input.spec.source})`;
    return `rhx brains auth supply --spec "${specWords}" --owner ${owner}`;
  }

  // fallback
  return null;
};
