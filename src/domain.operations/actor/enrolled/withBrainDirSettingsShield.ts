import { ConstraintError, MalfunctionError } from 'helpful-errors';

import { setBrainDirSettingsLayoutWithinLock } from '@src/domain.operations/actor/enrolled/setBrainDirSettingsLayoutWithinLock';
import { CLAUDE_SETTINGS_FILENAMES } from '@src/domain.operations/brains/claudeCodeSettings';
import { asJsonObjectOrNull } from '@src/infra/asJsonObjectOrNull';
import { withRepoMutex } from '@src/infra/lock/withRepoMutex';
import { setFileAtomic } from '@src/infra/setFileAtomic';

import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { join } from 'node:path';
import { assertBrainDirInsideRepo } from './assertBrainDirInsideRepo';

/**
 * .what = run a settings writer against a brain dir whose `settings.json` is a REAL copy of
 *         `settings.of.repo.json` for the duration, then fold what it wrote back into
 *         `settings.of.repo.json` and relink the arrow
 * .why = a brain hooks adapter that predates the layout (rhachet-brains-anthropic <= 0.4.x)
 *        writes `.claude/settings.json` by name. in the layout that name is an arrow to the
 *        grove, i.e. `~/.claude/settings.json` — so the write would land in the human's home
 *        settings. the shield turns that name into a plain file for the writer, so an old
 *        adapter edits the repo's settings (as it always did) and never reaches home
 *
 * .note = a current adapter writes `settings.of.repo.json` and never touches the copy; the copy
 *   then equals the repo file and is simply dropped
 * .note = a crash mid-shield leaves a real `settings.json` behind; the next layout findsert
 *   replaces it with the arrow, and the next hook sync writes `settings.of.repo.json` again
 * .note = a writer that throws still gets the fold and the relink, and then its error
 *   propagates
 * .note = a writer that leaves `settings.json` as json that is not an object fails loud, once
 *   the arrow is restored: its hooks reached neither file, and a silent drop would hide it
 * .note = the whole span holds the brain dir's `settings.of.repo.json` mutex: the fold rewrites
 *   `settings.of.repo.json` from a copy taken before the writer ran, so a peer `rhx` process
 *   that wrote the file in between would lose its write. the two layout findserts inside the
 *   span run in their `WithinLock` form, since the mutex is not reentrant
 * .note = the writer must not take this brain dir's `settings.of.repo.json` mutex itself; it
 *   would wait on the shield's own hold until the wait bound fails it
 */
export const withBrainDirSettingsShield = async <T>(
  input: { repoPath: string; brainDir: string; home: string },
  logic: () => Promise<T>,
): Promise<T> => {
  // rhachet never writes outside the repo: refuse a brain dir that lands out of it
  assertBrainDirInsideRepo(input);
  mkdirSync(input.brainDir, { recursive: true });
  return withRepoMutex(
    {
      repoPath: input.repoPath,
      path: join(input.brainDir, CLAUDE_SETTINGS_FILENAMES.repo),
    },
    () => withBrainDirSettingsShieldWithinLock(input, logic),
  );
};

/**
 * .what = the shield span itself, once the brain dir's `settings.of.repo.json` mutex is held
 */
const withBrainDirSettingsShieldWithinLock = async <T>(
  input: { repoPath: string; brainDir: string; home: string },
  logic: () => Promise<T>,
): Promise<T> => {
  const layout = {
    repoPath: input.repoPath,
    brainDir: input.brainDir,
    home: input.home,
  };
  const pathRepo = join(input.brainDir, CLAUDE_SETTINGS_FILENAMES.repo);
  const pathClaude = join(input.brainDir, CLAUDE_SETTINGS_FILENAMES.claude);

  // settle the layout first, so any real settings.json a role init left is replaced
  setBrainDirSettingsLayoutWithinLock(layout);

  // swap the arrow for a real copy of the repo's settings
  const contentBefore = getOneRepoSettingsContentOrSeed({ pathRepo });
  setShieldCopy({ pathClaude, content: contentBefore });

  // run the writer and settle it, so the fold and the relink always run
  const writer = await getOneWriterSettled({ logic });

  // fold an old adapter's write back into settings.of.repo.json; drop the copy; relink
  const fold = setShieldClosed({
    layout,
    copy: { pathClaude, pathRepo, contentBefore },
    writer,
  });

  // the writer's own fault propagates, once the brain dir is back in the layout
  if (writer.isRejected)
    throw asWriterFaultError({
      reason: writer.reason,
      brainDir: input.brainDir,
    });

  // a write that is not a json object reached no file: say so, never drop it silently
  if (fold.isUnparseable)
    throw new MalfunctionError(
      'the settings writer left settings.json as json that is not an object',
      {
        brainDir: input.brainDir,
        hint: 'rerun `rhx init --hooks`; if it fails again, report this output as a bug of the brain hooks adapter',
      },
    );
  return writer.value;
};

