import { given, then, when } from 'test-fns';

import { findsertPrepareWithPrepareRhachetEntry } from './findsertPrepareWithPrepareRhachetEntry';

describe('findsertPrepareWithPrepareRhachetEntry', () => {
  given('[case1] prepare absent', () => {
    when('[t0] scripts object absent', () => {
      then('creates scripts and prepare, effect=CREATED', () => {
        const pkg = { name: 'test' };
        const result = findsertPrepareWithPrepareRhachetEntry({ pkg });

        expect(result.effect).toEqual('CREATED');
        expect((result.pkg.scripts as Record<string, string>).prepare).toEqual(
          'npm run prepare:rhachet',
        );
      });
    });

    when('[t1] scripts object extant but prepare absent', () => {
      then('adds prepare, effect=CREATED', () => {
        const pkg = { name: 'test', scripts: { test: 'jest' } };
        const result = findsertPrepareWithPrepareRhachetEntry({ pkg });

        expect(result.effect).toEqual('CREATED');
        expect((result.pkg.scripts as Record<string, string>).prepare).toEqual(
          'npm run prepare:rhachet',
        );
      });
    });
  });

  given('[case2] prepare extant, lacks npm run prepare:rhachet', () => {
    when('[t0] prepare has prior value', () => {
      then('appends with separator, effect=APPENDED', () => {
        const pkg = { name: 'test', scripts: { prepare: 'husky install' } };
        const result = findsertPrepareWithPrepareRhachetEntry({ pkg });

        expect(result.effect).toEqual('APPENDED');
        expect((result.pkg.scripts as Record<string, string>).prepare).toEqual(
          'husky install && npm run prepare:rhachet',
        );
      });
    });
  });

  given('[case3] prepare extant, has npm run prepare:rhachet', () => {
    when('[t0] prepare already contains npm run prepare:rhachet', () => {
      then('no-op, effect=FOUND', () => {
        const pkg = {
          name: 'test',
          scripts: { prepare: 'husky install && npm run prepare:rhachet' },
        };
        const result = findsertPrepareWithPrepareRhachetEntry({ pkg });

        expect(result.effect).toEqual('FOUND');
        expect((result.pkg.scripts as Record<string, string>).prepare).toEqual(
          'husky install && npm run prepare:rhachet',
        );
      });
    });

    when('[t1] prepare equals npm run prepare:rhachet exactly', () => {
      then('no-op, effect=FOUND', () => {
        const pkg = {
          name: 'test',
          scripts: { prepare: 'npm run prepare:rhachet' },
        };
        const result = findsertPrepareWithPrepareRhachetEntry({ pkg });

        expect(result.effect).toEqual('FOUND');
      });
    });
  });
});
