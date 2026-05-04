import { given, then, when } from 'test-fns';

import { getHomeDir } from './getHomeDir';

describe('getHomeDir', () => {
  given('[case1] HOME is set', () => {
    when('[t0] getHomeDir is called', () => {
      then('returns HOME value', () => {
        const originalHome = process.env.HOME;
        process.env.HOME = '/test/home';
        try {
          const result = getHomeDir();
          expect(result).toEqual('/test/home');
        } finally {
          process.env.HOME = originalHome;
        }
      });
    });
  });

  given('[case2] HOME is not set', () => {
    when('[t0] getHomeDir is called', () => {
      then('throws UnexpectedCodePathError', () => {
        const originalHome = process.env.HOME;
        delete process.env.HOME;
        try {
          expect(() => getHomeDir()).toThrow('HOME not set');
        } finally {
          process.env.HOME = originalHome;
        }
      });
    });
  });
});
