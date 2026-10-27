import * as fs from 'fs/promises';
import { ConstraintError } from 'helpful-errors';
import * as path from 'path';

import { randomBytes } from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import { CLAUDE_SETTINGS_FILENAMES } from './constants';

/**
 * .what = claude code settings shape for hooks section
 * .why = typed representation of the brain dir's settings.of.repo.json hooks structure
 */
export interface ClaudeCodeHookEntry {
  matcher: string;
  hooks: Array<{
    type: string;
    command: string;
    timeout?: number;
    author?: string;
  }>;
}

export interface ClaudeCodeSettings {
  hooks?: {
    SessionStart?: ClaudeCodeHookEntry[];
    PreCompact?: ClaudeCodeHookEntry[];
    PostCompact?: ClaudeCodeHookEntry[];
    PreToolUse?: ClaudeCodeHookEntry[];
    PostToolUse?: ClaudeCodeHookEntry[];
    Stop?: ClaudeCodeHookEntry[];
    UserPromptSubmit?: ClaudeCodeHookEntry[];
  };
  [key: string]: unknown;
}

/**
 * .what = reads the settings.of.repo.json of the brain dir at `<from>/.claude`
 * .why = enables hook discovery and modification
 *
 * .note = `from` is the dir that HOLDS `.claude` — a repo, or an actor's `brain/` dir — never the
 *   brain dir itself
 * .note = a legacy brain dir holds its repo settings in a real `settings.json`; while no
 *   `settings.of.repo.json` exists yet, that file is read instead, so a sync before the layout
 *   migration loses no key. a `settings.json` symlink is never read here — it is the grove
 */
export const readClaudeCodeSettings = async (input: {
  from: string;
}): Promise<ClaudeCodeSettings> => {
  const settingsDir = path.join(input.from, '.claude');
  const settingsPath = path.join(settingsDir, CLAUDE_SETTINGS_FILENAMES.repo);
  const legacyPath = path.join(settingsDir, CLAUDE_SETTINGS_FILENAMES.claude);

  // the current source: settings.of.repo.json
  const content = await readFileOrNullIfAbsent({ path: settingsPath });
  if (content !== null)
    return asClaudeCodeSettingsParsed({ content, path: settingsPath });

  // the legacy source: a real settings.json (never a symlink)
  const legacyContent = await readRealFileOrNull({ path: legacyPath });
  if (legacyContent === null) return {};
  return asClaudeCodeSettingsParsed({
    content: legacyContent,
    path: legacyPath,
  });
};

/**
 * .what = parse a settings file's content, or fail loud with the file and the fix
 * .why = a bare SyntaxError names no file, so a human cannot tell which one to repair
 * .note = only a SyntaxError is the human's to fix; any other fault surfaces as it is
 */
const asClaudeCodeSettingsParsed = (input: {
  content: string;
  path: string;
}): ClaudeCodeSettings => {
  try {
    return JSON.parse(input.content) as ClaudeCodeSettings;
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    throw new ConstraintError('settings file is not valid json', {
      path: input.path,
      cause: error,
      hint: `open ${input.path}, fix the json at the parse error, then rerun`,
    });
  }
};

/**
 * .what = whether an fs error means the path is absent
 * .why = absence is the one expected fault of a settings read; every other errno
 *        (EACCES, EISDIR, EIO, …) must surface, never read as "no settings here"
 */
const isFsErrorOfAbsence = (error: unknown): boolean => {
  const code = (error as NodeJS.ErrnoException | null)?.code;
  return code === 'ENOENT' || code === 'ENOTDIR';
};

/**
 * .what = read a file, or null when it is absent
 * .why = allowlists absence alone; any other read fault rethrows
 */
const readFileOrNullIfAbsent = async (input: {
  path: string;
}): Promise<string | null> => {
  try {
    return await fs.readFile(input.path, 'utf-8');
  } catch (error) {
    if (isFsErrorOfAbsence(error)) return null;
    throw error;
  }
};

/**
 * .what = read a path only when it is a real file; null when it is absent, a symlink, or a dir
 * .why = the probe and the read are one step: `O_NOFOLLOW` refuses a symlink at open (ELOOP),
 *   so a peer that swaps the name between a probe and a read cannot make this follow an arrow
 *   or crash on a vanished file. any other fault rethrows
 */
