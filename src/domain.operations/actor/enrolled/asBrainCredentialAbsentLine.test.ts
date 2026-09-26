import { given, then, when } from 'test-fns';

import { asBrainCredentialAbsentLine } from './asBrainCredentialAbsentLine';

describe('asBrainCredentialAbsentLine', () => {
  given('[case1] a brain dir with no credential to link', () => {
    when('[t0] the line is rendered', () => {
      then('it names the brain dir and both fixes', () => {
        expect(
          asBrainCredentialAbsentLine({ brainDir: '/a/brain/.claude' }),
        ).toEqual(
          'ℹ no claude credential to link into /a/brain/.claude — run /login inside the clone, or set ANTHROPIC_API_KEY',
        );
      });
    });
  });
});
