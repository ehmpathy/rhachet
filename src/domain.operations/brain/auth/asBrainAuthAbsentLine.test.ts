import { given, then, when } from 'test-fns';

import { asBrainAuthAbsentLine } from './asBrainAuthAbsentLine';

describe('asBrainAuthAbsentLine', () => {
  given('[case1] a shared login path with no login in it', () => {
    when('[t0] the line is rendered', () => {
      then('it names the login path and both fixes', () => {
        const line = asBrainAuthAbsentLine({
          brainAuthPath: '/home/h/.claude/.credentials.json',
        });
        expect(line).toMatchSnapshot();
        expect(line).toEqual(
          'ℹ no claude login at /home/h/.claude/.credentials.json — run /login inside the clone, or set CLAUDE_CODE_OAUTH_TOKEN (from `claude setup-token`)',
        );
      });
      then('it never suggests the api key, which bills the api', () => {
        const line = asBrainAuthAbsentLine({
          brainAuthPath: '/home/h/.claude/.credentials.json',
        });
        expect(line).not.toContain('ANTHROPIC_API_KEY');
      });
    });
  });

  given('[case2] a login path with spaces in it', () => {
    when('[t0] the line is rendered', () => {
      then('it names the whole path verbatim, with both fixes after it', () => {
        const line = asBrainAuthAbsentLine({
          brainAuthPath: '/Users/Jamie Rivera/.claude/.credentials.json',
        });
        expect(line).toContain(
          'no claude login at /Users/Jamie Rivera/.claude/.credentials.json — run /login',
        );
        expect(line).toContain('CLAUDE_CODE_OAUTH_TOKEN');
      });
    });
  });
});
