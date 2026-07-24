import { given, then, when } from 'test-fns';

import { getKeyrackInfraInitReport } from './getKeyrackInfraInitReport';

describe('getKeyrackInfraInitReport', () => {
  given('[case1] a fresh init (all effects created)', () => {
    when('[t0] the report is built', () => {
      const report = getKeyrackInfraInitReport({
        org: 'ehmpathy',
        repo: 'ehmpathy/keyrack-infra',
        repoEffect: 'created',
        readmeEffect: 'created',
        registryEffect: 'created',
      });

      then('it names the org and repo', () => {
        expect(report).toContain('org: ehmpathy');
        expect(report).toContain('repo: ehmpathy/keyrack-infra (private)');
      });

      then(
        'it marks each part as freshly created (verb mirrors the effect)',
        () => {
          // all three parts share the 'created' effect, so all read 'created ✨' —
          // the human verb matches the --json effect so the two outputs never disagree
          expect(report).toContain(
            'repo: ehmpathy/keyrack-infra (private) created ✨',
          );
          expect(report).toContain('readme: readme.md created ✨');
          expect(report).toContain(
            'registry: registry/github-apps.json created ✨',
          );
        },
      );

      then('it matches the snapshot', () => {
        expect(report).toMatchSnapshot();
      });
    });
  });

  given('[case2] a re-run (all effects found)', () => {
    when('[t0] the report is built', () => {
      const report = getKeyrackInfraInitReport({
        org: 'ehmpathy',
        repo: 'ehmpathy/keyrack-infra',
        repoEffect: 'found',
        readmeEffect: 'found',
        registryEffect: 'found',
      });

      then('it marks each part as already found', () => {
        expect(report).toContain('already found 👌');
        expect(report).not.toContain('✨');
      });

      then('it matches the snapshot', () => {
        expect(report).toMatchSnapshot();
      });
    });
  });
});
