import { asKeyrackSlugParts } from './asKeyrackSlugParts';

describe('asKeyrackSlugParts', () => {
  it('should extract org, env, and keyName from slug', () => {
    expect(asKeyrackSlugParts({ slug: 'org.test.KEY' })).toEqual({
      org: 'org',
      env: 'test',
      keyName: 'KEY',
    });
  });

  it('should handle ehmpathy org with prod env', () => {
    expect(asKeyrackSlugParts({ slug: 'ehmpathy.prod.API_TOKEN' })).toEqual({
      org: 'ehmpathy',
      env: 'prod',
      keyName: 'API_TOKEN',
    });
  });

  it('should handle env=all', () => {
    expect(asKeyrackSlugParts({ slug: 'ehmpath.all.GITHUB_TOKEN' })).toEqual({
      org: 'ehmpath',
      env: 'all',
      keyName: 'GITHUB_TOKEN',
    });
  });

  it('should handle key names with underscores', () => {
    expect(
      asKeyrackSlugParts({ slug: 'myorg.test.MY_COMPLEX_KEY_NAME' }),
    ).toEqual({
      org: 'myorg',
      env: 'test',
      keyName: 'MY_COMPLEX_KEY_NAME',
    });
  });
});