/**
 * .what = run the settings writer and settle its outcome, never throw
 * .why = the shield must fold and relink whatever the writer did; the fault is rethrown by the
 *   caller once the layout is restored, so naught is hidden
 * .note = the call sits inside a try with an await, so a writer that throws before its first
 *   await settles too; a rejection of any value, `null` included, reads as rejected
 */
const getOneWriterSettled = async <T>(input: {
  logic: () => Promise<T>;
}): Promise<
  { isRejected: false; value: T } | { isRejected: true; reason: unknown }
> => {
  try {
    return { isRejected: false, value: await input.logic() };
  } catch (reason) {
    return { isRejected: true, reason };
  }
};

/**
 * .what = the writer's rejection as an Error: itself where it is one, else a MalfunctionError
 *   that names the value it rejected with
 */
const asWriterFaultError = (input: {
  reason: unknown;
  brainDir: string;
}): Error =>
  input.reason instanceof Error
    ? input.reason
    : new MalfunctionError(
        'the settings writer rejected with a value that is not an Error',
        {
          brainDir: input.brainDir,
          reason: input.reason,
          hint: 'rerun `rhx init --hooks`; if it fails again, report this output as a bug of the brain hooks adapter',
        },
      );

/**
 * .what = close the shield: fold the copy back, then relink the arrow
 * .note = where the writer already failed, a cleanup fault is raised with the writer's fault
 *   beside it, so neither is lost. a ConstraintError keeps its class and its hint (the caller
 *   must fix it); any other fault is ours, a MalfunctionError
 */
const setShieldClosed = (input: {
  layout: { repoPath: string; brainDir: string; home: string };
  copy: { pathClaude: string; pathRepo: string; contentBefore: string };
  writer: { isRejected: false } | { isRejected: true; reason: unknown };
}): { isUnparseable: boolean } => {
  try {
    const fold = isRealFileAt({ path: input.copy.pathClaude })
      ? setShieldCopyFolded(input.copy)
      : { isUnparseable: false };
    setBrainDirSettingsLayoutWithinLock(input.layout);
    return fold;
  } catch (error) {
    if (!input.writer.isRejected) throw error;
    const message =
      'the settings writer failed, and the shield could not restore the layout after it';
    const metadata = {
      brainDir: input.layout.brainDir,
      writerFault: input.writer.reason,
      cause: error instanceof Error ? error : new Error(String(error)),
    };
    if (error instanceof ConstraintError)
      throw new ConstraintError(message, {
        ...metadata,
        hint: error.metadata?.hint,
      });
    throw new MalfunctionError(message, {
      ...metadata,
      hint: 'rerun `rhx init --hooks`; if it fails again, report this output as a rhachet bug',
    });
  }
};

/**
 * .what = the content of `settings.of.repo.json`, or an empty object seed when it is absent
 */
const getOneRepoSettingsContentOrSeed = (input: {
  pathRepo: string;
}): string =>
  existsSync(input.pathRepo) ? readFileSync(input.pathRepo, 'utf8') : '{}\n';

/**
 * .what = put a real file with the given content where claude's `settings.json` arrow was
 * .note = no remove first: the atomic write renames its temp over the name, and a rename
 *   replaces the arrow entry itself (it never follows it), so the name is never absent
 */
const setShieldCopy = (input: { pathClaude: string; content: string }): void =>
  setFileAtomic({ path: input.pathClaude, content: input.content });

/**
 * .what = whether a real file (not an arrow, not absent) sits at a path
 */
const isRealFileAt = (input: { path: string }): boolean =>
  !!lstatSync(input.path, { throwIfNoEntry: false })?.isFile();

/**
 * .what = fold the shield's copy back: a json write lands in `settings.of.repo.json`, an
 *         untouched copy is dropped
 * .note = a write that is not a json object is not folded: the layout findsert that follows
 *   replaces it with the arrow, and the caller fails loud on `isUnparseable`
 */
const setShieldCopyFolded = (input: {
  pathClaude: string;
  pathRepo: string;
  contentBefore: string;
}): { isUnparseable: boolean } => {
  const contentAfter = readFileSync(input.pathClaude, 'utf8');
  const isWrittenByWriter = contentAfter !== input.contentBefore;
  const isFoldable =
    isWrittenByWriter && asJsonObjectOrNull({ content: contentAfter }) !== null;

  // a writer's unparseable output: never folded; the caller fails loud
  if (isWrittenByWriter && !isFoldable) return { isUnparseable: true };

  // a writer's json output: it becomes the repo's settings
  if (isFoldable)
    setFileAtomic({ path: input.pathRepo, content: contentAfter });

  // an untouched copy of an absent repo file: persist the seed it was made from
  if (!isWrittenByWriter && !existsSync(input.pathRepo))
    setFileAtomic({ path: input.pathRepo, content: input.contentBefore });

  rmSync(input.pathClaude);
  return { isUnparseable: false };
};
