import { ConstraintError } from 'helpful-errors';

import { CLAUDE_SETTINGS_FILENAMES } from '@src/domain.operations/brains/claudeCodeSettings';
import { withRepoMutex } from '@src/infra/lock/withRepoMutex';
import { setFileAtomic } from '@src/infra/setFileAtomic';
import { setSymlinkSwapped } from '@src/infra/setSymlinkSwapped';

import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readlinkSync,
  rmSync,
} from 'node:fs';
import { join } from 'node:path';

/**
 * .what = one change the layout findsert made to a brain dir
 * .note = callers name it via `Awaited<ReturnType<typeof setBrainDirSettingsLayout>>`, so
 *   the type stays private to this file
 */
type BrainDirSettingsLayoutEffect =
  | { kind: 'LINKED'; name: string; target: string }
  | { kind: 'UNLINKED'; name: string; reason: 'grove absent' };

/**
 * .what = findsert the settings layout of one brain dir:
 *         `settings.of.grove.json -> ~/.claude/settings.json`, `settings.json -> settings.of.grove.json`,
 *         and `settings.of.repo.json` as the one real file
 * .why = one layout for every actor (define.brain-dir-layout-is-one-for-every-actor). claude
 *        reads `settings.json` as its user layer, so that name must be the grove; the repo's
 *        settings ride `--settings settings.of.repo.json`, which outranks the grove
 *
 * .note = one answer, and it is rhachet's (wisher, 2026-10-07): a real file where an arrow
 *   belongs — a role init's temp + rename over `settings.json`, a `/model` or `/config` in a
 *   clone over `settings.of.grove.json` — is replaced by the arrow. it is neither merged into
 *   `settings.of.repo.json` nor kept aside; `settings.of.repo.json` is derived from the roles alone
 * .note = a `settings.forked.*.json` or `settings.grove.forked.*.json` left by an earlier
 *   layout is removed, so no second answer lingers in the dir
 * .note = `settings.of.repo.json` is always findserted: `{}` when absent, an extant file never
 *   touched. a role init (e.g. a permission hook) and the hook sync each write into it, so
 *   neither needs to create it. a symlink or a dir at that name is refused, before any change
 *   (`inventory.of=requirements.case=8`)
 * .note = a box with no grove (`~/.claude/settings.json` absent) drops both grove names, so
 *   no arrow to an absent file can let a write create the human's home settings
 * .note = idempotent: a dir already in the layout yields no effect
 * .note = the whole findsert holds the brain dir's `settings.of.repo.json` mutex, so a peer
 *   `rhx` process (an `enroll` beside an `init`, or two `init`s) never interleaves with it.
 *   the settings shield holds the same mutex across its span, so it calls
 *   `setBrainDirSettingsLayoutWithinLock` — the mutex is not reentrant
 */
export const setBrainDirSettingsLayout = async (input: {
  repoPath: string;
  brainDir: string;
  home: string;
}): Promise<BrainDirSettingsLayout> => {
  mkdirSync(input.brainDir, { recursive: true });
  return withRepoMutex(
    {
      repoPath: input.repoPath,
      path: join(input.brainDir, CLAUDE_SETTINGS_FILENAMES.repo),
    },
    async () => setBrainDirSettingsLayoutWithinLock(input),
  );
};

/**
 * .what = what the layout findsert did, and which grove it found
 * .note = `grove` rides out so a caller can say a box has no grove (vision case=4) without
 *   a second probe of the home dir
 */
type BrainDirSettingsLayout = {
  effects: BrainDirSettingsLayoutEffect[];
  grove: { source: string; isPresent: boolean };
};

/**
 * .what = the layout findsert itself; the caller holds the brain dir's `settings.of.repo.json` mutex
 */
