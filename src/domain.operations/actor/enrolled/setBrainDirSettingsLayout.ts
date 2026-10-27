import { CLAUDE_SETTINGS_FILENAMES } from '@src/domain.operations/brains/claudeCodeSettings';
import { withRepoMutex } from '@src/infra/lock/withRepoMutex';

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { assertBrainDirInsideRepo } from './assertBrainDirInsideRepo';
import { setBrainDirSettingsLayoutWithinLock } from './setBrainDirSettingsLayoutWithinLock';

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
 * .note = a box with no grove (`~/.claude/settings.json` absent, or no file) drops both grove
 *   names, so no arrow to an absent file can let a write create the human's home settings
 * .note = idempotent: a dir already in the layout yields no effect
 * .note = the whole findsert holds the brain dir's `settings.of.repo.json` mutex, so a peer
 *   `rhx` process (an `enroll` beside an `init`, or two `init`s) never interleaves with it.
 *   the settings shield holds the same mutex across its span, so it calls
 *   `setBrainDirSettingsLayoutWithinLock` — the mutex is not reentrant
 * .note = the result carries `grove`, so a caller can say a box has no grove (vision case=4)
 *   without a second probe of the home dir
 */
export const setBrainDirSettingsLayout = async (input: {
  repoPath: string;
  brainDir: string;
  home: string;
}): Promise<ReturnType<typeof setBrainDirSettingsLayoutWithinLock>> => {
  // rhachet never writes outside the repo: refuse a brain dir that lands out of it, before
  //   the mkdir; the leaf guards again under the mutex
  assertBrainDirInsideRepo(input);
  mkdirSync(input.brainDir, { recursive: true });
  return withRepoMutex(
    {
      repoPath: input.repoPath,
      path: join(input.brainDir, CLAUDE_SETTINGS_FILENAMES.repo),
    },
    async () => setBrainDirSettingsLayoutWithinLock(input),
  );
};
