import { given, then, when } from 'test-fns';

import { asFixturePackageJsonWithPrepare } from './asFixturePackageJsonWithPrepare';

describe('asFixturePackageJsonWithPrepare', () => {
  given('[case1] a package.json with other scripts and an old prepare entry', () => {
    const pkg = {
      name: 'fixture',
      scripts: { build: 'tsc', 'prepare:rhachet': 'rhachet init --roles old' },
    };

    when('[t0] the prepare entry is set', () => {
      const pkgNext = asFixturePackageJsonWithPrepare({
        pkg,
        command: 'rhachet init --roles mechanic',
      });

      then('the other scripts and keys stay, and the entry and its hop are set', () => {
        expect(pkgNext).toEqual({
          name: 'fixture',
          scripts: {
            build: 'tsc',
            'prepare:rhachet': 'rhachet init --roles mechanic',
            prepare: 'npm run prepare:rhachet',
          },
        });
      });

      then('the input is left as it was', () => {
        expect(pkg.scripts['prepare:rhachet']).toEqual('rhachet init --roles old');
      });
    });
  });

  given('[case2] a package.json with no scripts', () => {
    when('[t0] the prepare entry is set', () => {
      then('scripts holds only the entry and its hop', () => {
        expect(
          asFixturePackageJsonWithPrepare({ pkg: {}, command: 'rhachet init' })
            .scripts,
        ).toEqual({
          'prepare:rhachet': 'rhachet init',
          prepare: 'npm run prepare:rhachet',
        });
      });
    });
  });

  given('[case3] a package.json whose prepare runs another script', () => {
    when('[t0] the prepare entry is set', () => {
      then('the extant prepare is kept, and the hop is appended to it', () => {
        expect(
          asFixturePackageJsonWithPrepare({
            pkg: { scripts: { prepare: 'husky install' } },
            command: 'rhachet init',
          }).scripts,
        ).toEqual({
          'prepare:rhachet': 'rhachet init',
          prepare: 'husky install && npm run prepare:rhachet',
        });
      });
    });
  });

  given('[case4] a package.json whose prepare already hops to the entry', () => {
    when('[t0] the prepare entry is set', () => {
      then('the extant prepare is kept as it was', () => {
        expect(
          asFixturePackageJsonWithPrepare({
            pkg: {
              scripts: { prepare: 'husky install && npm run prepare:rhachet' },
            },
            command: 'rhachet init',
          }).scripts,
        ).toEqual({
          'prepare:rhachet': 'rhachet init',
          prepare: 'husky install && npm run prepare:rhachet',
        });
      });
    });
  });
});
