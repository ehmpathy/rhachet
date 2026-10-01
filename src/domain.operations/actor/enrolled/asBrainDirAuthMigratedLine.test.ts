import { given, then, when } from 'test-fns';

import { asBrainDirAuthMigratedLine } from './asBrainDirAuthMigratedLine';

describe('asBrainDirAuthMigratedLine', () => {
  const base = {
    brainDirAuthPath:
      '/r/.agent/.actors/actor.via.hash=abc/brain/.claude/.credentials.json',
    brainAuthPath: '/home/h/.claude/.credentials.json',
    liveCount: 2,
  };

  given('[case1] the login was kept for live clones', () => {
    when('[t0] the line is rendered', () => {
      then(
        'it names the kept path, the live count and the respawn cure',
        () => {
          const line = asBrainDirAuthMigratedLine({ ...base, outcome: 'kept' });
          expect(line).toContain(base.brainDirAuthPath);
          expect(line).toContain('2 clone(s) of this actor still live');
          expect(line).toContain('respawn them');
          expect(line).toMatchSnapshot();
        },
      );
    });
  });

  given('[case2] the login was adopted', () => {
    when('[t0] the line is rendered', () => {
      then('it names both paths', () => {
        const line = asBrainDirAuthMigratedLine({
          ...base,
          outcome: 'adopted',
          liveCount: 0,
        });
        expect(line).toContain(base.brainDirAuthPath);
        expect(line).toContain(base.brainAuthPath);
        expect(line).toMatchSnapshot();
      });
    });
  });

  given('[case3] the login was removed, or there was none', () => {
    when('[t0] the line is rendered', () => {
      then('it says naught', () => {
        expect(
          asBrainDirAuthMigratedLine({
            ...base,
            outcome: 'removed',
            liveCount: 0,
          }),
        ).toBeNull();
        expect(
          asBrainDirAuthMigratedLine({
            ...base,
            outcome: 'none',
            liveCount: 0,
          }),
        ).toBeNull();
      });
    });
  });
});
