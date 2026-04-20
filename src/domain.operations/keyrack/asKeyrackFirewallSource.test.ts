import { ConstraintError } from 'helpful-errors';

import { asKeyrackFirewallSource } from './asKeyrackFirewallSource';

describe('asKeyrackFirewallSource', () => {
  it('should parse json(env://VAR) format', () => {
    expect(asKeyrackFirewallSource({ slug: 'json(env://SECRETS)' })).toEqual({
      type: 'env',
      format: 'json',
      envVar: 'SECRETS',
    });
  });

  it('should parse json(stdin://*) format', () => {
    expect(asKeyrackFirewallSource({ slug: 'json(stdin://*)' })).toEqual({
      type: 'stdin',
      format: 'json',
    });
  });

  it('should parse json(stdin://) format without wildcard', () => {
    expect(asKeyrackFirewallSource({ slug: 'json(stdin://)' })).toEqual({
      type: 'stdin',
      format: 'json',
    });
  });

  it('should throw for env:// without variable name', () => {
    expect(() => asKeyrackFirewallSource({ slug: 'json(env://)' })).toThrow(
      ConstraintError,
    );
  });

  it('should throw for unsupported format', () => {
    expect(() => asKeyrackFirewallSource({ slug: 'yaml(env://X)' })).toThrow(
      ConstraintError,
    );
  });

  it('should throw for unsupported protocol', () => {
    expect(() =>
      asKeyrackFirewallSource({ slug: 'json(file://path)' }),
    ).toThrow(ConstraintError);
  });

  it('should throw for malformed slug', () => {
    expect(() => asKeyrackFirewallSource({ slug: 'malformed' })).toThrow(
      ConstraintError,
    );
  });

  it('should throw for empty slug', () => {
    expect(() => asKeyrackFirewallSource({ slug: '' })).toThrow(
      ConstraintError,
    );
  });
});
