import { ConstraintError } from 'helpful-errors';

import { CLAUDE_SETTINGS_FILENAMES } from '@src/domain.operations/brains/claudeCodeSettings';
import { setFileAtomic } from '@src/infra/setFileAtomic';
import { setSymlinkSwapped } from '@src/infra/setSymlinkSwapped';

import {
  lstatSync,
  readdirSync,
  readlinkSync,
  rmSync,
  type Stats,
  statSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import { assertBrainDirInsideRepo } from './assertBrainDirInsideRepo';

/**
 * .what = one change the layout findsert made to a brain dir
 */
type BrainDirSettingsLayoutEffect =
  | { kind: 'LINKED'; name: string; target: string }
  | { kind: 'UNLINKED'; name: string; reason: 'grove absent' };

/**
 * .what = the layout findsert of one brain dir, for a caller that already holds its
 *   `settings.of.repo.json` mutex (`setBrainDirSettingsLayout` and the settings shield)
 * .why = the mutex is not reentrant, so a caller that holds it across a wider span runs the
 *   findsert in this form; the layout rules themselves are documented on
 *   `setBrainDirSettingsLayout`
 *
 * .note = rhachet never writes outside the repo: the guard runs here, at the leaf that writes,
 *   so every caller is safe by construction
 * .note = preconditions — the caller holds the mutex, and the brain dir exists (both callers
 *   create it before they take the mutex)
 * .note = the grove counts as present only where `~/.claude/settings.json` is a file; a dir
 *   there is no settings file to point at
 */
export const setBrainDirSettingsLayoutWithinLock = (input: {
  repoPath: string;
  brainDir: string;
  home: string;
}): {
  effects: BrainDirSettingsLayoutEffect[];
  grove: { source: string; isPresent: boolean };
} => {
  assertBrainDirInsideRepo(input);
  const { brainDir } = input;
  const pathGrove = join(brainDir, CLAUDE_SETTINGS_FILENAMES.grove);
  const pathClaude = join(brainDir, CLAUDE_SETTINGS_FILENAMES.claude);
  const groveSource = join(input.home, '.claude', 'settings.json');
  const isGrovePresent = !!statSync(groveSource, {
    throwIfNoEntry: false,
  })?.isFile();
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
        found: asEntryFoundText({ stat: statRepo, path: pathRepo }),
        hint: `rhachet derives it from the roles, so remove ${relative(input.repoPath, pathRepo)}, then rerun \`rhx init --hooks\``,
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
 * .what = what holds a name that must be a real file: the link target, a dir, or "not a file"
 * .note = the guard clauses name the two shapes a human meets; "not a file" covers the rest
 *   (a socket, a fifo, a device)
 */
const asEntryFoundText = (input: { stat: Stats; path: string }): string => {
  if (input.stat.isSymbolicLink())
    return `a symlink to ${readlinkSync(input.path)}`;
  if (input.stat.isDirectory()) return 'a dir';
  return 'not a file';
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
