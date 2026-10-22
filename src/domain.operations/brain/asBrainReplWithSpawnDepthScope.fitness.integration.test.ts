import { given, then, when } from 'test-fns';

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * .what = a fitness clamp: every prod module that holds a repl brain and calls `.ask(` or
 *   `.act(` routes the call through a depth-scope wrapper, or is named on the allowlist
 * .why = the repl door is a spawn, so a call that skips the scope runs a review brain with
 *   no depth check. three doors each had to remember the wrapper, and the third was found
 *   only in review. a new door that forgets it fails here, at the time it is written
 *
 * .note = a heuristic on the source text, never a type check: a module "holds a repl" when
 *   it imports `BrainRepl` or `isBrainRepl`, and "calls" when it holds an `.ask(` or `.act(`.
 *   a false positive is cured by the wrapper, or by an allowlist row with its reason
 * .note = an integration test: it reads the src tree from disk
 */

// the modules that wrap the call, or that hold a repl and never call it raw
const ALLOWLIST: Record<string, string> = {
  'src/domain.operations/brain/asBrainReplWithSpawnDepthScope.ts':
    'the wrapper itself: it calls the repl inside the scope',
  'src/contract/cli/invokeAsk.ts':
    'calls `clone.ask`, whose op is `actorAsk`, which wraps',
  'src/contract/cli/invokeAct.ts':
    'calls `clone.act`, whose op is `actorAct`, which wraps',
};

// the imports that put a call inside the depth scope: the two wrappers, and the two actor
//   ops that call through the first
const WRAPPER_IMPORTS = [
  'asBrainReplWithSpawnDepthScope',
  'asBrainReplWithContextBound',
  'actorAsk',
  'actorAct',
];

/**
 * .what = the source with its block and line comments dropped
 * .why = a docblock that names `.ask()` is no call
 */
const asSourceWithoutComments = (input: { source: string }): string =>
  input.source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/**
 * .what = every file path under a dir, relative to the repo root, with dot-dirs left unread
 * .why = a dot-dir (`.temp`, `.test`) holds no prod door, and another suite may create and
 *   remove a `.temp` dir mid-walk; a recursive readdir that entered it would throw ENOENT
 */
const getAllFilePathsSkipDotDirs = (input: {
  root: string;
  rel: string;
}): string[] =>
  readdirSync(join(input.root, input.rel), { withFileTypes: true }).flatMap(
    (entry) => {
      const rel = join(input.rel, entry.name);
      if (!entry.isDirectory()) return [rel];
      if (entry.name.startsWith('.')) return [];
      return getAllFilePathsSkipDotDirs({ root: input.root, rel });
    },
  );

/**
 * .what = every prod `.ts` path under a dir, relative to the repo root
 * .why = a test file, a test asset, and a typed `_topublish` supplier are not prod doors
 */
const getAllProdTsPaths = (input: { root: string }): string[] =>
  getAllFilePathsSkipDotDirs({ root: input.root, rel: 'src' })
    .filter((path) => path.endsWith('.ts'))
    .filter((path) => !/\.test\.ts$/.test(path))
    .filter((path) => !/(^|\/)\.test(\.assets)?\//.test(path))
    .filter((path) => !path.startsWith('src/_topublish/'));

/**
 * .what = whether a module holds a repl and calls ask or act
 */
const isReplCaller = (input: { source: string }): boolean => {
  const holdsRepl = /\b(BrainRepl|isBrainRepl)\b/.test(input.source);
  const callsBrain = /\.(ask|act)\s*(<[^>]*>)?\s*\(/.test(input.source);
  return holdsRepl && callsBrain;
};

describe('asBrainReplWithSpawnDepthScope.fitness', () => {
  given('[case1] the prod src tree', () => {
    const root = relative(process.cwd(), join(__dirname, '../../..')) || '.';

    when(
      '[t0] each module that holds a repl and calls ask or act is read',
      () => {
        const offenders = getAllProdTsPaths({ root })
          .filter((path) => !(path in ALLOWLIST))
          .filter((path) => {
            const source = asSourceWithoutComments({
              source: readFileSync(join(root, path), 'utf8'),
            });
            if (!isReplCaller({ source })) return false;
            return !WRAPPER_IMPORTS.some((name) => source.includes(name));
          });

        then('each one routes the call through a depth-scope wrapper', () => {
          expect(offenders).toEqual([]);
        });
      },
    );

    when('[t1] each allowlist row is checked against the tree', () => {
      const paths = getAllProdTsPaths({ root });

      then(
        'every allowlisted module still exists, so no stale row hides a door',
        () => {
          const stale = Object.keys(ALLOWLIST).filter(
            (path) => !paths.includes(path),
          );
          expect(stale).toEqual([]);
        },
      );
    });
  });
});
