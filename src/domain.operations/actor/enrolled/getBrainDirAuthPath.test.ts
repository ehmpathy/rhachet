import { given, then, when } from 'test-fns';

import { getBrainDirAuthPath } from './getBrainDirAuthPath';

describe('getBrainDirAuthPath', () => {
  given('[case1] an actor brain dir', () => {
    when('[t0] the brain-dir login path is computed', () => {
      then('it is the credentials file directly in the brain dir', () => {
        expect(
          getBrainDirAuthPath({
            brainDir: '/repo/.agent/.actors/a/brain/.claude',
          }),
        ).toEqual('/repo/.agent/.actors/a/brain/.claude/.credentials.json');
      });
    });
  });
});
