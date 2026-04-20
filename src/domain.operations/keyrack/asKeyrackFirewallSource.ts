import { ConstraintError } from 'helpful-errors';

type KeyrackFirewallSourceType = 'env' | 'stdin';

export interface KeyrackFirewallSource {
  type: KeyrackFirewallSourceType;
  format: 'json';
  envVar?: string;
}

/**
 * .what = parse --from slug into structured source descriptor
 * .why = enables extensible input sources for keyrack firewall CLI
 *
 * supported formats:
 *   json(env://VAR)   - read JSON from env var VAR
 *   json(stdin://*)   - read JSON from stdin
 */
export const asKeyrackFirewallSource = (input: {
  slug: string;
}): KeyrackFirewallSource => {
  // pattern: format(protocol://path)
  const match = input.slug.match(/^(\w+)\((\w+):\/\/(.*)?\)$/);
  if (!match) {
    throw new ConstraintError('invalid --from slug format', {
      slug: input.slug,
      hint: 'expected format: json(env://VAR) or json(stdin://*)',
      examples: ['json(env://SECRETS)', 'json(stdin://*)'],
    });
  }

  const [, format, protocol, path] = match;

  // validate format
  if (format !== 'json') {
    throw new ConstraintError('unsupported --from format', {
      format,
      supported: ['json'],
      hint: 'only json format is supported',
    });
  }

  // validate protocol
  if (protocol === 'env') {
    if (!path) {
      throw new ConstraintError('env:// requires variable name', {
        slug: input.slug,
        hint: 'use json(env://VAR_NAME)',
      });
    }
    return { type: 'env', format: 'json', envVar: path };
  }

  if (protocol === 'stdin') {
    return { type: 'stdin', format: 'json' };
  }

  throw new ConstraintError('unsupported --from protocol', {
    protocol,
    supported: ['env', 'stdin'],
    hint: 'use json(env://VAR) or json(stdin://*)',
  });
};
