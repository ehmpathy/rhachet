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
  readFileSync,
  readlinkSync,
  rmSync,
} from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * .what = one change the layout findsert made to a brain dir
 * .note = callers name it via `BrainDirSettingsLayout['effects']`
 */
type BrainDirSettingsLayoutEffect =
  | { kind: 'LINKED'; name: string; target: string }
  | { kind: 'REPLACED'; name: string; target: string }
  | { kind: 'REMOVED'; name: string; reason: 'grove absent' }
  | { kind: 'UNLINKED'; name: string; reason: 'grove absent' };

/**
 * .what = findsert the settings layout of one brain dir:
 *         `.home/.claude/settings.json -> ~/.claude/settings.json` (untracked, machine-local),
 *         `settings.of.grove.json -> .home/.claude/settings.json`, `settings.json -> settings.of.grove.json`,
 *         `settings.local.json -> settings.of.repo.json`, and `settings.of.repo.json` as the one real file
 * .note = every tracked arrow has a relative target, so the tracked brain dir names no home path
 *   and reads the same on every box. only the untracked `.home` mirror holds the absolute one
 * .why = one layout for every actor (define.brain-dir-layout-is-one-for-every-actor). claude
 *        reads `settings.json` as its user layer, so that name must be the grove; an enrolled
 *        clone reads the repo's settings via `--settings settings.of.repo.json`, and a plain
 *        `claude` at the repo root reads them via its local layer, `settings.local.json`
 *        (define.invariant.brain-config-grove-vs-repo)
 *
 * .note = the local arrow does not depend on the grove: its target is always present
 * .note = a real file replaced by an arrow is reported REPLACED, and a real file dropped in a
 *   grove-less box is reported REMOVED, so its loss is never silent on any box
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
export type BrainDirSettingsLayout = {
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
  const pathGroveHome = join(brainDir, CLAUDE_SETTINGS_FILENAMES.groveHome);
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

  // the `.home` mirror's dirs must be real dirs: through a link (say `.home -> ~`) the mirror
  //   leaf IS the human's home settings, and an arrow swapped in over it would destroy them.
  //   refuse before any mutation, as above
  for (const pathMirrorDir of [
    dirname(dirname(pathGroveHome)),
    dirname(pathGroveHome),
  ]) {
    const statMirrorDir = lstatSync(pathMirrorDir, { throwIfNoEntry: false });
    if (statMirrorDir && !statMirrorDir.isDirectory())
      throw new ConstraintError('the .home mirror must hold real dirs', {
        path: pathMirrorDir,
        found: statMirrorDir.isSymbolicLink()
          ? `a symlink to ${readlinkSync(pathMirrorDir)}`
          : 'not a dir',
        hint: `remove ${pathMirrorDir} (never its target), then rerun \`rhx init\`; rhachet makes the mirror itself`,
      });
  }

  // no second answer lingers: drop each fork copy an earlier layout left behind
  delForkedSettingsCopies({ brainDir });

  // the one real file is always present, so a role init or a hook sync always finds it
  if (!statRepo) setFileAtomic({ path: pathRepo, content: '{}\n' });

  // the local arrow: a plain `claude` at the repo root reads the repo's settings through it
  const effectsLocal = setArrow({
    name: CLAUDE_SETTINGS_FILENAMES.local,
    path: join(brainDir, CLAUDE_SETTINGS_FILENAMES.local),
    target: CLAUDE_SETTINGS_FILENAMES.repo,
  });

  // a box with no grove: drop both grove names, so no arrow points at an absent file
  if (!isGrovePresent)
    return {
      grove,
      effects: [
        ...effectsLocal,
        ...delEntryIfPresent({
          name: CLAUDE_SETTINGS_FILENAMES.claude,
          path: pathClaude,
        }),
        ...delEntryIfPresent({
          name: CLAUDE_SETTINGS_FILENAMES.grove,
          path: pathGrove,
        }),
        ...delEntryIfPresent({
          name: CLAUDE_SETTINGS_FILENAMES.groveHome,
          path: pathGroveHome,
        }),
      ],
    };

  // the mirror ignores itself before its leaf exists, so the absolute home path is never
  //   tracked — on every entry command, and even when a later step of the run faults
  mkdirSync(dirname(pathGroveHome), { recursive: true });
  setMirrorGitignore({ pathMirrorRoot: dirname(dirname(pathGroveHome)) });

  // the grove arrows, home side first so none ever dangles: the untracked `.home` mirror to
  //   the home file, our tracked clear name to the mirror, claude's fixed name to ours
  return {
    grove,
    effects: [
      ...setArrow({
        name: CLAUDE_SETTINGS_FILENAMES.groveHome,
        path: pathGroveHome,
        target: groveSource,
      }),
      ...setArrow({
        name: CLAUDE_SETTINGS_FILENAMES.grove,
        path: pathGrove,
        target: CLAUDE_SETTINGS_FILENAMES.groveHome,
      }),
      ...setArrow({
        name: CLAUDE_SETTINGS_FILENAMES.claude,
        path: pathClaude,
        target: CLAUDE_SETTINGS_FILENAMES.grove,
      }),
      ...effectsLocal,
    ],
  };
};

/**
 * .what = the `.gitignore` the `.home` mirror holds: it ignores the whole mirror, itself included
 */
const MIRROR_GITIGNORE_CONTENT = '*\n';

/**
 * .what = findsert the `.home` mirror's own `.gitignore`
 * .why = the mirror's leaf is an absolute home path. the brain dir's `.gitignore` also ignores
 *   it, but that file is written by a later step (`setRepoActorBrainDir`), which `rhx roles init`
 *   never runs and a fault can skip. the mirror ignores itself, so no entry command can stage it
 */
const setMirrorGitignore = (input: { pathMirrorRoot: string }): void => {
  const path = join(input.pathMirrorRoot, '.gitignore');
  const stat = lstatSync(path, { throwIfNoEntry: false });
  if (stat?.isFile() && readFileSync(path, 'utf8') === MIRROR_GITIGNORE_CONTENT)
    return;
  if (stat && !stat.isFile()) rmSync(path, { recursive: true, force: true });
  setFileAtomic({ path, content: MIRROR_GITIGNORE_CONTENT });
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
 * .note = UNLINKED when an arrow was removed; REMOVED when a real file was — its content is
 *   gone, so it is reported just as a REPLACED file is on a box with a grove
 */
const delEntryIfPresent = (input: {
  name: string;
  path: string;
}): BrainDirSettingsLayoutEffect[] => {
  const stat = lstatSync(input.path, { throwIfNoEntry: false });
  if (!stat) return [];
  rmSync(input.path, { recursive: true, force: true });
  const kind = stat.isSymbolicLink() ? 'UNLINKED' : 'REMOVED';
  return [{ kind, name: input.name, reason: 'grove absent' }];
};

/**
 * .what = findsert one symlink; a real file in its place is replaced, never kept
 * .note = a file or another arrow is swapped in one `rename(2)` (`setSymlinkSwapped`), so a
 *   concurrent reader meets either the old entry or the new arrow, never ENOENT. a dir cannot
 *   be renamed over, so it is removed first
 * .note = REPLACED when a real file or dir held the name, LINKED when the name was absent or
 *   held another arrow
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
  const kind = stat && !stat.isSymbolicLink() ? 'REPLACED' : 'LINKED';
  return [{ kind, name: input.name, target: input.target }];
};
