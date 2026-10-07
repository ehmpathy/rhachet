import { given, then, when } from 'test-fns';

import { asBootSubjectMarginLines } from './asBootSubjectMarginLines';

describe('asBootSubjectMarginLines', () => {
  given('[case1] no subject in scope', () => {
    when('[t0] the block renders', () => {
      then('it emits no line — the `narrow` rung stands alone', () => {
        expect(
          asBootSubjectMarginLines({ margins: [], inScope: [], fault: null }),
        ).toEqual([]);
      });
    });
  });

  given('[case2] a re-walk that faulted', () => {
    when('[t0] the block renders', () => {
      const lines = asBootSubjectMarginLines({
        margins: null,
        inScope: ['alpha', 'beta'],
        fault: 'ENOENT: briefs/vanished.md',
      });

      then('the subjects are still named', () => {
        expect(lines[0]).toContain('2 subjects: alpha, beta');
      });

      then('the absent prices are disclosed, with their cause', () => {
        expect(lines[1]).toContain('could not be measured');
        expect(lines[1]).toContain('ENOENT: briefs/vanished.md');
      });
    });
  });

  given('[case3] one priced subject', () => {
    when('[t0] the block renders', () => {
      then('the header reads `it`, never `each`', () => {
        const lines = asBootSubjectMarginLines({
          margins: [{ slug: 'alpha', tokens: 120 }],
          inScope: ['alpha'],
          fault: null,
        });
        expect(lines[0]).toContain('1 subject, and what a drop of it recovers');
        expect(lines[0]).not.toContain('each');
      });
    });
  });

  given('[case4] several priced subjects of uneven slug length', () => {
    when('[t0] the block renders', () => {
      const lines = asBootSubjectMarginLines({
        margins: [
          { slug: 'a', tokens: 9 },
          { slug: 'longer-slug', tokens: 1_234 },
        ],
        inScope: ['a', 'longer-slug'],
        fault: null,
      });

      then('the header counts the subjects and reads `each`', () => {
        expect(lines[0]).toContain(
          '2 subjects, and what a drop of each recovers',
        );
      });

      then('the token column aligns across rows', () => {
        // the `−` sign sits at one column on every row, whatever the slug length
        const columns = lines.slice(1).map((line) => line.indexOf('−'));
        expect(new Set(columns).size).toEqual(1);
      });

      then('the render matches its snapshot', () => {
        expect(lines.join('\n')).toMatchSnapshot();
      });
    });
  });
});
