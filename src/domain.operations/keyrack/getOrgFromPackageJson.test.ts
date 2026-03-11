import {
  parseOrgFromRepositoryField,
  parseOrgFromScopedName,
} from './getOrgFromPackageJson';

describe('parseOrgFromScopedName', () => {
  const TEST_CASES = [
    {
      description: 'extracts org from scoped name',
      given: { name: '@ehmpathy/my-project' },
      expect: 'ehmpathy',
    },
    {
      description: 'extracts org from complex scoped name',
      given: { name: '@my-org/some-package-name' },
      expect: 'my-org',
    },
    {
      description: 'returns null for unscoped name',
      given: { name: 'my-package' },
      expect: null,
    },
    {
      description: 'returns null for empty name',
      given: { name: '' },
      expect: null,
    },
  ];

  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const result = parseOrgFromScopedName(thisCase.given);
      expect(result).toEqual(thisCase.expect);
    }),
  );
});

describe('parseOrgFromRepositoryField', () => {
  const TEST_CASES = [
    {
      description: 'extracts org from npm bare shorthand (owner/repo)',
      given: { repository: 'ehmpathy/rhachet' },
      expect: 'ehmpathy',
    },
    {
      description: 'extracts org from github shorthand',
      given: { repository: 'github:ehmpathy/rhachet' },
      expect: 'ehmpathy',
    },
    {
      description: 'extracts org from gitlab shorthand',
      given: { repository: 'gitlab:myorg/myrepo' },
      expect: 'myorg',
    },
    {
      description: 'extracts org from bitbucket shorthand',
      given: { repository: 'bitbucket:company/project' },
      expect: 'company',
    },
    {
      description: 'extracts org from https github url',
      given: { repository: 'https://github.com/ehmpathy/cool-project.git' },
      expect: 'ehmpathy',
    },
    {
      description: 'extracts org from git:// github url',
      given: { repository: 'git://github.com/myorg/myrepo.git' },
      expect: 'myorg',
    },
    {
      description: 'extracts org from repository object',
      given: {
        repository: {
          type: 'git',
          url: 'https://github.com/ehmpathy/rhachet.git',
        },
      },
      expect: 'ehmpathy',
    },
    {
      description: 'extracts org from gitlab url',
      given: { repository: 'https://gitlab.com/company/project.git' },
      expect: 'company',
    },
    {
      description: 'returns null for unknown format',
      given: { repository: 'some-random-string' },
      expect: null,
    },
    {
      description: 'returns null for local path',
      given: { repository: './local/path' },
      expect: null,
    },
  ];

  TEST_CASES.map((thisCase) =>
    test(thisCase.description, () => {
      const result = parseOrgFromRepositoryField(thisCase.given);
      expect(result).toEqual(thisCase.expect);
    }),
  );
});
