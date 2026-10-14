import { given, then, when } from 'test-fns';

import { asTreeReportLines } from './asTreeReportLines';

describe('asTreeReportLines', () => {
  given('[case1] three rows under a section margin', () => {
    when('[t0] they are drawn', () => {
      then('each row but the last draws ├─, and the last draws └─', () => {
        expect(
          asTreeReportLines({ rows: ['a', 'b', 'c'], indent: '   ' }),
        ).toEqual(['   ├─ a', '   ├─ b', '   └─ c']);
      });
    });
  });

  given('[case2] one row beneath a parent row stem', () => {
    when('[t0] it is drawn', () => {
      then('the row draws └─ after the full indent', () => {
        expect(asTreeReportLines({ rows: ['kept'], indent: '   │  ' })).toEqual(
          ['   │  └─ kept'],
        );
      });
    });
  });

  given('[case3] no rows', () => {
    when('[t0] they are drawn', () => {
      then('no line is drawn', () => {
        expect(asTreeReportLines({ rows: [], indent: '   ' })).toEqual([]);
      });
    });
  });
});
