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
          'ℹ no claude login at /home/h/.claude/.credentials.json — run /login inside the clone, or set ANTHROPIC_API_KEY',
        );
      });
    });
  });
});
