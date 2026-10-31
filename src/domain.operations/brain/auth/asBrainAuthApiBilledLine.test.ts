import { given, then, when } from 'test-fns';

import { asBrainAuthApiBilledLine } from './asBrainAuthApiBilledLine';

describe('asBrainAuthApiBilledLine', () => {
  given('[case1] a spawn env with no ANTHROPIC_API_KEY', () => {
    when('[t0] the notice is rendered', () => {
      then('it says naught', () => {
        expect(
          asBrainAuthApiBilledLine({
            env: { CLAUDE_CODE_OAUTH_TOKEN: 'sk-ant-oat-fake' },
          }),
        ).toEqual(null);
      });
    });
  });

  given('[case2] a spawn env with an empty ANTHROPIC_API_KEY', () => {
    when('[t0] the notice is rendered', () => {
      then('it says naught, since claude code ignores an empty key', () => {
        expect(
          asBrainAuthApiBilledLine({ env: { ANTHROPIC_API_KEY: '' } }),
        ).toEqual(null);
      });
    });
  });

  given('[case3] a spawn env with ANTHROPIC_API_KEY set', () => {
    when('[t0] the notice is rendered', () => {
      then('it names the key, the api charge, and the fix', () => {
        const line = asBrainAuthApiBilledLine({
          env: { ANTHROPIC_API_KEY: 'sk-ant-api-fake' },
        });
        expect(line).toContain('bills the anthropic api');
        expect(line).toContain('unset ANTHROPIC_API_KEY');
        expect(line).not.toContain('sk-ant-api-fake');
        expect(line).toMatchSnapshot();
      });
    });
  });
});
