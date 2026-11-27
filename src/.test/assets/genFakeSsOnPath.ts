import { ConstraintError } from 'helpful-errors';
import { genTempDir } from 'test-fns';

import { existsSync, writeFileSync } from 'node:fs';
import { delimiter, join } from 'node:path';

/**
 * .what = the slug of the temp dir that holds a fake `ss`; it marks a swap as active
 */
const FAKE_SS_DIR_SLUG = 'fake-ss-on-path';

/**
 * .what = an inode no process on any host holds: the peer inode the `foreign` view shows
 * .why = above every inode a live box hands out, so the holder scan finds no one, exactly as it
 *   finds no one for a peer of another uid (whose fds a non-root reader cannot read)
 */
const FAKE_SS_FOREIGN_PEER_INODE = '4294967001';

/**
 * .what = the views a fake `ss` may show of the real `ss -x` table: the `sed` filter that rewrites
 *   it, and the bytes of filler rows appended after it
 * .why = one home for each rewrite, so a change in `ss` output is fixed in one place. each line
 *   of `ss -x` ends in its peer inode, so a view rewrites that last field
 *   - `whole` — the real table, untouched
 *   - `blind` — every peer inode shown as `0`: the peer end reads closed, so the lookup cannot
 *     name a peer at all
 *   - `foreign` — every peer inode rewritten to one no readable process holds: how a peer of
 *     another uid looks to a non-root reader, whose holder scan cannot read that peer's fds
 *   - `flooded` — the real table, then 70 MiB of filler socket rows: a host whose table outgrows
 *     the reader's buffer (`SS_TABLE_MAX_BYTES`, 64 MiB)
 */
const FAKE_SS_VIEWS = {
  whole: { sedFilter: null, floodBytes: 0 },
  blind: { sedFilter: 's/[0-9-][0-9]*[[:space:]]*$/0/', floodBytes: 0 },
  foreign: {
    sedFilter: `s/[0-9-][0-9]*[[:space:]]*$/${FAKE_SS_FOREIGN_PEER_INODE}/`,
    floodBytes: 0,
  },
  flooded: { sedFilter: null, floodBytes: 70 * 1024 * 1024 },
} as const satisfies Record<
  string,
  { sedFilter: string | null; floodBytes: number }
>;
export type FakeSsView = keyof typeof FAKE_SS_VIEWS;

/**
 * .what = one filler row a `flooded` view repeats; the shape of a real `ss -x` line whose local
 *   inode is 0, so it can never match our socket's line
 */
const FAKE_SS_FLOOD_ROW = 'u_str ESTAB 0 0 * 0 * 0';

/**
 * .what = the non-empty dirs of a PATH value, in order
 * .why = an empty PATH element means the current dir to a posix shell; it is never a search dir
 *   this fixture means to add or read
 */
const getAllPathDirs = (input: { path: string | undefined }): string[] =>
  (input.path ?? '').split(delimiter).filter((dir) => dir !== '');

/**
 * .what = the first file named `name` across `dirs`, as PATH would find it; null if absent
 */
const getOneFileOnPathDirs = (input: {
  dirs: string[];
  name: string;
}): string | null =>
  input.dirs
    .map((dir) => join(dir, input.name))
    .find((candidate) => existsSync(candidate)) ?? null;

/**
 * .what = the first dir whose name holds `slug`; null if none
 */
const getOneDirWithSlug = (input: {
  dirs: string[];
  slug: string;
}): string | null => input.dirs.find((dir) => dir.includes(input.slug)) ?? null;

/**
 * .what = the body of a fake `ss`: the real `ss` with every arg, its output piped through `sed`
 *   when a filter is given, with the sleep before the scan or between the scan and its print
 * .note = `after-scan` reads the table at once and prints it late: the snapshot a slow scan of a
 *   live peer would return, after that peer may already have gone
 */
