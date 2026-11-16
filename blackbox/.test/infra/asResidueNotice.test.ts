import { given, then, when } from 'test-fns';

import { asResidueNotice } from './asResidueNotice';

describe('asResidueNotice', () => {
  given('[case1] a box that earlier runs left', () => {
    when('[t0] they left dirs and stubs', () => {
      const notice = asResidueNotice({ dirs: 225, stubs: 310, tmpRoot: '/tmp' });

      then('it counts each kind', () => {
        expect(notice).toContain('225 rhachet-test-* test repo dirs in /tmp');
        expect(notice).toContain('310 stubBrainCli.cjs processes of this checkout');
      });

      then('it names a delete for the dirs, bound by age so a live run keeps its dir', () => {
        expect(notice).toContain(
          "find /tmp -maxdepth 1 -name 'rhachet-test-*' -mmin +1440 -exec rm -rf {} +",
        );
      });

      then('it proposes no pattern kill for the stubs', () => {
        expect(notice).not.toContain('pkill');
        expect(notice).not.toContain('kill ');
      });

      then('the render is pinned', () => {
        expect(notice).toMatchSnapshot();
      });
    });

    when('[t1] they left dirs alone', () => {
      const notice = asResidueNotice({ dirs: 4, stubs: 0, tmpRoot: '/tmp' });

      then('it shows the dirs and their delete, and closes the tree there', () => {
        expect(notice).not.toContain('stubBrainCli.cjs');
        expect(notice).toMatchSnapshot();
      });
    });

    when('[t2] they left stubs alone', () => {
      const notice = asResidueNotice({ dirs: 0, stubs: 2, tmpRoot: '/tmp' });

      then('it shows the stubs, and no delete for dirs it did not find', () => {
        expect(notice).not.toContain('find ');
        expect(notice).toMatchSnapshot();
      });
    });

    when('[t3] the box is clean', () => {
      then('it prints naught', () => {
        expect(asResidueNotice({ dirs: 0, stubs: 0, tmpRoot: '/tmp' })).toBeNull();
      });
    });
  });
});
