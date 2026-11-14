import {
  CLAUDE_SETTINGS_FILENAMES,
  readClaudeCodeSettings,
  writeClaudeCodeSettings,
} from '@src/domain.operations/brains/claudeCodeSettings';
import { getAllClaudeMdExcludesForActor } from '@src/domain.operations/enroll/getAllClaudeMdExcludesForActor';
import { withRepoMutex } from '@src/infra/lock/withRepoMutex';

import { dirname, join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

/**
 * .what = findsert the repo actor's `claudeMdExcludes` into its `settings.of.repo.json`
 * .why = a plain `claude` at the repo root reads that file through the local arrow, so the
 *        human's home `CLAUDE.md` is excluded from the first `rhx init` on, never only after
 *        an enroll (define.invariant.brain-config-grove-vs-repo, (6))
 *
 * .note = the same list enroll writes at spawn (`getAllClaudeMdExcludesForActor`), so the two
 *   never disagree; the file is written only when the list differs
 * .note = rhachet owns the key: a prior list is replaced whole, never merged, as enroll does.
 *   a merge could never drop an entry rhachet itself no longer derives
 * .note = returns each prior entry the replace dropped, so the report names a hand-added
 *   exclude rather than lose it in silence; an entry rhachet still derives is not dropped
 * .note = holds the file's mutex across the read and the write, so a peer writer of the same
 *   file never loses a key between them
 */
export const setRepoActorClaudeMdExcludes = async (input: {
  repoPath: string;
  repoActorBrainDir: string;
}): Promise<{ excludesDropped: string[] }> => {
  const { repoPath, repoActorBrainDir } = input;
  const claudeMdExcludes = getAllClaudeMdExcludesForActor({
    repoPath,
    repoActorBrainDir,
    actorBrainDir: repoActorBrainDir,
  });
  return withRepoMutex(
    {
      repoPath,
      path: join(repoActorBrainDir, CLAUDE_SETTINGS_FILENAMES.repo),
    },
    async () => {
      // a list already equal to the derived one has naught to write, and drops naught
      const settings = await readClaudeCodeSettings({
        from: dirname(repoActorBrainDir),
      });
      if (isDeepStrictEqual(settings.claudeMdExcludes, claudeMdExcludes))
        return { excludesDropped: [] };

      // replace the list whole, and name each prior entry the derived list lacks
      await writeClaudeCodeSettings({
        settings: { ...settings, claudeMdExcludes },
        to: dirname(repoActorBrainDir),
      });
      return {
        excludesDropped: asExcludesDropped({
          before: settings.claudeMdExcludes,
          after: claudeMdExcludes,
        }),
      };
    },
  );
};

/**
 * .what = the prior string entries the derived list does not hold
 * .why = a prior value that is not a list held no entries a human could lose by name
 */
const asExcludesDropped = (input: {
  before: unknown;
  after: string[];
}): string[] => {
  if (!Array.isArray(input.before)) return [];
  return input.before.filter(
    (entry): entry is string =>
      typeof entry === 'string' && !input.after.includes(entry),
  );
};