const readRealFileOrNull = async (input: {
  path: string;
}): Promise<string | null> => {
  try {
    const handle = await fs.open(
      input.path,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
    );
    try {
      return await handle.readFile('utf-8');
    } finally {
      await handle.close();
    }
  } catch (error) {
    if (isFsErrorOfAbsence(error)) return null;
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ELOOP' || code === 'EISDIR') return null;
    throw error;
  }
};

/**
 * .what = writes the brain dir's settings.of.repo.json, whole, via temp + rename
 * .why = enables hook sync to persist changes, and a clone that spawns mid-write never
 *        reads a half file
 *
 * .note = the write targets `settings.of.repo.json` by name, never `settings.json`: that name
 *   is an arrow to the grove (`~/.claude/settings.json`), and a write through it would land
 *   in the human's home
 */
export const writeClaudeCodeSettings = async (input: {
  settings: ClaudeCodeSettings;
  to: string;
}): Promise<void> => {
  const settingsDir = path.join(input.to, '.claude');
  const settingsPath = path.join(settingsDir, CLAUDE_SETTINGS_FILENAMES.repo);

  // never write outside the dir the caller named: a `.claude` that links out of it is refused
  await assertSettingsDirWithin({ settingsDir, to: input.to });

  // ensure directory exists
  await fs.mkdir(settingsDir, { recursive: true });

  // write the temp beside the target, then swap it in
  const content = `${JSON.stringify(input.settings, null, 2)}\n`;
  const pathTemp = path.join(
    settingsDir,
    `.${CLAUDE_SETTINGS_FILENAMES.repo}.${process.pid}.${randomBytes(4).toString('hex')}.tmp`,
  );
  await fs.writeFile(pathTemp, content, 'utf-8');
  try {
    await fs.rename(pathTemp, settingsPath);
  } catch (error) {
    await fs.rm(pathTemp, { force: true });
    throw error;
  }
};

/**
 * .what = refuse a settings dir whose realpath lands outside the dir the caller named
 * .why = the write lands by name inside `<to>/.claude`, by temp + rename, so `.claude` itself is
 *   the one part that can leave the caller's tree. a `.claude` that links out of it is refused,
 *   so this writer never lands a file outside the tree it was aimed at
 * .note = an absent `.claude` is created inside `to` by the mkdir that follows, so it passes;
 *   a broken link has no realpath, so it is refused with its link target named
 * .note = a probe, then a write: a peer that swaps `.claude` between the two is not caught.
 *   the threat is a misconfigured box, not an adversary
 */
const assertSettingsDirWithin = async (input: {
  settingsDir: string;
  to: string;
}): Promise<void> => {
  const stat = await fs.lstat(input.settingsDir).catch((error: unknown) => {
    if (isFsErrorOfAbsence(error)) return null;
    throw error;
  });
  if (!stat) return;
  const toReal = await fs.realpath(input.to);
  const landsAt = await fs
    .realpath(input.settingsDir)
    .catch((error: unknown) => {
      if (isFsErrorOfAbsence(error)) return null;
      throw error;
    });
  // the escape is a `..` segment of the relative path, or an absolute one (another root); a
  //   prefix test would read every path under `/` as outside, since `/` + sep is `//`
  const within = landsAt ? path.relative(toReal, landsAt) : null;
  const isWithin =
    within !== null &&
    within !== '..' &&
    !within.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(within);

  // a `.claude` inside the tree that is no dir: refuse it here, with a fix, rather than let
  //   the mkdir that follows throw a bare EEXIST
  if (isWithin && landsAt && !(await fs.stat(landsAt)).isDirectory())
    throw new ConstraintError('settings dir is not a directory', {
      path: input.settingsDir,
      found: 'a file',
      hint: 'move that .claude file aside, then rerun `rhx init --hooks`',
    });
  if (isWithin) return;

  // name where it lands; a broken link names its target. only a symlink is read as one, so
  //   the diagnostic itself never throws a raw fs error in place of the refusal
  const landsAtNamed =
    landsAt ??
    (stat.isSymbolicLink()
      ? `a broken link to ${await fs.readlink(input.settingsDir)}`
      : 'an entry with no realpath');
  throw new ConstraintError(
    'settings dir lands outside the tree it was aimed at',
    {
      path: input.settingsDir,
      landsAt: landsAtNamed,
      hint: 'point that .claude dir back inside the repo, then rerun `rhx init --hooks`',
    },
  );
};