const asFakeSsBody = (input: {
  delaySeconds: number;
  delayAt: 'before-scan' | 'after-scan';
  sedFilter: string | null;
  floodBytes: number;
  ssReal: string;
}): string => {
  const scanReal =
    input.sedFilter === null
      ? `"${input.ssReal}" "$@"`
      : `"${input.ssReal}" "$@" | sed -e '${input.sedFilter}'`;
  const scan =
    input.floodBytes > 0
      ? `{ ${scanReal}; yes '${FAKE_SS_FLOOD_ROW}' | head -c ${input.floodBytes}; }`
      : scanReal;
  const sleep = input.delaySeconds > 0 ? [`sleep ${input.delaySeconds}`] : [];
  if (input.delayAt === 'after-scan')
    return ['#!/bin/sh', `out=$(${scan})`, ...sleep, 'printf \'%s\\n\' "$out"', ''].join(
      '\n',
    );
  return ['#!/bin/sh', ...sleep, scan, ''].join('\n');
};

/**
 * .what = put `dir` first on `process.env.PATH`, ahead of `dirsAfter`; return the exact undo
 * .note = deliberate mutation of `process.env.PATH`. the restore is symmetric: a PATH that was
 *   unset before is deleted, never set to "undefined"
 */
const setPathDirFirst = (input: {
  dir: string;
  dirsAfter: string[];
  pathBefore: string | undefined;
}): { restore: () => void } => {
  process.env.PATH = [input.dir, ...input.dirsAfter].join(delimiter);
  const restore = (): void => {
    if (input.pathBefore === undefined) {
      delete process.env.PATH;
      return;
    }
    process.env.PATH = input.pathBefore;
  };
  return { restore };
};

/**
 * .what = put a fake `ss` first on `PATH`: it may sleep, then runs the real `ss` with every arg,
 *   and shows the real output through a named view
 * .why = the peer-cred lookup runs `ss -x`. a test of the lookup and the gates above it needs
 *   `ss` to be slow (a loaded box) or to show a peer the reader cannot name (a closed end, or
 *   another user's process). the real binary still answers; only its pace or its view changes.
 *   no mock
 * .note = one swap at a time. a second call while one is active fails fast: it would find the
 *   first fake as the "real" `ss`, stack the effects, and break the restore order
 * .note = a test that builds a scene around the swap takes genSceneWithFakeSsOnPath, which owns
 *   the restore on a setup fault and at teardown
 */
export const genFakeSsOnPath = (input: {
  delaySeconds: number;
  delayAt: 'before-scan' | 'after-scan';
  view: FakeSsView;
}): { restore: () => void } => {
  // refuse a delay `sleep` cannot take, so the shim never faults for an unrelated cause
  if (!Number.isFinite(input.delaySeconds) || input.delaySeconds < 0)
    throw new ConstraintError('delaySeconds must be zero or a positive number', {
      delaySeconds: input.delaySeconds,
      hint: 'pass the seconds the fake `ss` should sleep before it runs the real one, or 0',
    });

  // refuse a nested swap
  const pathBefore = process.env.PATH;
  const dirsSearched = getAllPathDirs({ path: pathBefore });
  const swapActive = getOneDirWithSlug({
    dirs: dirsSearched,
    slug: FAKE_SS_DIR_SLUG,
  });
  if (swapActive)
    throw new ConstraintError('a fake `ss` is already on PATH', {
      swapActive,
      hint: 'call restore() on the prior genFakeSsOnPath before you gen another',
    });

  // find the real `ss` before PATH is swapped
  const ssReal = getOneFileOnPathDirs({ dirs: dirsSearched, name: 'ss' });
  if (!ssReal)
    throw new ConstraintError('`ss` (iproute2) is required for this test', {
      dirsSearched,
      hint: 'install the iproute2 package with your host package manager, then rerun',
    });

  // write the fake, then put it first on PATH
  const binDir = genTempDir({ slug: FAKE_SS_DIR_SLUG });
  writeFileSync(
    join(binDir, 'ss'),
    asFakeSsBody({
      delaySeconds: input.delaySeconds,
      delayAt: input.delayAt,
      sedFilter: FAKE_SS_VIEWS[input.view].sedFilter,
      floodBytes: FAKE_SS_VIEWS[input.view].floodBytes,
      ssReal,
    }),
    { mode: 0o755 },
  );
  return setPathDirFirst({ dir: binDir, dirsAfter: dirsSearched, pathBefore });
};
