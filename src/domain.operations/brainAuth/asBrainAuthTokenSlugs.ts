import { BadRequestError } from 'helpful-errors';

/**
 * .what = parse keyrack URI into components
 * .why = need to extract org/env/pattern from keyrack://org/env/PATTERN
 */
const parseKeyrackUri = (input: {
  source: string;
}): { org: string; env: string; pattern: string } => {
  // keyrack://org/env/KEY_PATTERN
  const match = input.source.match(/^keyrack:\/\/([^/]+)\/([^/]+)\/(.+)$/);

  if (!match) {
    throw new BadRequestError(
      `invalid keyrack URI format: expected keyrack://org/env/KEY, got '${input.source}'`,
      { code: 'INVALID_URI', source: input.source },
    );
  }

  return {
    org: match[1]!,
    env: match[2]!,
    pattern: match[3]!,
  };
};

/**
 * .what = convert glob pattern to regex
 * .why = keyrack patterns use * for wildcards, need regex for match
 */
const patternToRegex = (input: { pattern: string }): RegExp => {
  // escape regex special chars except * which becomes .*
  const escaped = input.pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  const regexStr = escaped.replace(/\*/g, '.*');
  return new RegExp(`^${regexStr}$`);
};

/**
 * .what = expand keyrack URI source into list of key slugs
 * .why = pool strategy needs all slugs that match pattern; solo needs exact one
 *
 * @example
 * source: 'keyrack://ehmpathy/prod/ANTHROPIC_API_KEY_*'
 * availableKeys: ['ANTHROPIC_API_KEY_1', 'ANTHROPIC_API_KEY_2', 'OTHER_KEY']
 * returns: ['ehmpathy.prod.ANTHROPIC_API_KEY_1', 'ehmpathy.prod.ANTHROPIC_API_KEY_2']
 */
export const asBrainAuthTokenSlugs = (input: {
  source: string;
  availableKeys: string[];
}): { slugs: string[]; org: string; env: string } => {
  const { org, env, pattern } = parseKeyrackUri({ source: input.source });

  // if pattern has no wildcard, return exact slug
  if (!pattern.includes('*')) {
    return {
      slugs: [`${org}.${env}.${pattern}`],
      org,
      env,
    };
  }

  // match pattern against available keys
  const regex = patternToRegex({ pattern });
  const matched = input.availableKeys.filter((key) => regex.test(key));

  if (matched.length === 0) {
    throw new BadRequestError(
      `no keys match pattern '${pattern}' in available keys`,
      { code: 'NO_MATCH', pattern, availableKeys: input.availableKeys },
    );
  }

  // convert matched keys to full slugs
  const slugs = matched.map((key) => `${org}.${env}.${key}`);

  return { slugs, org, env };
};
