import { given, then, when } from 'test-fns';

import { asAcceptanceBoxHeader } from './asAcceptanceBoxHeader';

describe('asAcceptanceBoxHeader', () => {
  given('[case1] a shared box', () => {
    when('[t0] at its default width', () => {
      then('it names the box, why it is not ci, the width as the default, the nice, and the way to go wide', () => {
        const header = asAcceptanceBoxHeader({
          box: 'shared',
          maxWorkersDefault: 3,
          maxWorkers: 3,
          cores: 12,
          niceNow: 10,
        });
        expect(header).toContain(
          'box = shared (no GITHUB_ACTIONS host signal; CI=true alone does not widen)',
        );
        expect(header).toContain('workers = 3 of 12 cores (shared-box default)');
        expect(header).toContain('priority = nice 10');
        expect(header).toContain('to go wide, pass --maxWorkers 100%');
        expect(header).toMatchSnapshot();
      });
    });

    when('[t1] the runner asked for a width', () => {
      then('it reads the width as asked, and names the way back, not the way to go wide', () => {
        const header = asAcceptanceBoxHeader({
          box: 'shared',
          maxWorkersDefault: 3,
          maxWorkers: 12,
          cores: 12,
          niceNow: 10,
        });
        expect(header).toContain('workers = 12 of 12 cores (asked)');
        expect(header).toContain('drop --maxWorkers for the shared-box default');
        expect(header).not.toContain('to go wide');
        expect(header).toMatchSnapshot();
      });
    });

    when('[t2] the runner was already niced below the target', () => {
      then('it names the deeper nice it kept, since the suite never raises its priority', () => {
        const header = asAcceptanceBoxHeader({
          box: 'shared',
          maxWorkersDefault: 3,
          maxWorkers: 3,
          cores: 12,
          niceNow: 19,
        });
        expect(header).toContain('priority = nice 19');
        expect(header).not.toContain('nice 10');
        expect(header).toMatchSnapshot();
      });
    });
  });

  given('[case2] ci', () => {
    when('[t0] at its default width', () => {
      then('it names ci, the percent jest resolved as the default, and normal priority', () => {
        const header = asAcceptanceBoxHeader({
          box: 'ci',
          maxWorkersDefault: '50%',
          maxWorkers: 2,
          cores: 4,
          niceNow: 0,
        });
        expect(header).toContain('box = ci\n');
        expect(header).toContain('workers = 2 of 4 cores (ci default)');
        expect(header).toContain('ci keeps its full width, at normal priority');
        expect(header).toMatchSnapshot();
      });
    });

    when('[t1] on a 2-core runner, where half the cores floors to one', () => {
      then('one worker still reads as the default', () => {
        const header = asAcceptanceBoxHeader({
          box: 'ci',
          maxWorkersDefault: '50%',
          maxWorkers: 1,
          cores: 2,
          niceNow: 0,
        });
        expect(header).toContain('workers = 1 of 2 cores (ci default)');
        expect(header).toMatchSnapshot();
      });
    });

    when('[t2] the runner asked for a width', () => {
      then('it names ci and reads the width as asked', () => {
        const header = asAcceptanceBoxHeader({
          box: 'ci',
          maxWorkersDefault: '50%',
          maxWorkers: 4,
          cores: 4,
          niceNow: 0,
        });
        expect(header).toContain('box = ci\n');
        expect(header).toContain('workers = 4 of 4 cores (asked)');
        expect(header).toContain('the width this ci step asked, at normal priority');
        expect(header).not.toContain('ci keeps its full width');
        expect(header).toMatchSnapshot();
      });
    });
  });
});
