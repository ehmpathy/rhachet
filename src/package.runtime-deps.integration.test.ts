import { given, then, when } from 'test-fns';

import { readdirSync, readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { join } from 'node:path';

const REPO_ROOT = join(__dirname, '..');

/**
 * .what = shipped files whose value imports may name a devDependency, each with its why
 * .why = a file no contract reaches is never run by a consumer; it is named here, never skipped by
 *        a wide glob, so a new one shows up in review
 */
const FILES_REACHED_ONLY_BY_TESTS = [
  // the openai stitch adapter: imported by integration tests and `src/.test/` alone, exported by no contract
  'src/domain.operations/stitch/adapters/imagineViaOpenAI.ts',
];

/**
 * .what = the source files a consumer of the published package runs
 * .why = a test file, a test asset, or a vendored package under `_topublish` never ships in `dist/`
 */
const getAllShippedSourcePaths = (): string[] =>
  readdirSync(join(REPO_ROOT, 'src'), { recursive: true })
    .map(String)
    .filter((rel) => rel.endsWith('.ts') && !rel.endsWith('.d.ts'))
    .filter((rel) => !/\.test\.ts$/.test(rel))
    .filter((rel) => !/(^|\/)(\.test|__snapshots__|_topublish)\//.test(rel))
    .filter((rel) => !FILES_REACHED_ONLY_BY_TESTS.includes(`src/${rel}`))
    .map((rel) => join(REPO_ROOT, 'src', rel));

/**
 * .what = the package each value import of a file names; a `type`-only import is left out, since
 *         it is erased at compile
 */
const asValueImportPackages = (input: { source: string }): string[] => {
  const specifiers = [
    ...input.source.matchAll(/^import\s+(?!type\s)[^;]*?from\s+'([^']+)'/gms),
    ...input.source.matchAll(/^import\s+'([^']+)'/gm),
    ...input.source.matchAll(/\brequire\('([^']+)'\)/g),
    ...input.source.matchAll(/\bimport\('([^']+)'\)/g),
  ].map((match) => match[1]!);
  return specifiers
    .filter((spec) => !spec.startsWith('.') && !spec.startsWith('node:'))
    .filter((spec) => !spec.includes('${')) // a specifier built in a template string names no package
    .filter((spec) => !spec.startsWith('@src/') && !spec.startsWith('@/'))
    .map((spec) =>
      spec.startsWith('@')
        ? spec.split('/').slice(0, 2).join('/')
        : spec.split('/')[0]!,
    )
    .filter((name) => !builtinModules.includes(name));
};

describe('package.json runtime dependencies', () => {
  given('[case1] the shipped source under src/', () => {
    when('[t0] each value import is read', () => {
      then(
        'every imported package is a runtime dependency, never only a devDependency',
        () => {
          // a consumer installs `dependencies` only; a value import of a devDependency fails at its first require
          const pkg = JSON.parse(
            readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'),
          ) as {
            name: string;
            dependencies?: Record<string, string>;
            peerDependencies?: Record<string, string>;
            optionalDependencies?: Record<string, string>;
          };
          const runtime = new Set([
            pkg.name,
            ...Object.keys(pkg.dependencies ?? {}),
            ...Object.keys(pkg.peerDependencies ?? {}),
            ...Object.keys(pkg.optionalDependencies ?? {}),
          ]);
          const absent = getAllShippedSourcePaths().flatMap((path) =>
            asValueImportPackages({ source: readFileSync(path, 'utf8') })
              .filter((name) => !runtime.has(name))
              .map((name) => `${name} ← ${path.slice(REPO_ROOT.length + 1)}`),
          );
          expect(absent).toEqual([]);
        },
      );
    });
  });
});
