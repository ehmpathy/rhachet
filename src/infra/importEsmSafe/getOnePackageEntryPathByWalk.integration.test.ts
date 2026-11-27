import { genTempDir, given, then, when } from 'test-fns';

import { mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getOnePackageEntryPathByWalk } from './getOnePackageEntryPathByWalk';

/**
 * .what = a temp repo with one package installed under the given node_modules dir
 */
const genRepoWithPackage = (input: {
  slug: string;
  manifest: Record<string, unknown>;
  files: string[];
  nest: string | null;
}): { repo: string; dirPackage: string } => {
  const root = realpathSync(genTempDir({ slug: input.slug }));
  const repo = input.nest ? join(root, input.nest) : root;
  mkdirSync(repo, { recursive: true });
  writeFileSync(join(repo, 'package.json'), '{ "name": "repo" }\n');
  const dirPackage = join(root, 'node_modules', 'probe-pkg');
  mkdirSync(dirPackage, { recursive: true });
  writeFileSync(
    join(dirPackage, 'package.json'),
    JSON.stringify({ name: 'probe-pkg', ...input.manifest }),
  );
  for (const file of input.files) {
    mkdirSync(join(dirPackage, file, '..'), { recursive: true });
    writeFileSync(join(dirPackage, file), 'module.exports = {};\n');
  }
  return { repo, dirPackage };
};

const TEST_CASES = [
  {
    description: 'a main names the entry',
    given: { manifest: { main: 'dist/index.js' }, files: ['dist/index.js'] },
    expect: { entry: 'dist/index.js' },
  },
  {
    description: 'a main with no extension finds its .js',
    given: { manifest: { main: 'dist/index' }, files: ['dist/index.js'] },
    expect: { entry: 'dist/index.js' },
  },
  {
    description: 'a main that names a dir finds its index.js',
    given: { manifest: { main: 'dist' }, files: ['dist/index.js'] },
    expect: { entry: 'dist/index.js' },
  },
  {
    description: 'no main falls back to index.js',
    given: { manifest: {}, files: ['index.js'] },
    expect: { entry: 'index.js' },
  },
  {
    description: 'a string exports wins over main',
    given: {
      manifest: { exports: './lib/entry.js', main: 'dist/index.js' },
      files: ['lib/entry.js', 'dist/index.js'],
    },
    expect: { entry: 'lib/entry.js' },
  },
  {
    description: 'a root export takes its require condition before default',
    given: {
      manifest: {
        exports: {
          '.': {
            import: './esm/index.mjs',
            require: './cjs/index.js',
            default: './esm/index.mjs',
          },
        },
      },
      files: ['cjs/index.js', 'esm/index.mjs'],
    },
    expect: { entry: 'cjs/index.js' },
  },
  {
    description:
      'a conditions-only exports takes its default where no require is named',
    given: {
      manifest: {
        exports: { import: './esm/index.mjs', default: './lib/index.js' },
      },
      files: ['lib/index.js', 'esm/index.mjs'],
    },
    expect: { entry: 'lib/index.js' },
  },
];

describe('getOnePackageEntryPathByWalk', () => {
  given('[case1] a package in the repo node_modules', () => {
    TEST_CASES.map((thisCase, index) =>
      when(`[t${index}] ${thisCase.description}`, () => {
        then('the walk returns that entry file', () => {
          const { repo, dirPackage } = genRepoWithPackage({
            slug: `entry-walk-${index}`,
            manifest: thisCase.given.manifest,
            files: thisCase.given.files,
            nest: null,
          });
          const entry = getOnePackageEntryPathByWalk({
            packageName: 'probe-pkg',
            fromPackageJson: join(repo, 'package.json'),
          });
          expect(entry).toEqual(join(dirPackage, thisCase.expect.entry));
        });
      }),
    );
  });

  given('[case2] a package installed in an ancestor node_modules', () => {
    when('[t0] the walk starts in a nested repo', () => {
      then('it climbs to the ancestor and returns the entry', () => {
        const { repo, dirPackage } = genRepoWithPackage({
          slug: 'entry-walk-ancestor',
          manifest: { main: 'index.js' },
          files: ['index.js'],
          nest: 'packages/app',
        });
        const entry = getOnePackageEntryPathByWalk({
          packageName: 'probe-pkg',
          fromPackageJson: join(repo, 'package.json'),
        });
        expect(entry).toEqual(join(dirPackage, 'index.js'));
      });
    });
  });

  given('[case3] no node_modules dir holds the package', () => {
    when('[t0] the walk runs', () => {
      then('it returns null, so the caller keeps the runtime error', () => {
        const repo = realpathSync(genTempDir({ slug: 'entry-walk-absent' }));
        writeFileSync(join(repo, 'package.json'), '{ "name": "repo" }\n');
        expect(
          getOnePackageEntryPathByWalk({
            packageName: 'probe-pkg-absent',
            fromPackageJson: join(repo, 'package.json'),
          }),
        ).toBeNull();
      });
    });
  });

  given('[case4] a manifest whose entry file is absent', () => {
    when('[t0] the walk runs', () => {
      then('it returns null, never a path to a file that is not there', () => {
        const { repo } = genRepoWithPackage({
          slug: 'entry-walk-noentry',
          manifest: { main: 'dist/index.js' },
          files: [],
          nest: null,
        });
        expect(
          getOnePackageEntryPathByWalk({
            packageName: 'probe-pkg',
            fromPackageJson: join(repo, 'package.json'),
          }),
        ).toBeNull();
      });
    });
  });
});
