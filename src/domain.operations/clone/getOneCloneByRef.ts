import { ConstraintError } from 'helpful-errors';

import type { CloneOndisk } from '@src/domain.objects/CloneOndisk';
import { asActorOndiskHashFromDirName } from '@src/domain.operations/actor/enrolled/asActorOndiskHashFromDirName';
import { getActorOndiskDir } from '@src/domain.operations/actor/enrolled/getActorOndiskDir';
import { getActorsIndexDir } from '@src/domain.operations/actor/enrolled/getActorsIndexDir';
import { getActorsRootDir } from '@src/domain.operations/actor/enrolled/getActorsRootDir';
import { getOneRepoPath } from '@src/infra/host/getOneRepoPath';

import { readlinkSync } from 'node:fs';
import { join } from 'node:path';
import type { CloneRef } from './asCloneRef';
import { asCloneSerialFromDirName } from './asCloneSerialFromDirName';
import { getAllClonesGroupedByActor } from './getAllClonesGroupedByActor';
import { getCloneDir } from './getCloneDir';
import { getOneCloneHydrated } from './getOneCloneHydrated';

/**
 * .what = look up ONE clone by its address (`@:<slug|serial>`), hydrated — or
 *   null when no clone answers to it
 * .why =
 *   - the talk verbs reach a clone two ways: by SERIAL (the primary ref, unique
 *     across every actor) or by SLUG (the `--as` handle, held in the global
 *     `.slugs/` index). one lookup serves both, so `say`/`get` share a reach
 *   - BOTH read a global index (one readlink → owner clone dir): a serial off
 *     `.serials/<serial>`, a slug off `.slugs/<slug>`. the serial path keeps a
 *     scan as a fallback for an absent index entry; a slug has no scan (its index
 *     is the sole authority)
 *
 * .note = null when the address names no live-or-dead clone on disk — the caller
 *   (a `say`/`get`) turns that into a fail-loud with the reach hint, so an
 *   unknown address is never a silent no-op
 */
export const getOneCloneByRef = (input: {
  repoPath: string;
  ref: CloneRef;
}): CloneOndisk | null => {
  const repoPath = getOneRepoPath({ from: input.repoPath });
  const actorsRoot = getActorsRootDir({ repoPath });

  // by serial: the global `.serials/<serial>` index points straight to the owner
  // clone (one readlink). a serial is the primary ref, so this is the hot reach
  // path (say/get/whoami); the index keeps it O(1) instead of a full-actor scan
  if (input.ref.by === 'serial') {
    const serialLink = join(
      getActorsIndexDir({ actorsRoot, index: 'serials' }),
      input.ref.serial,
    );
    const hydrated = getOneCloneByIndexLink({
      linkPath: serialLink,
      actorsRoot,
      repoPath,
    });
    // a HIT lands O(1); a MISS (an absent index entry — a pre-index clone, or a
    // crash between the dir rename and the index write) falls back to the scan, so
    // the lookup stays correct even when the index has a hole
    if (hydrated !== 'no-index') return hydrated;

    const { serial } = input.ref;
    const groups = getAllClonesGroupedByActor({ repoPath });
    for (const group of groups) {
      const found = group.clones.find((c) => c.serial === serial);
      if (found) return found;
    }
    return null;
  }

  // by slug: the global `.slugs/<slug>` index points straight to the owner clone
  const slugLink = join(
    getActorsIndexDir({ actorsRoot, index: 'slugs' }),
    input.ref.slug,
  );
  const hydrated = getOneCloneByIndexLink({
    linkPath: slugLink,
    actorsRoot,
    repoPath,
  });
  // a NAMED slug always wins — checked first, so a real-word all-hex slug (`@:beef`,
  // `@:cafe`) is never shadowed by the serial-prefix fallback below
  if (hydrated !== 'no-index') return hydrated;

  // a slug MISS whose body is a hex prefix may be an ABBREVIATED SERIAL — the human
  // form `clone list` shows (asCloneSerialHuman, e.g. `@:49b41f88`). git-style: only
  // after the named slug misses do we try a serial-prefix match, so the short address
  // a human copies off the list stays reachable without a full 36-char uuid
  const { slug } = input.ref;
  if (/^[0-9a-f]{4,}$/i.test(slug))
    return getOneCloneBySerialPrefix({ prefix: slug, repoPath });

  // an absent slug index + a non-hex body = no clone answers to it
  return null;
};

