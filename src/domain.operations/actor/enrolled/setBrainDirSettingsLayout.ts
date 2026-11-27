import { ConstraintError } from 'helpful-errors';

import {
  CLAUDE_KEYBINDINGS_FILENAMES,
  CLAUDE_SETTINGS_FILENAMES,
} from '@src/domain.operations/brains/claudeCodeSettings';
import { withRepoMutex } from '@src/infra/lock/withRepoMutex';
import { setFileAtomic } from '@src/infra/setFileAtomic';
import { setSymlinkSwapped } from '@src/infra/setSymlinkSwapped';

import {
  accessSync,
  constants,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readlinkSync,
  rmSync,
  statSync,
} from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * .what = one change the layout findsert made to a brain dir
 * .note = callers name it via `Awaited<ReturnType<typeof setBrainDirSettingsLayout>>`, so
 *   the type stays private to this file
 */
type BrainDirSettingsLayoutEffect =
  | { kind: 'LINKED'; name: string; target: string }
  | {
      kind: 'UNLINKED';
      name: string;
      reason: BrainDirSettingsLayoutUnlinkReason;
    };

/**
 * .what = why the layout removed one of its own entries
 * .note = one union, read by each removal leaf, so a new reason is added in one place
 */
type BrainDirSettingsLayoutUnlinkReason =
  | 'grove absent'
  | 'keybindings absent'
  | 'keybindings unreadable';

/**
 * .what = findsert the settings layout of one brain dir:
 *         `settings.json -> settings.of.grove.json -> .home/.claude/settings.json -> ~/.claude/settings.json`,
 *         `settings.of.repo.json` as the one real file, and, while the home holds one,
 *         `keybindings.json -> .home/.claude/keybindings.json -> ~/.claude/keybindings.json`
 * .note = only `.home/.claude/settings.json` names this box; the arrows before it are relative,
 *   so they hold the same bytes on every box and stay tracked (#779)
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
 * .note = a box with no grove (`~/.claude/settings.json` absent) drops only the home link. the
 *   tracked arrows stay, so git stays clean, and the chain ends inside the brain dir, so no
 *   write through it can create the human's home settings
 * .note = the keybindings arrows are laid only while the home file is a file. claude reads
 *   keybindings from its config dir, so a clone sees the human's keys only through them
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
 * .note = `grove` and `keybindings` ride out so a caller can say a box has no grove (vision
 *   case=4), or holds a keybindings file it cannot read, without a second probe of the home dir
 */
type BrainDirSettingsLayout = {
  effects: BrainDirSettingsLayoutEffect[];
  grove: { source: string; isPresent: boolean };
  keybindings: { source: string; state: KeybindingsSourceState };
};

/**
 * .what = what the home holds at the keybindings name
 */
type KeybindingsSourceState = 'file' | 'absent' | 'unreadable';

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
  const pathHome = join(brainDir, CLAUDE_SETTINGS_FILENAMES.home);
  const groveSource = join(
    input.home,
    '.claude',
    CLAUDE_SETTINGS_FILENAMES.claude,
  );
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

  // the keybindings source is read before any mutation, so an unexpected fault throws with the
  //   layout untouched
  //
  // .note = the read and the lay are not atomic: a home file that vanishes between them leaves a
  //   dead arrow, which the next findsert removes. claude reads a dead arrow as absent
  const keybindingsSource = join(
    input.home,
    '.claude',
    CLAUDE_KEYBINDINGS_FILENAMES.claude,
  );
  const keybindingsSourceState = getOneKeybindingsSourceState({
    source: keybindingsSource,
  });

  // no second answer lingers: drop each fork copy an earlier layout left behind
  delForkedSettingsCopies({ brainDir });

  // the one real file is always present, so a role init or a hook sync always finds it
  if (!statRepo) setFileAtomic({ path: pathRepo, content: '{}\n' });

  // the home link: the one name that holds this box's home path, so it stays out of git.
  //   a box with no grove drops it, so the chain ends inside the brain dir and no write
  //   through it can create the human's home settings
  mkdirSync(dirname(pathHome), { recursive: true });
  const effectsHome = isGrovePresent
    ? setArrow({
        name: CLAUDE_SETTINGS_FILENAMES.home,
        path: pathHome,
        target: groveSource,
      })
    : delEntryIfPresent({
        name: CLAUDE_SETTINGS_FILENAMES.home,
        path: pathHome,
        reason: 'grove absent',
      });

  // the grove arrows: our clear name to the home link (relative, so its bytes match on every
  //   box, grove or not), claude's fixed name to ours. both are tracked, so both stay put
  return {
    grove,
    keybindings: { source: keybindingsSource, state: keybindingsSourceState },
    effects: [
      ...effectsHome,
      ...setArrow({
        name: CLAUDE_SETTINGS_FILENAMES.grove,
        path: pathGrove,
        target: CLAUDE_SETTINGS_FILENAMES.home,
      }),
      ...setArrow({
        name: CLAUDE_SETTINGS_FILENAMES.claude,
        path: pathClaude,
        target: CLAUDE_SETTINGS_FILENAMES.grove,
      }),
      ...setKeybindingsArrows({
        brainDir,
        source: keybindingsSource,
        sourceState: keybindingsSourceState,
      }),
    ],
  };
};