export const setBrainDirSettingsLayoutWithinLock = (input: {
  brainDir: string;
  home: string;
}): BrainDirSettingsLayout => {
  const { brainDir } = input;
  const pathGrove = join(brainDir, CLAUDE_SETTINGS_FILENAMES.grove);
  const pathClaude = join(brainDir, CLAUDE_SETTINGS_FILENAMES.claude);
  const groveSource = join(input.home, '.claude', 'settings.json');
  const isGrovePresent = existsSync(groveSource);
  const grove = { source: groveSource, isPresent: isGrovePresent };

  // the one real file must be a file: refuse before any mutation, since a write through an
  //   arrow would land wherever it points
  const pathRepo = join(brainDir, CLAUDE_SETTINGS_FILENAMES.repo);
  const statRepo = lstatSync(pathRepo, { throwIfNoEntry: false });
  if (statRepo && !statRepo.isFile())
    throw new ConstraintError(
      `${CLAUDE_SETTINGS_FILENAMES.repo} must be a real file`,
      {
        path: pathRepo,
        found: statRepo.isSymbolicLink()
          ? `a symlink to ${readlinkSync(pathRepo)}`
          : 'not a file',
        hint: `remove ${pathRepo}, then rerun \`rhx init\`; rhachet derives it from the roles`,
      },
    );

  // no second answer lingers: drop each fork copy an earlier layout left behind
  delForkedSettingsCopies({ brainDir });

  // the one real file is always present, so a role init or a hook sync always finds it
  if (!statRepo) setFileAtomic({ path: pathRepo, content: '{}\n' });

  // a box with no grove: drop both grove names, so no arrow points at an absent file
  if (!isGrovePresent)
    return {
      grove,
      effects: [
        ...delEntryIfPresent({
          name: CLAUDE_SETTINGS_FILENAMES.claude,
          path: pathClaude,
        }),
        ...delEntryIfPresent({
          name: CLAUDE_SETTINGS_FILENAMES.grove,
          path: pathGrove,
        }),
      ],
    };

  // the grove arrows: our clear name to the home file, claude's fixed name to ours
  return {
    grove,
    effects: [
      ...setArrow({
        name: CLAUDE_SETTINGS_FILENAMES.grove,
        path: pathGrove,
        target: groveSource,
      }),
      ...setArrow({
        name: CLAUDE_SETTINGS_FILENAMES.claude,
        path: pathClaude,
        target: CLAUDE_SETTINGS_FILENAMES.grove,
      }),
    ],
  };
};

/**
 * .what = the names an earlier layout used to keep a replaced settings file aside
 * .note = `settings.forked.<iso>.json` and `settings.grove.forked.<iso>.json`, with an
 *   optional random suffix before `.json`
 */
const FORKED_SETTINGS_COPY_PATTERN = /^settings(\.grove)?\.forked\..+\.json$/;

/**
 * .what = remove each fork copy an earlier layout kept aside in this brain dir
 */
const delForkedSettingsCopies = (input: { brainDir: string }): void => {
  for (const name of readdirSync(input.brainDir)) {
    if (!FORKED_SETTINGS_COPY_PATTERN.test(name)) continue;
    rmSync(join(input.brainDir, name), { recursive: true, force: true });
  }
};

/**
 * .what = remove whatever holds one name — an arrow or a real file
 * .note = an UNLINKED effect only when an arrow was removed: a real file in a grove-less box
 *   is a second answer, dropped without a row
 */
const delEntryIfPresent = (input: {
  name: string;
  path: string;
}): BrainDirSettingsLayoutEffect[] => {
  const stat = lstatSync(input.path, { throwIfNoEntry: false });
  if (!stat) return [];
  rmSync(input.path, { recursive: true, force: true });
  if (!stat.isSymbolicLink()) return [];
  return [{ kind: 'UNLINKED', name: input.name, reason: 'grove absent' }];
};

/**
 * .what = findsert one symlink; a real file in its place is replaced, never kept
 * .note = a file or another arrow is swapped in one `rename(2)` (`setSymlinkSwapped`), so a
 *   concurrent reader meets either the old entry or the new arrow, never ENOENT. a dir cannot
 *   be renamed over, so it is removed first
 */
const setArrow = (input: {
  name: string;
  path: string;
  target: string;
}): BrainDirSettingsLayoutEffect[] => {
  const stat = lstatSync(input.path, { throwIfNoEntry: false });
  if (stat?.isSymbolicLink() && readlinkSync(input.path) === input.target)
    return [];
  if (stat?.isDirectory()) rmSync(input.path, { recursive: true, force: true });
  setSymlinkSwapped({ path: input.path, target: input.target });
  return [{ kind: 'LINKED', name: input.name, target: input.target }];
};
