import { UnexpectedCodePathError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { getKeyrackInfraInitErrorReport } from './getKeyrackInfraInitErrorReport';

describe('getKeyrackInfraInitErrorReport', () => {
  given('[case1] a helpful error with slug + stderr + hint metadata', () => {
    const error = new UnexpectedCodePathError('gh repo create failed', {
      slug: 'ehmpathy/keyrack-infra',
      stderr: 'HTTP 403: forbidden',
      status: 1,
      hint: 'if unauthenticated, run `gh auth status`; if authenticated but forbidden (403), ask an org owner to grant you repo-create access',
    });

    when('[t0] the blocked report is built', () => {
      const report = getKeyrackInfraInitErrorReport({ error });

      then('it roots on the keyrack lock glyph, no role mascot', () => {
        expect(report).toContain('🔐 keyrack infra init');
        expect(report).not.toContain('🐢');
      });

      then('it renders the blocked node under the domain root', () => {
        expect(report).toContain('✋ blocked: gh repo create failed');
      });

      then('it surfaces the caller-relevant metadata as leaves', () => {
        expect(report).toContain('repo: ehmpathy/keyrack-infra');
        expect(report).toContain('stderr: HTTP 403: forbidden');
        // the two-branch hint nests: a `hint:` node with a sub-branch per condition
        expect(report).toContain('hint:');
        expect(report).toContain('if unauthenticated');
        expect(report).toContain('if authenticated but forbidden');
      });

      then('the blocked treestruct stays locked', () => {
        expect(report).toMatchSnapshot();
      });
    });
  });

  given('[case2] a plain error with no metadata', () => {
    const error = new Error('the wave wiped out');

    when('[t0] the blocked report is built', () => {
      const report = getKeyrackInfraInitErrorReport({ error });

      then('it still renders the blocked node with the message', () => {
        expect(report).toContain('🔐 keyrack infra init');
        expect(report).not.toContain('🐢');
        expect(report).toContain('✋ blocked: the wave wiped out');
      });

      then('the minimal blocked treestruct stays locked', () => {
        expect(report).toMatchSnapshot();
      });
    });
  });
});
