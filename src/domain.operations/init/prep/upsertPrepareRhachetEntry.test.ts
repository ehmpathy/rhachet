import { given, then, when } from 'test-fns';

import { upsertPrepareRhachetEntry } from './upsertPrepareRhachetEntry';

describe('upsertPrepareRhachetEntry', () => {
  given('[case1] prepare:rhachet absent', () => {
    when('[t0] scripts object absent', () => {
      then('creates scripts and prepare:rhachet, effect=CREATED', () => {
        const pkg = { name: 'test' };
        const result = upsertPrepareRhachetEntry({
          pkg,
          value: 'rhachet init --roles mechanic',
        });

        expect(result.effect).toEqual('CREATED');
        expect(
          (result.pkg.scripts as Record<string, string>)['prepare:rhachet'],
        ).toEqual('rhachet init --roles mechanic');
      });
    });

    when('[t1] scripts object extant but prepare:rhachet absent', () => {
      then('adds prepare:rhachet, effect=CREATED', () => {
        const pkg = { name: 'test', scripts: { test: 'jest' } };
        const result = upsertPrepareRhachetEntry({
          pkg,
          value: 'rhachet init --roles mechanic',
        });

        expect(result.effect).toEqual('CREATED');
        expect(
          (result.pkg.scripts as Record<string, string>)['prepare:rhachet'],
        ).toEqual('rhachet init --roles mechanic');
        expect((result.pkg.scripts as Record<string, string>).test).toEqual(
          'jest',
        );
      });
    });
  });

  given('[case2] prepare:rhachet extant', () => {
    when('[t0] prepare:rhachet has prior value', () => {
      then('overwrites value, effect=UPDATED', () => {
        const pkg = {
          name: 'test',
          scripts: { 'prepare:rhachet': 'old command' },
        };
        const result = upsertPrepareRhachetEntry({
          pkg,
          value: 'rhachet init --hooks --roles mechanic',
        });

        expect(result.effect).toEqual('UPDATED');
        expect(
          (result.pkg.scripts as Record<string, string>)['prepare:rhachet'],
        ).toEqual('rhachet init --hooks --roles mechanic');
      });
    });
  });
});