/**
 * .what = what the home holds at the keybindings name, read through links
 * .why = the arrows aim only at a readable file. an absent entry, a dead link, or a file parent
 *        reads as `absent` (statSync folds ENOENT and ENOTDIR into absence). a link loop or a
 *        denied read reads as `unreadable`: a bare claude on that box logs the fault and runs on
 *        defaults, so enroll does the same and never fails over an optional file
 * .note = `stat` needs no read permission on the file itself, so a file this process cannot read
 *   (mode 000, or one a `sudo claude` left root-owned) stats as a file. the read check after it
 *   catches that case, as EACCES
 * .note = any other fault is rethrown; it names no state of the human's file
 */
const getOneKeybindingsSourceState = (input: {
  source: string;
}): KeybindingsSourceState => {
  try {
    const stat = statSync(input.source, { throwIfNoEntry: false });
    if (!stat?.isFile()) return 'absent';
    accessSync(input.source, constants.R_OK);
    return 'file';
  } catch (error) {
    // the errno is read by shape, never by `instanceof Error`: a node fs error may come from
    //   another realm (a jest vm), where that check is false
    if (typeof error !== 'object' || error === null) throw error;
    const errno = 'code' in error ? error.code : null;
    if (errno !== 'ELOOP' && errno !== 'EACCES' && errno !== 'EPERM')
      throw error;
    return 'unreadable';
  }
};

/**
 * .what = findsert the keybindings arrows: `keybindings.json -> .home/.claude/keybindings.json`
 *         (relative) and `.home/.claude/keybindings.json -> ~/.claude/keybindings.json`
 * .why = claude reads `keybindings.json` from its config dir, and a clone spawns with this brain
 *        dir as that dir, so without the arrows a clone shows keys the human rebound or unbound
 * .note = laid only while the home file is a readable file (`getOneKeybindingsSourceState`: a dead
 *   link or a dir reads as absent, a link loop or a denied read as unreadable). no arrow is laid
 *   at an absent file, so a write through one at lay time cannot create the human's home file
 * .note = with no readable source file, only rhachet's own entries go: the home name sits in
 *   `.home/`, which the layout owns, so its entry is removed whole; at the top name only our arrow
 *   is removed, and a file or arrow a hand left there stays
 */
const setKeybindingsArrows = (input: {
  brainDir: string;
  source: string;
  sourceState: 'file' | 'absent' | 'unreadable';
}): BrainDirSettingsLayoutEffect[] => {
  const pathTop = join(input.brainDir, CLAUDE_KEYBINDINGS_FILENAMES.claude);
  const pathHome = join(input.brainDir, CLAUDE_KEYBINDINGS_FILENAMES.home);

  // a source file: the home name aims at it, the top name aims at the home name
  if (input.sourceState === 'file') {
    mkdirSync(dirname(pathHome), { recursive: true });
    return [
      ...setArrow({
        name: CLAUDE_KEYBINDINGS_FILENAMES.home,
        path: pathHome,
        target: input.source,
      }),
      ...setArrow({
        name: CLAUDE_KEYBINDINGS_FILENAMES.claude,
        path: pathTop,
        target: CLAUDE_KEYBINDINGS_FILENAMES.home,
      }),
    ];
  }

  // no readable source file: drop rhachet's own entries, never one a hand left at the top name
  const reason =
    input.sourceState === 'unreadable'
      ? 'keybindings unreadable'
      : 'keybindings absent';
  return [
    ...delEntryIfPresent({
      name: CLAUDE_KEYBINDINGS_FILENAMES.home,
      path: pathHome,
      reason,
    }),
    ...delArrowIfOurs({
      name: CLAUDE_KEYBINDINGS_FILENAMES.claude,
      path: pathTop,
      target: CLAUDE_KEYBINDINGS_FILENAMES.home,
      reason,
    }),
  ];
};

/**
 * .what = remove an arrow only if it is ours: a symlink whose target is the one we lay
 * .why = a top-level name outside `.home/` may hold a file a hand put there; only our own arrow is
 *        ours to retire
 * .note = a real file, a dir, or an arrow aimed elsewhere is not rhachet's, so it stays
 */
const delArrowIfOurs = (input: {
  name: string;
  path: string;
  target: string;
  reason: BrainDirSettingsLayoutUnlinkReason;
}): BrainDirSettingsLayoutEffect[] => {
  const stat = lstatSync(input.path, { throwIfNoEntry: false });
  if (!stat?.isSymbolicLink()) return [];
  if (readlinkSync(input.path) !== input.target) return [];
  rmSync(input.path, { force: true });
  return [{ kind: 'UNLINKED', name: input.name, reason: input.reason }];
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
 * .what = remove whatever holds one name under `.home/` — an arrow, a real file, or a dir
 * .why = `.home/` is the layout's own namespace, so with no source the name it would aim from goes
 * .note = an UNLINKED effect only when an arrow was removed: a real file at a home name with no
 *   source is a write that landed there, dropped without a row
 */
const delEntryIfPresent = (input: {
  name: string;
  path: string;
  reason: BrainDirSettingsLayoutUnlinkReason;
}): BrainDirSettingsLayoutEffect[] => {
  const stat = lstatSync(input.path, { throwIfNoEntry: false });
  if (!stat) return [];
  rmSync(input.path, { recursive: true, force: true });
  if (!stat.isSymbolicLink()) return [];
  return [{ kind: 'UNLINKED', name: input.name, reason: input.reason }];
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
