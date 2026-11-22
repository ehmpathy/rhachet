import { ConstraintError } from 'helpful-errors';
import { getOneTempDirRoot } from 'test-fns';

import {
  isCwdInsideRepoRoot,
  TEST_REPO_ROOT,
} from '@src/.test/infra/genTempDirPhysical';

/**
 * .what = escapes every regex metacharacter in a literal, so it matches only itself
 */
const asRegexEscaped = (input: { literal: string }): string =>
  input.literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * .what = the dir-name segment of a temp test repo: `<stamp>.<run>.rhachet-test[-suffix].<uuid>`
 * .note = the class `[^/\s'"):]` stops at a path separator, whitespace, a quote, a close-paren,
 *         or a colon — the terminators a path meets in prose, json, and stack frames
 */
const TEMP_REPO_DIR_SEGMENT = `[^/\\s'"):]*\\.rhachet-test[^/\\s'"):]*`;

/**
 * .what = the physical temp root, read once
 * .why = `getOneTempDirRoot()` runs `git rev-parse` and findserts the root on disk; the
 *        masker runs once per snapshot, so it is read lazily on first use, never at import
 * .note = the root is keyed on the git repo at process.cwd(), so the first read must come from
 *         a cwd inside this repo — else the cache would pin a foreign root for the whole worker
 *         and every later mask would silently miss. that first read fails fast instead
 * .note = deliberate mutation: a one-slot lazy cache, written once, in this module only
 */
const rootCache: { root: string | null } = { root: null };
const getTempRootOnce = (): string => {
  if (rootCache.root !== null) return rootCache.root;
  const cwd = process.cwd();
  if (!isCwdInsideRepoRoot({ cwd }))
    throw new ConstraintError(
      'the temp repo mask was first read from a cwd outside this repo',
      {
        cwd,
        repoRoot: TEST_REPO_ROOT,
        hint: 'mask a snapshot before the chdir, or chdir back first',
      },
    );
  rootCache.root = getOneTempDirRoot().pathPhysical;
  return rootCache.root;
};

/**
 * .what = the pattern of a temp test REPO path, as genTestTempRepo allocates it
 * .why = a temp test repo path varies per run (timestamp, run stamp, uuid) and per
 *        checkout (the root is keyed on the repo dirname), so a snapshot must mask
 *        it. the root is DERIVED from test-fns, never a literal — a literal goes
 *        stale the moment test-fns re-keys its root (ehmpathy/test-fns#66)
 *
 * .note = bounded to the `rhachet-test` slug, so a temp test repo keeps its own
 *         stable mask (`/TMP_REPO`) apart from any other genTempDir dir, which the
 *         generic `/TMP_TEST_DIR` mask in asSnapshotSafe owns
 * .note = a FRESH regex per call: a `g` regex carries `lastIndex`, so a shared one would
 *         make each caller's result depend on the last caller's use
 */
export const getTestTempRepoPathPattern = (): RegExp =>
  new RegExp(
    `${asRegexEscaped({ literal: getTempRootOnce() })}/${TEMP_REPO_DIR_SEGMENT}`,
    'g',
  );