/**
 * .what = match ONE clone whose full serial starts with a hex prefix — the reach twin
 *   of the abbreviated `asCloneSerialHuman` shown in `clone list`
 * .why =
 *   - the list shows a short serial for ergonomics; a caller must be able to type that
 *     short form back. this scans every clone and prefix-matches the de-hyphenated serial
 *   - git-style ambiguity: a prefix that hits MORE THAN ONE clone fails LOUD with the
 *     candidates named + a "use a longer prefix" fix — never a silent wrong-clone (the
 *     lossy-abbreviation safety valve asCloneSerialHuman promises)
 * .note = returns null on no match (the caller turns it into the unknown-address fail);
 *   throws ConstraintError only on an ambiguous prefix
 */
const getOneCloneBySerialPrefix = (input: {
  prefix: string;
  repoPath: string;
}): CloneOndisk | null => {
  const prefix = input.prefix.toLowerCase();
  const matches = getAllClonesGroupedByActor({ repoPath: input.repoPath })
    .flatMap((group) => group.clones)
    .filter((clone) => clone.serial.replace(/-/g, '').startsWith(prefix));

  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0]!;

  throw new ConstraintError(
    `'@:${input.prefix}' matches ${matches.length} clones — the abbreviated serial is ambiguous`,
    {
      hint: `use a longer serial prefix; candidates: ${matches
        .map((clone) => `@:${clone.serial}`)
        .join(', ')}`,
    },
  );
};

/**
 * .what = read one index symlink (`.serials/<serial>` or `.slugs/<slug>`) to a
 *   hydrated clone — or a typed `'no-index'` when the link is absent, or null when
 *   the link target is unreadable
 * .why = both index paths (serial + slug) do the SAME readlink → parse target →
 *   compose the canonical dir → hydrate. one owner keeps the read identical, and
 *   tells "the index has no entry" (a caller may fall back) apart from "the link
 *   target is malformed" (a null, never a scan)
 */
const getOneCloneByIndexLink = (input: {
  linkPath: string;
  actorsRoot: string;
  repoPath: string;
}): CloneOndisk | null | 'no-index' => {
  // .note = deliberate mutation — `target` is assigned once inside the try (a
  //         readlink that may throw ENOENT); bounded to this scope, never escapes
  let target: string;
  try {
    target = readlinkSync(input.linkPath);
  } catch (error) {
    // .code is realm-safe (an own property); `instanceof Error` is not, in jest
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') return 'no-index';
    throw error;
  }

  // read the owner actor + serial out of the index target, then hydrate the dir —
  // the SAME paired parse-direction transformers the enumerators use, so the
  // dir-name format is single-owned whether it is built, listed, or parsed here
  const actorHash = asActorOndiskHashFromDirName({ dirName: target });
  const serial = asCloneSerialFromDirName({ dirName: target });
  if (actorHash === null || serial === null) return null;

  // compose the canonical builders so the dir-name format is single-owned — the
  // actor dir off { repoPath, hash }, then the clone dir off { actorDir, serial }
  const cloneDir = getCloneDir({
    actorDir: getActorOndiskDir({
      repoPath: input.repoPath,
      hash: actorHash,
    }),
    serial,
  });
  return getOneCloneHydrated({
    cloneDir,
    actorsRoot: input.actorsRoot,
    repoPath: input.repoPath,
    actorHash,
  });
};
